package com.trajectoryfit.risk;

import com.trajectoryfit.risk.config.RiskConfig;
import com.trajectoryfit.risk.model.DailyLog;
import com.trajectoryfit.risk.model.LeanMassReading;
import com.trajectoryfit.risk.model.ProteinLevel;
import com.trajectoryfit.risk.model.TrainingType;
import com.trajectoryfit.risk.result.Factor;
import com.trajectoryfit.risk.result.FactorScore;
import com.trajectoryfit.risk.result.RiskAssessment;
import com.trajectoryfit.risk.result.RiskBand;

import java.util.ArrayList;
import java.util.List;

/**
 * The rules engine at the heart of TrajectoryFit. It scores a 7-day window of a user's
 * logs into a lean-mass-loss risk assessment: a 0–100 score, a band, and per-factor
 * sub-scores that explain <em>why</em>.
 *
 * This is a transparent, literature-sourced rule system, not a machine-learned model
 * — a deliberate choice (see design rationale: "Why rules before ML"). It is also fully
 * framework-free: it takes plain {@link DailyLog}s and {@link LeanMassReading}s and a
 * {@link RiskConfig}, so it can be unit-tested and validated against the synthetic
 * archetypes without any Spring or database machinery.
 *
 * Signals, in order of importance: weight-loss rate (strongest), protein intake,
 * resistance-training frequency (the biggest protective lever), and — only when present
 * — a body-composition trend that confirms or softens the score.
 */
public final class RiskService {

    private static final double KG_PER_LB = 1.0 / 2.2046;

    private final RiskConfig config;

    public RiskService(RiskConfig config) {
        this.config = config;
    }

    public RiskConfig config() {
        return config;
    }

    /**
     * Score a single 7-day window.
     *
     * @param window           the trailing calendar days for the week, chronological
     *                         (oldest first); may be padded with empty days
     * @param leanMassHistory  <em>all</em> of the user's lean-mass readings, chronological
     *                         — body comp compares the two most recent, wherever in
     *                         history they fall, since it is logged infrequently
     * @return the assessment; when nothing is logged in the window, {@code hasData} is false
     */
    public RiskAssessment scoreWeek(List<DailyLog> window, List<LeanMassReading> leanMassHistory) {
        List<Double> weightVals = new ArrayList<>();
        for (DailyLog d : window) {
            if (d.weightLb() != null) {
                weightVals.add(d.weightLb());
            }
        }

        double avgWeightLb = weightVals.isEmpty()
                ? config.getDefaultBodyweightLb()
                : weightVals.stream().mapToDouble(Double::doubleValue).average().orElse(config.getDefaultBodyweightLb());

        // Normalize each day's protein; days with no protein value are excluded (not "low").
        List<ProteinLevel> proteinLevels = new ArrayList<>();
        for (DailyLog d : window) {
            ProteinLevel lvl = ProteinNormalizer.normalize(d.protein(), avgWeightLb, config);
            if (lvl != null) {
                proteinLevels.add(lvl);
            }
        }

        long loggedTrainingDays = window.stream().filter(d -> d.trainingType() != null).count();
        long sessions = window.stream().filter(d -> d.trainingType() == TrainingType.RESISTANCE).count();

        int totalLogged = weightVals.size() + proteinLevels.size() + (int) loggedTrainingDays;
        if (totalLogged == 0) {
            return noData();
        }

        // --- Weight loss rate (strongest signal) ---
        Double rate = null;
        if (weightVals.size() >= 2) {
            double first = weightVals.get(0);
            double last = weightVals.get(weightVals.size() - 1);
            rate = ((first - last) / first) * 100.0;
        }
        FactorScore weight = scoreWeight(rate);

        // --- Protein intake ---
        Double adherence = null;
        if (!proteinLevels.isEmpty()) {
            long adherent = proteinLevels.stream().filter(l -> l != ProteinLevel.LOW).count();
            adherence = (double) adherent / proteinLevels.size();
        }
        FactorScore protein = scoreProtein(adherence);

        // --- Resistance training frequency (biggest protective lever) ---
        FactorScore training = scoreTraining(loggedTrainingDays, sessions);

        // --- Body composition (confirming signal, never a gate) ---
        FactorScore bodyComp = scoreBodyComp(leanMassHistory);

        double raw = weight.points() + protein.points() + training.points() + bodyComp.points();
        int score = clampScore(raw);
        RiskBand band = bandFor(score);

        Factor biggestDriver = biggestDriver(weight, protein, training, bodyComp);
        boolean partialData = totalLogged < config.getPartialDataMinPoints();
        String summary = summaryFor(biggestDriver, partialData);

        return new RiskAssessment(true, score, band, weight, protein, training, bodyComp,
                biggestDriver, partialData, totalLogged, summary);
    }

    /**
     * Whether risk has stayed elevated across consecutive weeks. Pass the most recent
     * weekly assessments (current week, the week ending 7 days ago, the week ending 14
     * days ago, ...). True only when every one has real logged data and every one scored
     * at or above the sustained-risk threshold.
     */
    public boolean isSustainedRisk(List<RiskAssessment> recentWeeks) {
        if (recentWeeks.size() < config.getSustainedRiskWeeks()) {
            return false;
        }
        for (RiskAssessment week : recentWeeks) {
            if (!week.hasData() || week.score() == null || week.score() < config.getSustainedRiskScore()) {
                return false;
            }
        }
        return true;
    }

    // ------------------------------------------------------------------
    // Per-factor scoring
    // ------------------------------------------------------------------

    private FactorScore scoreWeight(Double rate) {
        if (rate == null) {
            return FactorScore.of(Factor.WEIGHT, 0, "Not enough data");
        }
        double threshold = config.getWeightRateThresholdPct();
        double points = rate > threshold
                ? Math.min(config.getWeightRiskCap(), (rate - threshold) * config.getWeightRiskSlope())
                : 0;
        String status = rate <= threshold ? "On track"
                : rate <= config.getWeightSlightlyFastPct() ? "Slightly fast"
                : "Losing too fast";
        return FactorScore.of(Factor.WEIGHT, points, status, round1(rate));
    }

    private FactorScore scoreProtein(Double adherence) {
        if (adherence == null) {
            return FactorScore.of(Factor.PROTEIN, 0, "No data");
        }
        double points = (1 - adherence) * config.getProteinRiskCap();
        String status = adherence >= config.getProteinOnTrackAdherence() ? "On track"
                : adherence >= config.getProteinInconsistentAdherence() ? "Inconsistent"
                : "Below target";
        return FactorScore.of(Factor.PROTEIN, points, status, round1(adherence * 100));
    }

    private FactorScore scoreTraining(long loggedTrainingDays, long sessions) {
        if (loggedTrainingDays == 0) {
            return FactorScore.of(Factor.TRAINING, 0, "No data");
        }
        double points = sessions >= config.getTrainingSessionsGood() ? 0
                : sessions == 1 ? config.getTrainingRiskOneSession()
                : config.getTrainingRiskZeroSessions();
        String status = sessions + "x this week";
        return FactorScore.of(Factor.TRAINING, points, status, (double) sessions);
    }

    private FactorScore scoreBodyComp(List<LeanMassReading> leanMassHistory) {
        if (leanMassHistory == null || leanMassHistory.size() < 2) {
            String status = (leanMassHistory == null || leanMassHistory.isEmpty()) ? "Not logged" : "Baseline";
            return FactorScore.of(Factor.BODY_COMP, 0, status);
        }
        double latest = leanMassHistory.get(leanMassHistory.size() - 1).leanMassLb();
        double previous = leanMassHistory.get(leanMassHistory.size() - 2).leanMassLb();
        double change = latest - previous;

        double points;
        String status;
        if (change <= config.getBodyCompDeclineLb()) {
            points = config.getBodyCompDeclineRisk();
            status = "Losing lean mass";
        } else if (change >= 0) {
            points = config.getBodyCompHoldReward();
            status = "Lean mass holding";
        } else {
            points = 0;
            status = "Slight lean mass dip";
        }
        return FactorScore.of(Factor.BODY_COMP, points, status, round1(change));
    }

    // ------------------------------------------------------------------
    // Roll-up
    // ------------------------------------------------------------------

    private int clampScore(double raw) {
        return (int) Math.max(0, Math.min(100, Math.round(raw)));
    }

    private RiskBand bandFor(int score) {
        if (score < config.getBandLowMaxExclusive()) {
            return RiskBand.LOW;
        }
        return score < config.getBandModerateMaxExclusive() ? RiskBand.MODERATE : RiskBand.HIGH;
    }

    /**
     * The single factor contributing the most, or {@code null} if none is worth naming.
     * A factor is only named when it contributes more than the configured minimum, so a
     * nearly-perfect week (e.g. one tiny protein dip) isn't reported as having a "driver".
     * Ties resolve toward the more important signal (weight &gt; protein &gt; training &gt; body comp).
     */
    private Factor biggestDriver(FactorScore... factors) {
        FactorScore best = null;
        for (FactorScore f : factors) {
            if (best == null || f.points() > best.points()) {
                best = f; // strict '>' keeps the earlier (more important) factor on ties
            }
        }
        if (best == null || best.points() <= config.getBiggestDriverMinPoints()) {
            return null;
        }
        return best.factor();
    }

    private String summaryFor(Factor biggestDriver, boolean partialData) {
        String base = biggestDriver == null
                ? "You're on track across the board"
                : biggestDriver.label() + " is the biggest driver right now";
        return partialData ? base + " (based on partial data so far)" : base;
    }

    private RiskAssessment noData() {
        return new RiskAssessment(
                false, null, null,
                FactorScore.of(Factor.WEIGHT, 0, "No data"),
                FactorScore.of(Factor.PROTEIN, 0, "No data"),
                FactorScore.of(Factor.TRAINING, 0, "No data"),
                FactorScore.of(Factor.BODY_COMP, 0, "Not logged"),
                null, false, 0, "Nothing logged this week yet");
    }

    private static Double round1(double n) {
        return Math.round(n * 10.0) / 10.0;
    }
}
