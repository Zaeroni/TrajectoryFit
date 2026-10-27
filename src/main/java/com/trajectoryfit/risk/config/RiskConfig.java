package com.trajectoryfit.risk.config;

/**
 * Every threshold and weight the scoring engine uses, as configurable values rather
 * than hardcoded constants. The defaults reproduce the validated JavaScript reference
 * and are sourced (loosely) from GLP-1 and sports-nutrition literature; they are
 * expected to be re-tuned as real numbers firm up, which is exactly why they live here.
 *
 * Plain POJO with getters/setters so the Spring layer can bind
 * {@code trajectoryfit.risk.*} properties onto an instance via
 * {@code @ConfigurationProperties} without this framework-free core depending on Spring.
 */
public final class RiskConfig {

    // --- Weight loss rate ---
    /** Weekly loss faster than this % of bodyweight starts adding risk. */
    private double weightRateThresholdPct = 1.0;
    /** Points added per percentage point over the threshold. */
    private double weightRiskSlope = 40.0;
    /** Maximum weight sub-score. */
    private double weightRiskCap = 40.0;
    /** Loss rate up to this % is "Slightly fast"; above is "Losing too fast". */
    private double weightSlightlyFastPct = 1.5;

    // --- Protein ---
    /** Low end of the daily protein target, grams per kg of bodyweight. */
    private double proteinTargetLowGPerKg = 1.2;
    /** High end of the daily protein target, grams per kg of bodyweight. */
    private double proteinTargetHighGPerKg = 1.6;
    /** Maximum protein sub-score (at zero adherence). */
    private double proteinRiskCap = 40.0;
    /** Adherence at or above this is "On track". */
    private double proteinOnTrackAdherence = 0.7;
    /** Adherence at or above this (but below on-track) is "Inconsistent"; below is "Below target". */
    private double proteinInconsistentAdherence = 0.4;

    // --- Training ---
    /** Resistance sessions at or above this in the week means zero training risk. */
    private int trainingSessionsGood = 2;
    /** Risk when exactly one resistance session was logged. */
    private double trainingRiskOneSession = 15.0;
    /** Risk when training was logged but zero resistance sessions. */
    private double trainingRiskZeroSessions = 30.0;

    // --- Body composition (confirming signal) ---
    /** A lean-mass drop of this many pounds (or more) between the two latest readings adds risk. */
    private double bodyCompDeclineLb = -1.0;
    /** Points added when lean mass is declining. */
    private double bodyCompDeclineRisk = 15.0;
    /** Points removed (reward) when lean mass is holding or improving. */
    private double bodyCompHoldReward = -10.0;

    // --- Banding ---
    /** Score below this is "Low". */
    private int bandLowMaxExclusive = 34;
    /** Score below this (but not Low) is "Moderate"; at or above is "High". */
    private int bandModerateMaxExclusive = 67;

    // --- Presentation / confidence ---
    /** A factor is only named as "the biggest driver" if it contributes more than this. */
    private double biggestDriverMinPoints = 10.0;
    /** Fewer than this many total logged points in the week flags the summary as partial. */
    private int partialDataMinPoints = 9;

    // --- Sustained risk ---
    /** Weeks at or above {@link #sustainedRiskScore} in a row before surfacing the note. */
    private int sustainedRiskWeeks = 3;
    /** A week must score at least this to count toward sustained risk. */
    private int sustainedRiskScore = 50;

    /** Fallback bodyweight (lb) for the protein gram target when no weight is logged in the window. */
    private double defaultBodyweightLb = 150.0;

    public static RiskConfig defaults() {
        return new RiskConfig();
    }

    public double getWeightRateThresholdPct() { return weightRateThresholdPct; }
    public void setWeightRateThresholdPct(double v) { this.weightRateThresholdPct = v; }

    public double getWeightRiskSlope() { return weightRiskSlope; }
    public void setWeightRiskSlope(double v) { this.weightRiskSlope = v; }

    public double getWeightRiskCap() { return weightRiskCap; }
    public void setWeightRiskCap(double v) { this.weightRiskCap = v; }

    public double getWeightSlightlyFastPct() { return weightSlightlyFastPct; }
    public void setWeightSlightlyFastPct(double v) { this.weightSlightlyFastPct = v; }

    public double getProteinTargetLowGPerKg() { return proteinTargetLowGPerKg; }
    public void setProteinTargetLowGPerKg(double v) { this.proteinTargetLowGPerKg = v; }

    public double getProteinTargetHighGPerKg() { return proteinTargetHighGPerKg; }
    public void setProteinTargetHighGPerKg(double v) { this.proteinTargetHighGPerKg = v; }

    public double getProteinRiskCap() { return proteinRiskCap; }
    public void setProteinRiskCap(double v) { this.proteinRiskCap = v; }

    public double getProteinOnTrackAdherence() { return proteinOnTrackAdherence; }
    public void setProteinOnTrackAdherence(double v) { this.proteinOnTrackAdherence = v; }

    public double getProteinInconsistentAdherence() { return proteinInconsistentAdherence; }
    public void setProteinInconsistentAdherence(double v) { this.proteinInconsistentAdherence = v; }

    public int getTrainingSessionsGood() { return trainingSessionsGood; }
    public void setTrainingSessionsGood(int v) { this.trainingSessionsGood = v; }

    public double getTrainingRiskOneSession() { return trainingRiskOneSession; }
    public void setTrainingRiskOneSession(double v) { this.trainingRiskOneSession = v; }

    public double getTrainingRiskZeroSessions() { return trainingRiskZeroSessions; }
    public void setTrainingRiskZeroSessions(double v) { this.trainingRiskZeroSessions = v; }

    public double getBodyCompDeclineLb() { return bodyCompDeclineLb; }
    public void setBodyCompDeclineLb(double v) { this.bodyCompDeclineLb = v; }

    public double getBodyCompDeclineRisk() { return bodyCompDeclineRisk; }
    public void setBodyCompDeclineRisk(double v) { this.bodyCompDeclineRisk = v; }

    public double getBodyCompHoldReward() { return bodyCompHoldReward; }
    public void setBodyCompHoldReward(double v) { this.bodyCompHoldReward = v; }

    public int getBandLowMaxExclusive() { return bandLowMaxExclusive; }
    public void setBandLowMaxExclusive(int v) { this.bandLowMaxExclusive = v; }

    public int getBandModerateMaxExclusive() { return bandModerateMaxExclusive; }
    public void setBandModerateMaxExclusive(int v) { this.bandModerateMaxExclusive = v; }

    public double getBiggestDriverMinPoints() { return biggestDriverMinPoints; }
    public void setBiggestDriverMinPoints(double v) { this.biggestDriverMinPoints = v; }

    public int getPartialDataMinPoints() { return partialDataMinPoints; }
    public void setPartialDataMinPoints(int v) { this.partialDataMinPoints = v; }

    public int getSustainedRiskWeeks() { return sustainedRiskWeeks; }
    public void setSustainedRiskWeeks(int v) { this.sustainedRiskWeeks = v; }

    public int getSustainedRiskScore() { return sustainedRiskScore; }
    public void setSustainedRiskScore(int v) { this.sustainedRiskScore = v; }

    public double getDefaultBodyweightLb() { return defaultBodyweightLb; }
    public void setDefaultBodyweightLb(double v) { this.defaultBodyweightLb = v; }
}
