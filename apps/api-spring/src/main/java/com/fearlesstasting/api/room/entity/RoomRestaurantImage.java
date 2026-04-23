package com.fearlesstasting.api.room.entity;

import com.fearlesstasting.api.common.util.CuidGenerator;
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

/** 식당 이미지 (최대 3개, sortOrder 순서). */
@Entity
@Table(
    name = "RoomRestaurantImage",
    indexes = {
        @Index(name = "RoomRestaurantImage_restaurantId_idx", columnList = "restaurantId"),
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoomRestaurantImage {

    @Id
    @Column(length = 30)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurantId", nullable = false)
    private RoomRestaurant restaurant;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(name = "sortOrder", nullable = false)
    private int sortOrder;

    @CreatedDate
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
    }

    @Builder
    private RoomRestaurantImage(RoomRestaurant restaurant, String url, int sortOrder) {
        this.restaurant = restaurant;
        this.url = url;
        this.sortOrder = sortOrder;
    }
}
