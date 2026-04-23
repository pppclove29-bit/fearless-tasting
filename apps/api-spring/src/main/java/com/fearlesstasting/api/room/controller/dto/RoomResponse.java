package com.fearlesstasting.api.room.controller.dto;

import com.fearlesstasting.api.room.entity.Room;
import java.time.LocalDateTime;

/**
 * Nest `Room` 타입과 동일한 응답 shape.
 * 프론트 `packages/types/src/room.ts`의 `Room` 인터페이스 필드 순서·키 맞춤.
 */
public record RoomResponse(
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
    LocalDateTime updatedAt
) {
    public static RoomResponse from(Room r) {
        return new RoomResponse(
            r.getId(), r.getName(), r.getInviteCode(), r.getInviteCodeExpiresAt(),
            r.getOwner().getId(),
            r.isPublic(), r.getMaxMembers(), r.getAnnouncement(),
            r.isTabWishlistEnabled(), r.isTabRegionEnabled(),
            r.isTabPollEnabled(), r.isTabStatsEnabled(),
            r.getCreatedAt(), r.getUpdatedAt()
        );
    }
}
