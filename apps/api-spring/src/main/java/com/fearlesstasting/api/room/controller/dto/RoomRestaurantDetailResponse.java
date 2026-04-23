package com.fearlesstasting.api.room.controller.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Nest `RoomRestaurantDetailResponse` shape 완전 대응.
 * visits[] 중첩, 각 visit 안에 participants[] + reviews[] + createdBy nested.
 */
public record RoomRestaurantDetailResponse(
    String id,
    String name,
    String address,
    String province,
    String city,
    String neighborhood,
    String category,
    List<String> images,
    Double latitude,
    Double longitude,
    boolean isClosed,
    boolean isWishlist,
    String roomId,
    String addedById,
    LocalDateTime createdAt,
    UserBrief addedBy,
    Double avgRating,
    VisitCount _count,
    List<VisitView> visits
) {
    public record UserBrief(String id, String nickname, String profileImageUrl) {}

    public record VisitCount(long visits, long reviews) {}

    public record ParticipantView(String id, String visitId, String userId, UserBrief user) {}

    public record ReviewView(
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
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        UserBrief user
    ) {}

    public record VisitView(
        String id,
        LocalDate visitedAt,
        String memo,
        String waitTime,
        boolean isDelivery,
        String restaurantId,
        String createdById,
        LocalDateTime createdAt,
        UserBrief createdBy,
        List<ParticipantView> participants,
        List<ReviewView> reviews,
        VisitInnerCount _count
    ) {}

    public record VisitInnerCount(long reviews) {}
}
