package com.trajectoryfit.risk.model;

import java.util.Arrays;
import java.util.List;

/**
 * A single day's raw protein entry, in whichever tier the user logged it. This holds
 * the raw inputs only; collapsing it to a {@link ProteinLevel} requires the user's
 * 7-day average bodyweight (for the Precise gram target) and is done by
 * {@link com.trajectoryfit.risk.ProteinNormalizer}.
 *
 * Construct via the tier-specific factories. Meal slots follow the prototype's
 * fixed order: breakfast, lunch, dinner, snacks. A {@code null} entry in a meal list
 * means that meal was not logged.
 */
public final class ProteinLog {

    private final ProteinTier tier;
    private final List<Double> mealGrams;    // PRECISE: grams per meal, nullable entries
    private final List<ProteinLevel> mealLevels; // ESTIMATE: per-meal ratings, nullable entries
    private final ProteinLevel quickLevel;   // QUICK: single daily rating

    private ProteinLog(ProteinTier tier, List<Double> mealGrams,
                       List<ProteinLevel> mealLevels, ProteinLevel quickLevel) {
        this.tier = tier;
        this.mealGrams = mealGrams;
        this.mealLevels = mealLevels;
        this.quickLevel = quickLevel;
    }

    /** Quick tier: one Low/Good/High rating for the whole day. */
    public static ProteinLog quick(ProteinLevel level) {
        return new ProteinLog(ProteinTier.QUICK, null, null, level);
    }

    /** Estimate tier: per-meal Low/Good/High ratings (nulls allowed for unlogged meals). */
    public static ProteinLog estimate(ProteinLevel... meals) {
        return new ProteinLog(ProteinTier.ESTIMATE, null, Arrays.asList(meals), null);
    }

    /** Precise tier: exact grams per meal (nulls allowed for unlogged meals). */
    public static ProteinLog precise(Double... grams) {
        return new ProteinLog(ProteinTier.PRECISE, Arrays.asList(grams), null, null);
    }

    public ProteinTier tier() {
        return tier;
    }

    public List<Double> mealGrams() {
        return mealGrams;
    }

    public List<ProteinLevel> mealLevels() {
        return mealLevels;
    }

    public ProteinLevel quickLevel() {
        return quickLevel;
    }
}
