package com.trajectoryfit.web;

import com.trajectoryfit.domain.NutritionLogEntity;
import com.trajectoryfit.repo.NutritionLogRepository;
import com.trajectoryfit.repo.UserRepository;
import com.trajectoryfit.web.dto.NutritionDayResponse;
import com.trajectoryfit.web.dto.NutritionRequest;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Tiered protein logging. A day is logged in exactly one tier (quick / estimate / precise);
 * re-posting the same day replaces that day's entries entirely.
 */
@RestController
public class NutritionController {

    private static final Set<String> MEALS = Set.of("breakfast", "lunch", "dinner", "snacks");
    private static final Set<String> LEVELS = Set.of("low", "good", "high");

    private final NutritionLogRepository nutrition;
    private final UserRepository users;

    public NutritionController(NutritionLogRepository nutrition, UserRepository users) {
        this.nutrition = nutrition;
        this.users = users;
    }

    @PostMapping("/api/nutrition")
    @Transactional
    public NutritionDayResponse create(@Valid @RequestBody NutritionRequest req) {
        requireUser(req.userId());
        List<NutritionLogEntity> rows = buildRows(req);

        // A day is logged in one tier; replace any prior entries for that day.
        // Flush so the DELETE hits the DB before the INSERTs; otherwise Hibernate orders inserts
        // first and re-logging an overlapping meal violates the (user, day, meal) unique key.
        nutrition.deleteByUserIdAndLoggedOn(req.userId(), req.loggedOn());
        nutrition.flush();
        List<NutritionLogEntity> saved = nutrition.saveAll(rows);
        return toDayResponse(req.loggedOn(), saved);
    }

    @GetMapping("/api/users/{id}/nutrition")
    public List<NutritionDayResponse> list(@PathVariable UUID id) {
        requireUser(id);
        Map<LocalDate, List<NutritionLogEntity>> byDay = new LinkedHashMap<>();
        for (NutritionLogEntity r : nutrition.findByUserIdOrderByLoggedOnAsc(id)) {
            byDay.computeIfAbsent(r.getLoggedOn(), d -> new ArrayList<>()).add(r);
        }
        List<NutritionDayResponse> out = new ArrayList<>();
        byDay.forEach((day, rows) -> out.add(toDayResponse(day, rows)));
        return out;
    }

    private List<NutritionLogEntity> buildRows(NutritionRequest req) {
        List<NutritionLogEntity> rows = new ArrayList<>();
        switch (req.tier()) {
            case "quick" -> {
                if (req.level() == null) {
                    throw new BadRequestException("quick tier requires 'level' (low/good/high)");
                }
                rows.add(row(req.userId(), req.loggedOn(), "quick", "whole_day", req.level(), null));
            }
            case "estimate" -> {
                if (req.mealLevels() == null || req.mealLevels().isEmpty()) {
                    throw new BadRequestException("estimate tier requires 'mealLevels'");
                }
                req.mealLevels().forEach((meal, level) -> {
                    requireMeal(meal);
                    if (!LEVELS.contains(level)) {
                        throw new BadRequestException("level for '" + meal + "' must be low/good/high");
                    }
                    rows.add(row(req.userId(), req.loggedOn(), "estimate", meal, level, null));
                });
            }
            case "precise" -> {
                if (req.mealGrams() == null || req.mealGrams().isEmpty()) {
                    throw new BadRequestException("precise tier requires 'mealGrams'");
                }
                req.mealGrams().forEach((meal, grams) -> {
                    requireMeal(meal);
                    if (grams == null || grams < 0 || grams > 500) {
                        throw new BadRequestException("grams for '" + meal + "' must be between 0 and 500");
                    }
                    rows.add(row(req.userId(), req.loggedOn(), "precise", meal, null, grams));
                });
            }
            default -> throw new BadRequestException("Unknown tier: " + req.tier());
        }
        return rows;
    }

    private void requireMeal(String meal) {
        if (!MEALS.contains(meal)) {
            throw new BadRequestException("Unknown meal: " + meal + " (expected breakfast/lunch/dinner/snacks)");
        }
    }

    private NutritionLogEntity row(UUID userId, LocalDate day, String tier, String meal, String level, Double grams) {
        NutritionLogEntity e = new NutritionLogEntity();
        e.setUserId(userId);
        e.setLoggedOn(day);
        e.setTier(tier);
        e.setMeal(meal);
        e.setLevel(level);
        e.setGrams(grams);
        return e;
    }

    private NutritionDayResponse toDayResponse(LocalDate day, List<NutritionLogEntity> rows) {
        String tier = rows.isEmpty() ? null : rows.get(0).getTier();
        List<NutritionDayResponse.Meal> meals = rows.stream().map(NutritionDayResponse.Meal::from).toList();
        return new NutritionDayResponse(day, tier, meals);
    }

    private void requireUser(UUID id) {
        if (!users.existsById(id)) {
            throw new NotFoundException("User " + id + " not found");
        }
    }
}
