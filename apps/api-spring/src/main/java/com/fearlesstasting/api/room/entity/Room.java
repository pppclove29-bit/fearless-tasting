package com.fearlesstasting.api.room.entity;

import com.fearlesstasting.api.common.entity.BaseTimeEntity;
import com.fearlesstasting.api.common.util.CuidGenerator;
import com.fearlesstasting.api.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 공유 방. 초대 코드 기반 멤버 입장, 공개 설정 시 비로그인 열람 허용.
 * 탭 on/off 4종(tabWishlist/tabRegion/tabPoll/tabStats)과 maxMembers(2~20) 설정 포함.
 */
@Entity
@Table(
    name = "Room",
    indexes = {
        @Index(name = "Room_ownerId_idx", columnList = "ownerId"),
        @Index(name = "Room_isPublic_updatedAt_idx", columnList = "isPublic, updatedAt"),
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Room extends BaseTimeEntity {

    @Id
    @Column(length = 30)
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "inviteCode", nullable = false, unique = true, length = 8)
    private String inviteCode;

    @Column(name = "inviteCodeExpiresAt")
    private LocalDateTime inviteCodeExpiresAt;

    @Column(name = "isPublic", nullable = false)
    private boolean isPublic;

    @Column(name = "maxMembers", nullable = false)
    private int maxMembers;

    @Column(length = 500)
    private String announcement;

    @Column(name = "tabWishlistEnabled", nullable = false)
    private boolean tabWishlistEnabled;

    @Column(name = "tabRegionEnabled", nullable = false)
    private boolean tabRegionEnabled;

    @Column(name = "tabPollEnabled", nullable = false)
    private boolean tabPollEnabled;

    @Column(name = "tabStatsEnabled", nullable = false)
    private boolean tabStatsEnabled;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ownerId", nullable = false)
    private User owner;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
        if (this.maxMembers == 0) this.maxMembers = 4;
    }

    @Builder
    private Room(String name, String inviteCode, User owner, Integer maxMembers,
                 Boolean isPublic,
                 Boolean tabWishlistEnabled, Boolean tabRegionEnabled,
                 Boolean tabPollEnabled, Boolean tabStatsEnabled) {
        this.name = name;
        this.inviteCode = inviteCode;
        this.owner = owner;
        this.maxMembers = maxMembers == null ? 4 : maxMembers;
        this.isPublic = isPublic != null && isPublic;
        this.tabWishlistEnabled = tabWishlistEnabled == null ? true : tabWishlistEnabled;
        this.tabRegionEnabled = tabRegionEnabled == null ? true : tabRegionEnabled;
        this.tabPollEnabled = tabPollEnabled != null && tabPollEnabled;
        this.tabStatsEnabled = tabStatsEnabled != null && tabStatsEnabled;
    }

    public void rename(String name) {
        this.name = name;
    }

    public void updateAnnouncement(String announcement) {
        this.announcement = announcement;
    }

    public void togglePublic(boolean isPublic) {
        this.isPublic = isPublic;
    }

    public void updateMaxMembers(int maxMembers) {
        this.maxMembers = maxMembers;
    }

    public void updateTabs(boolean wishlist, boolean region, boolean poll, boolean stats) {
        this.tabWishlistEnabled = wishlist;
        this.tabRegionEnabled = region;
        this.tabPollEnabled = poll;
        this.tabStatsEnabled = stats;
    }

    public void regenerateInviteCode(String newCode) {
        this.inviteCode = newCode;
    }

    public void transferOwner(User newOwner) {
        this.owner = newOwner;
    }
}
