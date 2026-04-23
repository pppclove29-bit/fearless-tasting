package com.fearlesstasting.api.room.entity;

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
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 방 강퇴 이력. 같은 유저 재입장 차단 용도. */
@Entity
@Table(
    name = "RoomKick",
    uniqueConstraints = {
        @UniqueConstraint(name = "RoomKick_roomId_userId_key", columnNames = {"roomId", "userId"}),
    },
    indexes = {
        @Index(name = "RoomKick_userId_idx", columnList = "userId"),
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoomKick {

    @Id
    @Column(length = 30)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "roomId", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @Column(name = "kickedAt", nullable = false)
    private LocalDateTime kickedAt;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
        if (this.kickedAt == null) this.kickedAt = LocalDateTime.now();
    }

    @Builder
    private RoomKick(Room room, User user) {
        this.room = room;
        this.user = user;
    }
}
