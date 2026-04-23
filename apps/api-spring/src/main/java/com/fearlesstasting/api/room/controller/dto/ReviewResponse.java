package com.fearlesstasting.api.room.controller.dto;

import com.fearlesstasting.api.room.entity.RoomReview;
import java.time.LocalDateTime;

public record ReviewResponse(
    String id,
    double rating,
    String content,
    int wouldRevisit,
    Double tasteRating,
    Double valueRating,
    Double serviceRating,
    Double cleanlinessRating,
    Double accessibilityRating,
    String favoriteMenu,
    String tryNextMenu,
    String images,
    String visitId,
    String userId,
    String userNickname,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static ReviewResponse from(RoomReview r) {
        return new ReviewResponse(
            r.getId(), r.getRating(), r.getContent(), r.getWouldRevisit(),
            r.getTasteRating(), r.getValueRating(), r.getServiceRating(),
            r.getCleanlinessRating(), r.getAccessibilityRating(),
            r.getFavoriteMenu(), r.getTryNextMenu(), r.getImages(),
            r.getVisit().getId(),
            r.getUser().getId(), r.getUser().getNickname(),
            r.getCreatedAt(), r.getUpdatedAt()
        );
    }
}
