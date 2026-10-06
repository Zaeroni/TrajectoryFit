package com.trajectoryfit.web.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Partial update of a user's profile and goals (the Settings screen). Any field left out
 * (null) is left unchanged. Imperial units, like {@link CreateUserRequest}.
 */
public record UpdateUserRequest(
        @Size(min = 1, max = 100) String name,
        @DecimalMin("24") @DecimalMax("108") Double heightIn,
        @DecimalMin("60") @DecimalMax("700") Double goalWeightLb,
        @Pattern(regexp = "semaglutide|tirzepatide|other|none",
                message = "must be one of: semaglutide, tirzepatide, other, none") String medication,
        @Pattern(regexp = "quick|estimate|precise",
                message = "must be one of: quick, estimate, precise") String loggingPreference,
        List<@Pattern(regexp = "gym_scan|smart_scale|paid_scan",
                message = "must be one of: gym_scan, smart_scale, paid_scan") String> bodyCompAccess
) {
}
