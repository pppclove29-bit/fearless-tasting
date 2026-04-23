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
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** 방문 기록. 식당에 언제 누가 갔는지. */
@Entity
@Table(
    name = "RoomVisit",
    indexes = {
        @Index(name = "RoomVisit_restaurantId_idx", columnList = "restaurantId"),
        @Index(name = "RoomVisit_createdById_idx", columnList = "createdById"),
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoomVisit {

    @Id
    @Column(length = 30)
    private String id;

    @Column(name = "visitedAt", nullable = false)
    private LocalDate visitedAt;

    @Column(length = 500)
    private String memo;

    @Column(name = "waitTime", length = 20)
    private String waitTime;

    @Column(name = "isDelivery", nullable = false)
    private boolean isDelivery;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurantId", nullable = false)
    private RoomRestaurant restaurant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "createdById")
    private User createdBy;

    @CreatedDate
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
    }

    @Builder
    private RoomVisit(RoomRestaurant restaurant, User createdBy, LocalDate visitedAt,
                      String memo, String waitTime, Boolean isDelivery) {
        this.restaurant = restaurant;
        this.createdBy = createdBy;
        this.visitedAt = visitedAt;
        this.memo = memo;
        this.waitTime = waitTime;
        this.isDelivery = isDelivery != null && isDelivery;
    }

    public void update(LocalDate visitedAt, String memo, String waitTime) {
        if (visitedAt != null) this.visitedAt = visitedAt;
        if (memo != null) this.memo = memo;
        if (waitTime != null) this.waitTime = waitTime;
    }
}
