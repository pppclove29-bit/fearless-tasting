package com.fearlesstasting.api.room.controller.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRoomRequest(
    @NotBlank @Size(max = 100) String name,
    Boolean isPublic,
    @Min(2) @Max(20) Integer maxMembers,
    Boolean tabWishlistEnabled,
    Boolean tabRegionEnabled,
    Boolean tabPollEnabled,
    Boolean tabStatsEnabled
) {}
