package com.fearlesstasting.api.room.controller.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record UpdateRoomRequest(
    @Size(max = 100) String name,
    @Size(max = 500) String announcement,
    @Min(2) @Max(20) Integer maxMembers,
    Boolean isPublic,
    Boolean tabWishlistEnabled,
    Boolean tabRegionEnabled,
    Boolean tabPollEnabled,
    Boolean tabStatsEnabled
) {}
