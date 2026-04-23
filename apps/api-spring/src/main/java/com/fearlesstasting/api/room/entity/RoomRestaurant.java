package com.fearlesstasting.api.room.entity;

import com.fearlesstasting.api.category.entity.Category;
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

/** 방 내 등록 식당. Category FK는 nullable — null이면 관리자 CMS 매핑 대기 상태. */
@Entity
@Table(
    name = "RoomRestaurant",
    uniqueConstraints = {
        @UniqueConstraint(name = "RoomRestaurant_roomId_name_address_key",
            columnNames = {"roomId", "name", "address"}),
    },
    indexes = {
        @Index(name = "RoomRestaurant_roomId_idx", columnList = "roomId"),
        @Index(name = "RoomRestaurant_addedById_idx", columnList = "addedById"),
        @Index(name = "RoomRestaurant_categoryId_idx", columnList = "categoryId"),
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoomRestaurant {

    @Id
    @Column(length = 30)
    private String id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 300)
    private String address;

    @Column(nullable = false, length = 50)
    private String province;

    @Column(nullable = false, length = 50)
    private String city;

    @Column(nullable = false, length = 100)
    private String neighborhood;

    @Column(nullable = false, length = 100)
    private String category;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column(name = "isClosed", nullable = false)
    private boolean isClosed;

    @Column(name = "isWishlist", nullable = false)
    private boolean isWishlist;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "roomId", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "addedById")
    private User addedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoryId")
    private Category categoryRef;

    @CreatedDate
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
    }

    @Builder
    private RoomRestaurant(Room room, User addedBy, String name, String address,
                           String province, String city, String neighborhood,
                           String category, Category categoryRef,
                           Double latitude, Double longitude, Boolean isWishlist) {
        this.room = room;
        this.addedBy = addedBy;
        this.name = name;
        this.address = address;
        this.province = province;
        this.city = city;
        this.neighborhood = neighborhood;
        this.category = category;
        this.categoryRef = categoryRef;
        this.latitude = latitude;
        this.longitude = longitude;
        this.isWishlist = isWishlist != null && isWishlist;
    }

    public void update(String name, String address, String province, String city,
                       String neighborhood, Double latitude, Double longitude, Boolean isClosed) {
        if (name != null) this.name = name;
        if (address != null) {
            this.address = address;
            this.province = province == null ? this.province : province;
            this.city = city == null ? this.city : city;
            this.neighborhood = neighborhood == null ? this.neighborhood : neighborhood;
        }
        if (latitude != null) this.latitude = latitude;
        if (longitude != null) this.longitude = longitude;
        if (isClosed != null) this.isClosed = isClosed;
    }

    public void assignCategory(String displayName, Category categoryRef) {
        this.category = displayName;
        this.categoryRef = categoryRef;
    }

    public void toggleWishlist(boolean isWishlist) {
        this.isWishlist = isWishlist;
    }
}
