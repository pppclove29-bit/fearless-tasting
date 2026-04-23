package com.fearlesstasting.api.poll.entity;

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

/** 방 투표. status: active | closed. endsAt 경과 시 자동 closed 전환(조회 시 lazy 처리). */
@Entity
@Table(
    name = "RoomPoll",
    indexes = {
        @Index(name = "RoomPoll_roomId_status_idx", columnList = "roomId, status"),
        @Index(name = "RoomPoll_createdById_idx", columnList = "createdById"),
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoomPoll {

    public static final String STATUS_ACTIVE = "active";
    public static final String STATUS_CLOSED = "closed";

    @Id
    @Column(length = 30)
    private String id;

    @Column(nullable = false, length = 200)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "roomId", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "createdById", nullable = false)
    private User createdBy;

    @Column(name = "endsAt")
    private LocalDateTime endsAt;

    @Column(nullable = false, length = 10)
    private String status;

    @CreatedDate
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
        if (this.status == null) this.status = STATUS_ACTIVE;
    }

    @Builder
    private RoomPoll(Room room, User createdBy, String title, LocalDateTime endsAt) {
        this.room = room;
        this.createdBy = createdBy;
        this.title = title;
        this.endsAt = endsAt;
    }

    public void close() {
        this.status = STATUS_CLOSED;
    }

    public boolean isClosed() {
        return STATUS_CLOSED.equals(this.status);
    }

    public boolean shouldAutoClose(LocalDateTime now) {
        return !isClosed() && this.endsAt != null && now.isAfter(this.endsAt);
    }
}
