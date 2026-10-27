// Weight-loss pace thresholds. These mirror the backend and must be kept in sync by hand:
//  - ON_TRACK is trajectoryfit.risk.weight-rate-threshold-pct in application.yml (RiskConfig.weightRateThresholdPct).
//  - SLIGHTLY_FAST lives in RiskConfig.java (weightSlightlyFastPct), NOT in application.yml; it has no yml key yet.
// RiskService scores total % lost from the first to the last logged weight in the 7-day window:
//   <= ON_TRACK "On track", <= SLIGHTLY_FAST "Slightly fast", above that "Losing too fast".
export const WEIGHT_ON_TRACK_PCT = 1.0
export const WEIGHT_SLIGHTLY_FAST_PCT = 1.5

export type WeightZone = 'onTrack' | 'slightlyFast' | 'tooFast'

export const WEIGHT_ZONE_LABEL: Record<WeightZone, string> = {
  onTrack: 'On track',
  slightlyFast: 'Slightly fast',
  tooFast: 'Too fast',
}

/** Weights (lb) that sit exactly on each threshold, anchored on the window's first weight. */
export function weightZoneEdges(startLb: number): { onTrackLb: number; slightlyFastLb: number } {
  return {
    onTrackLb: startLb * (1 - WEIGHT_ON_TRACK_PCT / 100),
    slightlyFastLb: startLb * (1 - WEIGHT_SLIGHTLY_FAST_PCT / 100),
  }
}

/** Which zone a weight falls in, using the same rate formula and comparisons as RiskService. */
export function weightZoneFor(startLb: number, currentLb: number): WeightZone {
  const ratePct = ((startLb - currentLb) / startLb) * 100
  if (ratePct <= WEIGHT_ON_TRACK_PCT) return 'onTrack'
  return ratePct <= WEIGHT_SLIGHTLY_FAST_PCT ? 'slightlyFast' : 'tooFast'
}
