package com.fearlesstasting.api.category.controller.dto;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record UpdateCategoryRequest(
    @Size(max = 50) String name,
    @Size(max = 10) String emoji,
    @PositiveOrZero Integer displayOrder,
    Boolean isActive
) {}
