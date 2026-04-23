package com.fearlesstasting.api.room.controller.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewRequest(
    @NotNull @DecimalMin("0.5") @DecimalMax("5.0") Double rating,
    @Size(max = 2000) String content,
    @Min(1) @Max(5) Integer wouldRevisit,
    @DecimalMin("0.5") @DecimalMax("5.0") Double tasteRating,
    @DecimalMin("0.5") @DecimalMax("5.0") Double valueRating,
    @DecimalMin("0.5") @DecimalMax("5.0") Double serviceRating,
    @DecimalMin("0.5") @DecimalMax("5.0") Double cleanlinessRating,
    @DecimalMin("0.5") @DecimalMax("5.0") Double accessibilityRating,
    @Size(max = 200) String favoriteMenu,
    @Size(max = 200) String tryNextMenu,
    String images
) {}
