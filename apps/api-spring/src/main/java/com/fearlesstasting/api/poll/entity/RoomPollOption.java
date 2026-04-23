package com.fearlesstasting.api.poll.entity;

import com.fearlesstasting.api.common.util.CuidGenerator;
import com.fearlesstasting.api.room.entity.RoomRestaurant;
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

/** 투표 선택지. `restaurantId` 연결 시 방문 기록 CTA 노출 가능. */
@Entity
@Table(
    name = "RoomPollOption",
    indexes = { @Index(name = "RoomPollOption_pollId_idx", columnList = "pollId") }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoomPollOption {

    @Id
    @Column(length = 30)
    private String id;

    @Column(nullable = false, length = 200)
    private String label;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurantId")
    private RoomRestaurant restaurant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pollId", nullable = false)
    private RoomPoll poll;

    @CreatedDate
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
    }

    @Builder
    private RoomPollOption(RoomPoll poll, String label, RoomRestaurant restaurant) {
        this.poll = poll;
        this.label = label;
        this.restaurant = restaurant;
    }
}
