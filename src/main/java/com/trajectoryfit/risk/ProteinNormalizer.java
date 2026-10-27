package com.trajectoryfit.risk;

import com.trajectoryfit.risk.config.RiskConfig;
import com.trajectoryfit.risk.model.ProteinLevel;
import com.trajectoryfit.risk.model.ProteinLog;

/**
 * Collapses a day's protein entry — logged in any of the three tiers — into a single
 * {@link ProteinLevel}, so the scoring engine never has to care which tier produced it.
 *
 * Priority order, using the first tier that has data for the day (a faithful port of
 * the prototype's {@code getDayProteinLevel}):
 * <ol>
 *   <li><b>Precise</b>: sum the logged grams and compare to a daily target of
 *       {@code low–high} g per kg of the 7-day average bodyweight (each end rounded to
 *       the nearest 5 g). Below the low end is {@code LOW}, within range {@code GOOD},
 *       above {@code HIGH}.</li>
 *   <li><b>Estimate</b>: average the rated meals (low=0, good=1, high=2) and map the
 *       average back (&lt;0.75 → LOW, &lt;1.5 → GOOD, else HIGH).</li>
 *   <li><b>Quick</b>: use the single daily rating directly.</li>
 * </ol>
 *
 * If nothing was logged that day, returns {@code null} — the day has no protein value
 * and must be excluded from adherence entirely (it is <em>not</em> counted as low).
 */
public final class ProteinNormalizer {

    private static final double KG_PER_LB = 1.0 / 2.2046;

    private ProteinNormalizer() {
    }

    /**
     * @param protein       the day's raw entry, or {@code null} if nothing was logged
     * @param avgWeightLb   the user's 7-day average bodyweight in pounds (for the Precise target)
     * @param config        threshold configuration
     * @return the normalized level, or {@code null} if the day has no protein value
     */
    public static ProteinLevel normalize(ProteinLog protein, double avgWeightLb, RiskConfig config) {
        if (protein == null) {
            return null;
        }

        // 1. Precise: any gram value logged that day wins.
        if (protein.mealGrams() != null && protein.mealGrams().stream().anyMatch(g -> g != null)) {
            double total = protein.mealGrams().stream().filter(g -> g != null).mapToDouble(Double::doubleValue).sum();
            double kg = avgWeightLb * KG_PER_LB;
            double low = round5(kg * config.getProteinTargetLowGPerKg());
            double high = round5(kg * config.getProteinTargetHighGPerKg());
            if (total < low) {
                return ProteinLevel.LOW;
            }
            return total <= high ? ProteinLevel.GOOD : ProteinLevel.HIGH;
        }

        // 2. Estimate: average the rated meals.
        if (protein.mealLevels() != null) {
            var rated = protein.mealLevels().stream().filter(l -> l != null).toList();
            if (!rated.isEmpty()) {
                double avg = rated.stream().mapToInt(ProteinLevel::numeric).average().orElse(0);
                if (avg < 0.75) {
                    return ProteinLevel.LOW;
                }
                return avg < 1.5 ? ProteinLevel.GOOD : ProteinLevel.HIGH;
            }
        }

        // 3. Quick: the single daily rating (may itself be null → no value).
        return protein.quickLevel();
    }

    /** Round to the nearest 5, matching the prototype's {@code round5}. */
    static double round5(double n) {
        return Math.round(n / 5.0) * 5.0;
    }
}
