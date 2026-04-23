package com.fearlesstasting.api.room.controller.dto;

import com.fearlesstasting.api.room.entity.Room;
import java.time.LocalDateTime;

/**
 * 내 방 목록 응답 (GET /rooms).
 * Nest `RoomListItem = Room & { myRole, memberCount, restaurantCount }`.
 */
public record RoomListItemResponse(
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
    // 확장 필드
    String myRole,
    long memberCount,
    long restaurantCount
) {
    public static RoomListItemResponse from(Room r, String myRole, long memberCount, long restaurantCount) {
        return new RoomListItemResponse(
            r.getId(), r.getName(), r.getInviteCode(), r.getInviteCodeExpiresAt(),
            r.getOwner().getId(),
            r.isPublic(), r.getMaxMembers(), r.getAnnouncement(),
            r.isTabWishlistEnabled(), r.isTabRegionEnabled(),
            r.isTabPollEnabled(), r.isTabStatsEnabled(),
            r.getCreatedAt(), r.getUpdatedAt(),
            myRole, memberCount, restaurantCount
        );
    }
}
