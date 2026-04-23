package com.fearlesstasting.api.room.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JoinRoomRequest(
    @NotBlank @Size(min = 8, max = 8) String inviteCode
) {}
