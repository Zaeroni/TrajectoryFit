package com.trajectoryfit.risk.archetype;

import com.trajectoryfit.risk.RiskService;
import com.trajectoryfit.risk.config.RiskConfig;
import com.trajectoryfit.risk.result.Factor;
import com.trajectoryfit.risk.result.RiskAssessment;

import java.util.ArrayList;
import java.util.List;

/**
 * Standalone proof that the ported {@link RiskService} classifies all five synthetic
 * archetypes into their expected risk bands — the milestone the handoff calls the
 * "strongest, most concrete proof this project has that the scoring logic actually works".
 *
 * Deliberately framework-free with a {@code main} method so it can be compiled and run
 * with plain {@code javac}/{@code java}, independent of Spring or the database. The same
 * checks are also exercised as JUnit tests once the full build is in place. Exits non-zero
 * if any archetype lands in the wrong band or a load-bearing invariant is violated.
 */
public final class ArchetypeValidationRunner {

    public static void main(String[] args) {
        RiskService service = new RiskService(RiskConfig.defaults());
        List<String> failures = new ArrayList<>();

        System.out.println("TrajectoryFit — RiskService archetype validation");
        System.out.println("=================================================");
        System.out.printf("%-18s %-9s %-9s %-7s %-14s %s%n",
                "archetype", "expected", "got", "score", "driver", "result");
        System.out.println("-------------------------------------------------------------------------------");

        for (ArchetypeFixtures.Case c : ArchetypeFixtures.all()) {
            RiskAssessment r = service.scoreWeek(c.window(), c.leanMass());
            List<String> caseFailures = check(c, r);

            String driver = r.biggestDriver() == null ? "—" : r.biggestDriver().name().toLowerCase();
            String verdict = caseFailures.isEmpty() ? "PASS" : "FAIL";
            System.out.printf("%-18s %-9s %-9s %-7s %-14s %s%n",
                    c.archetype().key(),
                    c.archetype().expectedBand(),
                    r.band() == null ? "—" : r.band(),
                    r.score() == null ? "—" : r.score(),
                    driver,
                    verdict);
            if (!caseFailures.isEmpty()) {
                caseFailures.forEach(f -> System.out.println("      ! " + f));
                failures.addAll(caseFailures);
            }
        }

        System.out.println("-------------------------------------------------------------------------------");
        if (failures.isEmpty()) {
            System.out.println("All 5 archetypes classified correctly. Scoring port is faithful.");
            System.exit(0);
        } else {
            System.out.println(failures.size() + " check(s) failed — the port has a bug, do not proceed.");
            System.exit(1);
        }
    }

    /** Band check for every archetype, plus the load-bearing invariants for the two that matter most. */
    private static List<String> check(ArchetypeFixtures.Case c, RiskAssessment r) {
        List<String> failures = new ArrayList<>();
        String key = c.archetype().key();

        if (r.band() != c.archetype().expectedBand()) {
            failures.add(key + ": expected band " + c.archetype().expectedBand() + " but got " + r.band());
        }

        switch (c.archetype()) {
            case CARDIO_ONLY -> {
                // Active but not protecting muscle: training must be the named driver.
                if (r.biggestDriver() != Factor.TRAINING) {
                    failures.add(key + ": expected training to be the biggest driver but got "
                            + (r.biggestDriver() == null ? "none" : r.biggestDriver()));
                }
            }
            case BRAND_NEW -> {
                // Missing data must be flagged, never penalized.
                if (!r.partialData()) {
                    failures.add(key + ": expected the week to be flagged as partial data");
                }
                if (!"No data".equals(r.training().status())) {
                    failures.add(key + ": expected training status \"No data\" but got \"" + r.training().status() + "\"");
                }
                if (r.training().points() != 0) {
                    failures.add(key + ": training must not be penalized for being unlogged (points="
                            + r.training().points() + ")");
                }
            }
            default -> {
            }
        }
        return failures;
    }
}
