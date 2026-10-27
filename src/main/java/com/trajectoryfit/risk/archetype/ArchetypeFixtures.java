package com.trajectoryfit.risk.archetype;

import com.trajectoryfit.risk.model.DailyLog;
import com.trajectoryfit.risk.model.LeanMassReading;
import com.trajectoryfit.risk.model.ProteinLevel;
import com.trajectoryfit.risk.model.ProteinLog;
import com.trajectoryfit.risk.model.TrainingType;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Builds the exact 7-day inputs for each {@link Archetype}, reproducing the weight,
 * protein, and training patterns documented in the handoff. These are the same fixtures
 * the JavaScript reference was validated against; running the Java engine over them and
 * confirming matching bands is the project's core proof that the port is faithful.
 *
 * The anchor date is fixed so results are deterministic — only the values and their
 * order matter to scoring, not the calendar dates themselves.
 */
public final class ArchetypeFixtures {

    /** Fixed anchor ("today") for the trailing 7-day window; scoring is date-agnostic. */
    public static final LocalDate ANCHOR = LocalDate.of(2026, 9, 8);

    private ArchetypeFixtures() {
    }

    /** One archetype's complete scoring input. */
    public record Case(Archetype archetype, List<DailyLog> window, List<LeanMassReading> leanMass) {
    }

    public static List<Case> all() {
        List<Case> cases = new ArrayList<>();
        for (Archetype a : Archetype.values()) {
            cases.add(build(a));
        }
        return cases;
    }

    public static Case build(Archetype archetype) {
        return switch (archetype) {
            case CRASH_DIETER -> crashDieter();
            case DOING_IT_RIGHT -> doingItRight();
            case CARDIO_ONLY -> cardioOnly();
            case SLOW_AND_STEADY -> slowAndSteady();
            case BRAND_NEW -> brandNew();
        };
    }

    // --- 200.0 -> 191.6 lb (4.2%/wk), mostly low protein, 0 sessions (all rest days). -> HIGH ---
    private static Case crashDieter() {
        double[] weights = ramp(200.0, 191.6);
        ProteinLevel[] protein = {ProteinLevel.LOW, ProteinLevel.LOW, ProteinLevel.LOW,
                ProteinLevel.LOW, ProteinLevel.LOW, ProteinLevel.GOOD, ProteinLevel.LOW};
        List<DailyLog> window = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            window.add(day(i)
                    .weightLb(weights[i])
                    .protein(ProteinLog.quick(protein[i]))
                    .training(TrainingType.REST)
                    .build());
        }
        // Two declining lean-mass readings confirm the muscle loss (+risk).
        List<LeanMassReading> leanMass = List.of(
                new LeanMassReading(ANCHOR.minusDays(30), 160.6),
                new LeanMassReading(ANCHOR, 158.0));
        return new Case(Archetype.CRASH_DIETER, window, leanMass);
    }

    // --- 180.0 -> 178.5 lb (0.83%/wk), mostly good protein, 3 resistance sessions. -> LOW ---
    private static Case doingItRight() {
        double[] weights = ramp(180.0, 178.5);
        // 6 good, 1 low -> adherence 6/7.
        ProteinLevel[] protein = {ProteinLevel.GOOD, ProteinLevel.GOOD, ProteinLevel.LOW,
                ProteinLevel.GOOD, ProteinLevel.GOOD, ProteinLevel.GOOD, ProteinLevel.GOOD};
        TrainingType[] training = {TrainingType.RESISTANCE, TrainingType.REST, TrainingType.RESISTANCE,
                TrainingType.REST, TrainingType.RESISTANCE, TrainingType.REST, TrainingType.REST};
        List<DailyLog> window = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            window.add(day(i)
                    .weightLb(weights[i])
                    .protein(ProteinLog.quick(protein[i]))
                    .training(training[i])
                    .build());
        }
        return new Case(Archetype.DOING_IT_RIGHT, window, List.of());
    }

    // --- 190.0 -> 187.4 lb (1.37%/wk), mostly good protein, 0 resistance, frequent cardio. -> MODERATE ---
    private static Case cardioOnly() {
        double[] weights = ramp(190.0, 187.4);
        // 5 good, 2 low -> adherence 5/7.
        ProteinLevel[] protein = {ProteinLevel.GOOD, ProteinLevel.GOOD, ProteinLevel.LOW,
                ProteinLevel.GOOD, ProteinLevel.GOOD, ProteinLevel.LOW, ProteinLevel.GOOD};
        // Frequent cardio, zero resistance; every day logged so training counts as "logged".
        TrainingType[] training = {TrainingType.CARDIO, TrainingType.CARDIO, TrainingType.REST,
                TrainingType.CARDIO, TrainingType.CARDIO, TrainingType.CARDIO, TrainingType.REST};
        List<DailyLog> window = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            window.add(day(i)
                    .weightLb(weights[i])
                    .protein(ProteinLog.quick(protein[i]))
                    .training(training[i])
                    .build());
        }
        return new Case(Archetype.CARDIO_ONLY, window, List.of());
    }

    // --- 165.0 -> 164.0 lb (0.61%/wk), all good protein, 2 resistance sessions, lean mass holding. -> LOW ---
    private static Case slowAndSteady() {
        double[] weights = ramp(165.0, 164.0);
        TrainingType[] training = {TrainingType.RESISTANCE, TrainingType.REST, TrainingType.REST,
                TrainingType.RESISTANCE, TrainingType.REST, TrainingType.REST, TrainingType.REST};
        List<DailyLog> window = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            window.add(day(i)
                    .weightLb(weights[i])
                    .protein(ProteinLog.quick(ProteinLevel.GOOD))
                    .training(training[i])
                    .build());
        }
        // Lean mass holding steady -> small reward, never a penalty.
        List<LeanMassReading> leanMass = List.of(
                new LeanMassReading(ANCHOR.minusDays(28), 150.0),
                new LeanMassReading(ANCHOR, 150.0));
        return new Case(Archetype.SLOW_AND_STEADY, window, leanMass);
    }

    // --- Only 2 of 7 days have weight, 1 day protein (good), 0 training days. -> LOW, partial, training not penalized ---
    private static Case brandNew() {
        List<DailyLog> window = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            window.add(day(i).build()); // start every day empty
        }
        // Two weights, a tiny way apart -> no rapid-loss signal.
        window.set(0, day(0).weightLb(200.0).protein(ProteinLog.quick(ProteinLevel.GOOD)).build());
        window.set(3, day(3).weightLb(199.7).build());
        return new Case(Archetype.BRAND_NEW, window, List.of());
    }

    // ------------------------------------------------------------------

    /** Day builder for slot {@code i} (0 = oldest) within the trailing 7-day window. */
    private static DailyLog.Builder day(int i) {
        return DailyLog.builder(ANCHOR.minusDays(6 - i));
    }

    /** Seven linearly spaced weights from {@code first} (oldest) to {@code last} (newest). */
    private static double[] ramp(double first, double last) {
        double[] out = new double[7];
        double step = (last - first) / 6.0;
        for (int i = 0; i < 7; i++) {
            out[i] = Math.round((first + step * i) * 100.0) / 100.0;
        }
        out[0] = first;
        out[6] = last;
        return out;
    }
}
