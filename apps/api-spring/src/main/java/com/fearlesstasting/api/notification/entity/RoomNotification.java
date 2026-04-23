package com.fearlesstasting.api.notification.entity;

import com.fearlesstasting.api.common.util.CuidGenerator;
import com.fearlesstasting.api.room.entity.Room;
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
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 방 내 활동 알림. type:
 *  restaurant_added | review_added | visit_added | poll_created | member_joined
 */
@Entity
@Table(
    name = "RoomNotification",
    indexes = {
        @Index(name = "RoomNotification_userId_isRead_createdAt_idx", columnList = "userId, isRead, createdAt"),
        @Index(name = "RoomNotification_roomId_idx", columnList = "roomId"),
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoomNotification {

    @Id
    @Column(length = 30)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "roomId", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @Column(nullable = false, length = 30)
    private String type;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(name = "isRead", nullable = false)
    private boolean isRead;

    @CreatedDate
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
    }

    @Builder
    private RoomNotification(Room room, User user, String type, String message) {
        this.room = room;
        this.user = user;
        this.type = type;
        this.message = message;
    }

    public void markRead() { this.isRead = true; }
}
