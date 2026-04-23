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
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 방문 참여자 태그 (visit × user). */
@Entity
@Table(
    name = "RoomVisitParticipant",
    uniqueConstraints = {
        @UniqueConstraint(name = "RoomVisitParticipant_visitId_userId_key", columnNames = {"visitId", "userId"}),
    },
    indexes = { @Index(name = "RoomVisitParticipant_userId_idx", columnList = "userId") }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoomVisitParticipant {

    @Id
    @Column(length = 30)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visitId", nullable = false)
    private RoomVisit visit;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
    }

    @Builder
    private RoomVisitParticipant(RoomVisit visit, User user) {
        this.visit = visit;
        this.user = user;
    }
}
