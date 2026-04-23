package com.fearlesstasting.api.room.controller.dto;

import com.fearlesstasting.api.room.entity.RoomVisit;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record VisitResponse(
    String id,
    LocalDate visitedAt,
    String memo,
    String waitTime,
    boolean isDelivery,
    String restaurantId,
    String createdById,
    String createdByNickname,
    LocalDateTime createdAt
) {
    public static VisitResponse from(RoomVisit v) {
        return new VisitResponse(
            v.getId(), v.getVisitedAt(), v.getMemo(), v.getWaitTime(), v.isDelivery(),
            v.getRestaurant().getId(),
            v.getCreatedBy() == null ? null : v.getCreatedBy().getId(),
            v.getCreatedBy() == null ? null : v.getCreatedBy().getNickname(),
            v.getCreatedAt()
        );
    }
}
