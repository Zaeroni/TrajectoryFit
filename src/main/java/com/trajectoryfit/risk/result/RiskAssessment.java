package com.trajectoryfit.risk.result;

import java.util.List;

/**
 * The full result of scoring one 7-day window: the overall score and band, every
 * contributing factor's sub-score, the biggest driver (if any is worth naming), and a
 * one-line summary. This is the object the {@code /risk} endpoint serializes.
 *
 * When nothing was logged in the window, {@link #hasData()} is {@code false},
 * {@link #score()} and {@link #band()} are {@code null}, and the factors carry
 * "No data" statuses.
 *
 * @param hasData            whether the window had any logged data at all
 * @param score              overall score, clamped 0–100, or {@code null} when no data
 * @param band               overall band, or {@code null} when no data
 * @param weight             weight-loss-rate sub-score
 * @param protein            protein sub-score
 * @param training           training sub-score
 * @param bodyComp           body-composition sub-score
 * @param biggestDriver      the factor driving the score, or {@code null} if none is
 *                           worth naming (a nearly-perfect week names no driver)
 * @param partialData        whether the week is based on partial data (low confidence)
 * @param totalLoggedPoints  count of logged weight + protein + training data points
 * @param summary            one-line plain-language summary, with any partial-data note appended
 */
public record RiskAssessment(
        boolean hasData,
        Integer score,
        RiskBand band,
        FactorScore weight,
        FactorScore protein,
        FactorScore training,
        FactorScore bodyComp,
        Factor biggestDriver,
        boolean partialData,
        int totalLoggedPoints,
        String summary
) {
    /** The four factor sub-scores in display order. */
    public List<FactorScore> factors() {
        return List.of(weight, protein, training, bodyComp);
    }
}
