package com.fearlesstasting.api.category.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpsertMappingRequest(
    @NotBlank @Size(max = 200) String rawInput,
    @NotNull Integer categoryId
) {}
