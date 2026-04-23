package com.fearlesstasting.api.room.controller.dto;

import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record CreateVisitRequest(
    LocalDate visitedAt,
    @Size(max = 500) String memo,
    @Size(max = 20)  String waitTime,
    Boolean isDelivery,
    List<String> participantUserIds
) {}
