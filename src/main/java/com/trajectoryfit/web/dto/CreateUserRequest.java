package com.trajectoryfit.web.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.util.List;

/**
 * Request to create a user. The API faces imperial units (height in inches, goal weight in
 * pounds); values are converted to metric for storage.
 */
public record CreateUserRequest(
        @NotBlank String name,
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
