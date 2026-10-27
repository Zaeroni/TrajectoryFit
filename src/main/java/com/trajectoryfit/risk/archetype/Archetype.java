package com.trajectoryfit.risk.archetype;

import com.trajectoryfit.risk.result.RiskBand;

/**
 * The five synthetic behavioral profiles used to validate {@link com.trajectoryfit.risk.RiskService}
 * against known-good and known-bad cases before trusting it on real logs. Each is tagged
 * with the risk band it is expected to land in, so the same definitions double as an
 * integration-test fixture and as the seed for synthetic database users.
 *
 * {@code CARDIO_ONLY} and {@code BRAND_NEW} are the load-bearing cases: they prove the
 * model distinguishes "active but not protecting muscle" from "actually at risk", and that
 * it never penalizes missing data as if it were bad data.
 */
public enum Archetype {

    /** Losing far too fast, low protein, no resistance training. The worst case. */
    CRASH_DIETER("crash_dieter", RiskBand.HIGH),

    /** Sustainable loss rate, good protein, 3 resistance sessions. The model case. */
    DOING_IT_RIGHT("doing_it_right", RiskBand.LOW),

    /** Reasonable protein but only cardio — active, yet not protecting muscle. */
    CARDIO_ONLY("cardio_only", RiskBand.MODERATE),

    /** Gentle loss, solid protein, steady training. Comfortably fine. */
    SLOW_AND_STEADY("slow_and_steady", RiskBand.LOW),

    /** Barely any data logged yet — should score low and be flagged as partial, not penalized. */
    BRAND_NEW("brand_new", RiskBand.LOW);

    private final String key;
    private final RiskBand expectedBand;

    Archetype(String key, RiskBand expectedBand) {
        this.key = key;
        this.expectedBand = expectedBand;
    }

    /** The snake_case identifier used in seed data and docs. */
    public String key() {
        return key;
    }

    public RiskBand expectedBand() {
        return expectedBand;
    }
}
