package com.trajectoryfit.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.MountableFile;

import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end tests of the HTTP API against a real Postgres (Testcontainers) with the project's
 * own db/schema.sql applied. Each test creates its own user, so tests are independent.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16")
            .withCopyFileToContainer(MountableFile.forHostPath("db/schema.sql"),
                    "/docker-entrypoint-initdb.d/01-schema.sql");

    private static final LocalDate ANCHOR = LocalDate.of(2026, 3, 15);

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    // ------------------------------------------------------------------ helpers

    private ResultActions postJson(String url, String body) throws Exception {
        return mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private String createUser() throws Exception {
        String res = postJson("/api/users", """
                {"name":"Test User","heightIn":70,"goalWeightLb":160,"medication":"semaglutide",
                 "loggingPreference":"quick","bodyCompAccess":[]}""")
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(res).get("id").asText();
    }

    private void weighIn(String user, LocalDate day, double lb) throws Exception {
        postJson("/api/weigh-ins", """
                {"userId":"%s","loggedOn":"%s","weightLb":%s}""".formatted(user, day, lb))
                .andExpect(status().isOk());
    }

    private void quickProtein(String user, LocalDate day, String level) throws Exception {
        postJson("/api/nutrition", """
                {"userId":"%s","loggedOn":"%s","tier":"quick","level":"%s"}""".formatted(user, day, level))
                .andExpect(status().isOk());
    }

    private void workout(String user, LocalDate day, String type) throws Exception {
        postJson("/api/workouts", """
                {"userId":"%s","loggedOn":"%s","type":"%s"}""".formatted(user, day, type))
                .andExpect(status().isOk());
    }

    /** Seven days ending {@code end}: weight falls from {@code startLb} to {@code endLb}. */
    private void crashWeek(String user, LocalDate end, double startLb, double endLb) throws Exception {
        for (int i = 0; i < 7; i++) {
            LocalDate day = end.minusDays(6 - i);
            weighIn(user, day, startLb + (endLb - startLb) * i / 6.0);
            quickProtein(user, day, "low");
            workout(user, day, "cardio");
        }
    }

    private JsonNode risk(String user, LocalDate anchor) throws Exception {
        String res = mvc.perform(get("/api/users/" + user + "/risk").param("date", anchor.toString()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(res);
    }

    private double factorPoints(JsonNode risk, String factor) {
        for (JsonNode f : risk.get("factors")) {
            if (f.get("factor").asText().equals(factor)) {
                return f.get("points").asDouble();
            }
        }
        throw new AssertionError("no factor " + factor);
    }

    // ------------------------------------------------------------------ /risk

    @Test
    void crashingWeekIsHighRiskDrivenByWeight() throws Exception {
        String user = createUser();
        crashWeek(user, ANCHOR, 200, 190); // 5% in a week, no protein, no resistance

        JsonNode r = risk(user, ANCHOR);
        assertEquals("High", r.get("band").asText());
        assertEquals(100, r.get("score").asInt());
        assertEquals("weight", r.get("biggestDriver").asText());
    }

    @Test
    void healthyWeekIsLowRiskWithNoDriver() throws Exception {
        String user = createUser();
        for (int i = 0; i < 7; i++) {
            LocalDate day = ANCHOR.minusDays(6 - i);
            weighIn(user, day, 200 - i * 0.15); // ~0.45% over the week
            quickProtein(user, day, "good");
            workout(user, day, i % 3 == 0 ? "resistance" : "rest");
        }

        JsonNode r = risk(user, ANCHOR);
        assertEquals("Low", r.get("band").asText());
        assertEquals(0, r.get("score").asInt());
        assertEquals(true, r.get("biggestDriver").isNull());
        assertEquals(false, r.get("partialData").asBoolean());
    }

    @Test
    void emptyWindowReportsNoData() throws Exception {
        String user = createUser();
        mvc.perform(get("/api/users/" + user + "/risk").param("date", ANCHOR.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasData").value(false))
                .andExpect(jsonPath("$.score").doesNotExist());
    }

    @Test
    void cardioDoesNotCountAsResistanceAndUnloggedTrainingIsNotPenalized() throws Exception {
        String user = createUser();
        for (int i = 0; i < 7; i++) {
            workout(user, ANCHOR.minusDays(i), "cardio");
        }
        assertEquals("training", risk(user, ANCHOR).get("biggestDriver").asText());

        String other = createUser();
        weighIn(other, ANCHOR, 200);
        JsonNode r = risk(other, ANCHOR);
        assertEquals(0.0, factorPoints(r, "training"));
        for (JsonNode f : r.get("factors")) {
            if (f.get("factor").asText().equals("training")) {
                assertEquals("No data", f.get("status").asText());
            }
        }
    }

    // ------------------------------------------------------------------ sustained risk

    @Test
    void sustainedRiskRequiresThreeConsecutiveElevatedWeeks() throws Exception {
        String user = createUser();
        crashWeek(user, ANCHOR, 200, 190);
        crashWeek(user, ANCHOR.minusWeeks(1), 210, 200);
        assertEquals(false, risk(user, ANCHOR).get("sustainedRisk").asBoolean(),
                "two elevated weeks plus an empty third must not be sustained");

        crashWeek(user, ANCHOR.minusWeeks(2), 220, 210);
        JsonNode r = risk(user, ANCHOR);
        assertEquals(true, r.get("sustainedRisk").asBoolean());
        assertEquals(false, r.get("sustainedRiskNote").isNull());
    }

    @Test
    void oneBadWeekAfterTwoGoodOnesIsNotSustained() throws Exception {
        String user = createUser();
        crashWeek(user, ANCHOR, 200, 190);
        for (int w = 1; w <= 2; w++) {
            for (int i = 0; i < 7; i++) {
                LocalDate day = ANCHOR.minusWeeks(w).minusDays(i);
                weighIn(user, day, 200);
                quickProtein(user, day, "good");
                workout(user, day, "resistance");
            }
        }
        assertEquals(false, risk(user, ANCHOR).get("sustainedRisk").asBoolean());
    }

    // ------------------------------------------------------------------ units

    @Test
    void imperialValuesRoundTripThroughMetricStorage() throws Exception {
        String user = createUser();
        mvc.perform(get("/api/users/" + user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.heightIn").value(70.0))
                .andExpect(jsonPath("$.goalWeightLb").value(160.0));

        weighIn(user, ANCHOR, 185.5);
        mvc.perform(get("/api/users/" + user + "/weigh-ins"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].weightLb").value(185.5));
    }

    @Test
    void reloggingWeightForTheSameDayUpdatesInPlace() throws Exception {
        String user = createUser();
        weighIn(user, ANCHOR, 200);
        weighIn(user, ANCHOR, 198.2);
        mvc.perform(get("/api/users/" + user + "/weigh-ins"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].weightLb").value(198.2));
    }

    @Test
    void patchUpdatesOnlyTheProvidedFields() throws Exception {
        String user = createUser();
        mvc.perform(patch("/api/users/" + user).contentType(MediaType.APPLICATION_JSON).content("""
                {"goalWeightLb":150,"loggingPreference":"precise","bodyCompAccess":["gym_scan","smart_scale"]}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.goalWeightLb").value(150.0))
                .andExpect(jsonPath("$.loggingPreference").value("precise"))
                .andExpect(jsonPath("$.bodyCompAccess.length()").value(2))
                .andExpect(jsonPath("$.name").value("Test User"))
                .andExpect(jsonPath("$.heightIn").value(70.0))
                .andExpect(jsonPath("$.medication").value("semaglutide"));
    }

    @Test
    void patchRejectsBadValuesAndUnknownUsers() throws Exception {
        String user = createUser();
        for (String bad : new String[] {
                "{\"medication\":\"aspirin\"}", "{\"goalWeightLb\":5}",
                "{\"bodyCompAccess\":[\"mri\"]}", "{\"name\":\"  \"}"}) {
            mvc.perform(patch("/api/users/" + user).contentType(MediaType.APPLICATION_JSON).content(bad))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(patch("/api/users/" + UUID.randomUUID()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNotFound());
    }

    // ------------------------------------------------------------------ tiered nutrition

    @Test
    void reloggingADayReplacesItsEntriesAcrossTiers() throws Exception {
        String user = createUser();
        quickProtein(user, ANCHOR, "low");

        postJson("/api/nutrition", """
                {"userId":"%s","loggedOn":"%s","tier":"precise",
                 "mealGrams":{"breakfast":30,"lunch":40,"dinner":45}}""".formatted(user, ANCHOR))
                .andExpect(status().isOk());
        mvc.perform(get("/api/users/" + user + "/nutrition"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].tier").value("precise"))
                .andExpect(jsonPath("$[0].meals.length()").value(3));

        postJson("/api/nutrition", """
                {"userId":"%s","loggedOn":"%s","tier":"estimate",
                 "mealLevels":{"breakfast":"good","dinner":"low"}}""".formatted(user, ANCHOR))
                .andExpect(status().isOk());
        mvc.perform(get("/api/users/" + user + "/nutrition"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].tier").value("estimate"))
                .andExpect(jsonPath("$[0].meals.length()").value(2));

        quickProtein(user, ANCHOR, "high");
        mvc.perform(get("/api/users/" + user + "/nutrition"))
                .andExpect(jsonPath("$[0].tier").value("quick"))
                .andExpect(jsonPath("$[0].meals.length()").value(1))
                .andExpect(jsonPath("$[0].meals[0].level").value("high"));
    }

    @Test
    void preciseGramsAreScoredAgainstBodyweight() throws Exception {
        // 200 lb ~ 90.7 kg -> 1.2 g/kg target ~ 109 g/day. 150 g/day clears it; 40 g/day does not.
        String well = createUser();
        String poorly = createUser();
        for (int i = 0; i < 7; i++) {
            LocalDate day = ANCHOR.minusDays(i);
            weighIn(well, day, 200);
            weighIn(poorly, day, 200);
            postJson("/api/nutrition", """
                    {"userId":"%s","loggedOn":"%s","tier":"precise","mealGrams":{"breakfast":50,"lunch":50,"dinner":50}}"""
                    .formatted(well, day)).andExpect(status().isOk());
            postJson("/api/nutrition", """
                    {"userId":"%s","loggedOn":"%s","tier":"precise","mealGrams":{"breakfast":10,"lunch":15,"dinner":15}}"""
                    .formatted(poorly, day)).andExpect(status().isOk());
        }
        assertEquals(0.0, factorPoints(risk(well, ANCHOR), "protein"));
        assertEquals(40.0, factorPoints(risk(poorly, ANCHOR), "protein"));
    }

    // ------------------------------------------------------------------ 400 / 404

    @Test
    void unknownUserIs404Everywhere() throws Exception {
        String ghost = UUID.randomUUID().toString();
        mvc.perform(get("/api/users/" + ghost)).andExpect(status().isNotFound());
        mvc.perform(get("/api/users/" + ghost + "/risk")).andExpect(status().isNotFound());
        mvc.perform(get("/api/users/" + ghost + "/weigh-ins")).andExpect(status().isNotFound());
        postJson("/api/weigh-ins", """
                {"userId":"%s","loggedOn":"%s","weightLb":180}""".formatted(ghost, ANCHOR))
                .andExpect(status().isNotFound());
        postJson("/api/workouts", """
                {"userId":"%s","loggedOn":"%s","type":"rest"}""".formatted(ghost, ANCHOR))
                .andExpect(status().isNotFound());
    }

    @Test
    void invalidInputIs400() throws Exception {
        String user = createUser();

        // weight out of the 60-700 lb sanity range
        postJson("/api/weigh-ins", """
                {"userId":"%s","loggedOn":"%s","weightLb":10}""".formatted(user, ANCHOR))
                .andExpect(status().isBadRequest());
        // unknown tier
        postJson("/api/nutrition", """
                {"userId":"%s","loggedOn":"%s","tier":"bogus"}""".formatted(user, ANCHOR))
                .andExpect(status().isBadRequest());
        // quick tier without a level
        postJson("/api/nutrition", """
                {"userId":"%s","loggedOn":"%s","tier":"quick"}""".formatted(user, ANCHOR))
                .andExpect(status().isBadRequest());
        // grams out of range
        postJson("/api/nutrition", """
                {"userId":"%s","loggedOn":"%s","tier":"precise","mealGrams":{"lunch":600}}""".formatted(user, ANCHOR))
                .andExpect(status().isBadRequest());
        // unknown meal
        postJson("/api/nutrition", """
                {"userId":"%s","loggedOn":"%s","tier":"estimate","mealLevels":{"brunch":"good"}}""".formatted(user, ANCHOR))
                .andExpect(status().isBadRequest());
        // bad workout type
        postJson("/api/workouts", """
                {"userId":"%s","loggedOn":"%s","type":"yoga"}""".formatted(user, ANCHOR))
                .andExpect(status().isBadRequest());
        // blank user name
        postJson("/api/users", """
                {"name":""}""").andExpect(status().isBadRequest());
        // malformed date anchor
        mvc.perform(get("/api/users/" + user + "/risk").param("date", "not-a-date"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void failedNutritionPostLeavesThePriorEntryIntact() throws Exception {
        String user = createUser();
        quickProtein(user, ANCHOR, "good");
        postJson("/api/nutrition", """
                {"userId":"%s","loggedOn":"%s","tier":"precise","mealGrams":{"lunch":600}}""".formatted(user, ANCHOR))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/users/" + user + "/nutrition"))
                .andExpect(jsonPath("$[0].tier").value("quick"))
                .andExpect(jsonPath("$[0].meals[0].level").value("good"));
    }
}
