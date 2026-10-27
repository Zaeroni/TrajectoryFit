package com.trajectoryfit.risk.model;

import java.time.LocalDate;

/**
 * All of a single calendar day's logged signals, as consumed by the scoring engine.
 * This is the framework-free input type: the persistence layer assembles a window of
 * these from the database (converting stored metric values to the pounds/grams the
 * scoring rules operate in), and the scoring engine reads them without knowing where
 * they came from.
 *
 * Every signal is independently nullable. A {@code null} means "not logged", which
 * the scoring rules treat as absent data (excluded), never as a bad value.
 *
 * Weights are in pounds and lean mass in pounds to keep the port faithful to the
 * validated JavaScript reference; the DB stores metric and converts at the boundary.
 */
public final class DailyLog {

    private final LocalDate date;
    private final Double weightLb;
    private final ProteinLog protein;
    private final TrainingType trainingType;
    private final Double bodyFatPct;
    private final Double leanMassLb;

    private DailyLog(Builder b) {
        this.date = b.date;
        this.weightLb = b.weightLb;
        this.protein = b.protein;
        this.trainingType = b.trainingType;
        this.bodyFatPct = b.bodyFatPct;
        this.leanMassLb = b.leanMassLb;
    }

    /** An empty day with nothing logged, used to pad a window to a full 7 days. */
    public static DailyLog empty(LocalDate date) {
        return builder(date).build();
    }

    public static Builder builder(LocalDate date) {
        return new Builder(date);
    }

    public LocalDate date() {
        return date;
    }

    public Double weightLb() {
        return weightLb;
    }

    public ProteinLog protein() {
        return protein;
    }

    public TrainingType trainingType() {
        return trainingType;
    }

    public Double bodyFatPct() {
        return bodyFatPct;
    }

    public Double leanMassLb() {
        return leanMassLb;
    }

    public boolean hasAnyData() {
        return weightLb != null || protein != null || trainingType != null
                || bodyFatPct != null || leanMassLb != null;
    }

    public static final class Builder {
        private final LocalDate date;
        private Double weightLb;
        private ProteinLog protein;
        private TrainingType trainingType;
        private Double bodyFatPct;
        private Double leanMassLb;

        private Builder(LocalDate date) {
            this.date = date;
        }

        public Builder weightLb(Double weightLb) {
            this.weightLb = weightLb;
            return this;
        }

        public Builder protein(ProteinLog protein) {
            this.protein = protein;
            return this;
        }

        public Builder training(TrainingType trainingType) {
            this.trainingType = trainingType;
            return this;
        }

        public Builder bodyFatPct(Double bodyFatPct) {
            this.bodyFatPct = bodyFatPct;
            return this;
        }

        public Builder leanMassLb(Double leanMassLb) {
            this.leanMassLb = leanMassLb;
            return this;
        }

        public DailyLog build() {
            return new DailyLog(this);
        }
    }
}
