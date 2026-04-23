package com.fearlesstasting.api.room.entity;

import com.fearlesstasting.api.common.util.CuidGenerator;
import com.fearlesstasting.api.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** 방 멤버십 (owner/manager/member). 같은 방에 같은 유저 1회 제한. */
@Entity
@Table(
    name = "RoomMember",
    uniqueConstraints = {
        @UniqueConstraint(name = "RoomMember_roomId_userId_key", columnNames = {"roomId", "userId"}),
    },
    indexes = {
        @Index(name = "RoomMember_userId_idx", columnList = "userId"),
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoomMember {

    public static final String ROLE_OWNER = "owner";
    public static final String ROLE_MANAGER = "manager";
    public static final String ROLE_MEMBER = "member";

    @Id
    @Column(length = 30)
    private String id;

    @Column(nullable = false, length = 10)
    private String role;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "roomId", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @CreatedDate
    @Column(name = "joinedAt", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
        if (this.role == null) this.role = ROLE_MEMBER;
    }

    @Builder
    private RoomMember(Room room, User user, String role) {
        this.room = room;
        this.user = user;
        this.role = role == null ? ROLE_MEMBER : role;
    }

    public void promoteTo(String role) {
        this.role = role;
    }

    public boolean isOwnerOrManager() {
        return ROLE_OWNER.equals(this.role) || ROLE_MANAGER.equals(this.role);
    }

    public boolean isOwner() {
        return ROLE_OWNER.equals(this.role);
    }
}
