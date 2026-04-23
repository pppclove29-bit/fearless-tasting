package com.fearlesstasting.api.room.controller.dto;

import com.fearlesstasting.api.room.entity.Room;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 방 상세 응답 (GET /rooms/:id).
 * Nest `RoomDetailResponse = Room & { members, restaurants }`.
 */
public record RoomDetailResponse(
    String id,
    String name,
    String inviteCode,
    LocalDateTime inviteCodeExpiresAt,
    String ownerId,
    boolean isPublic,
    int maxMembers,
    String announcement,
    boolean tabWishlistEnabled,
    boolean tabRegionEnabled,
    boolean tabPollEnabled,
    boolean tabStatsEnabled,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    List<MemberInfo> members,
    List<RestaurantInfoView> restaurants
) {
    public record UserBrief(String id, String nickname, String profileImageUrl) {}

    /** Nest `RoomMemberInfo` shape. */
    public record MemberInfo(
        String id, String role, String userId,
        LocalDateTime joinedAt, UserBrief user
    ) {}

    /** Nest `RoomRestaurantInfo` shape (상세 객체 내 식당 요약). */
    public record RestaurantInfoView(
        String id, String name, String address,
        String province, String city, String neighborhood,
        String category,
        List<String> images,
        Double latitude, Double longitude,
        boolean isClosed, boolean isWishlist,
        String roomId, String addedById,
        LocalDateTime createdAt,
        Double avgRating,
        Count _count,
        UserBrief addedBy
    ) {}

    public record Count(long visits, long reviews) {}

    public static RoomDetailResponse build(
        Room room, List<MemberInfo> members, List<RestaurantInfoView> restaurants
    ) {
        return new RoomDetailResponse(
            room.getId(), room.getName(), room.getInviteCode(), room.getInviteCodeExpiresAt(),
            room.getOwner().getId(),
            room.isPublic(), room.getMaxMembers(), room.getAnnouncement(),
            room.isTabWishlistEnabled(), room.isTabRegionEnabled(),
            room.isTabPollEnabled(), room.isTabStatsEnabled(),
            room.getCreatedAt(), room.getUpdatedAt(),
            members, restaurants
        );
    }
}
