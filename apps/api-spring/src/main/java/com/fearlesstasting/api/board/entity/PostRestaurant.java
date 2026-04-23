package com.fearlesstasting.api.board.entity;

import com.fearlesstasting.api.common.util.CuidGenerator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 게시글에 태그된 식당 스냅샷 (RoomRestaurant FK가 아닌 독립 데이터). */
@Entity
@Table(
    name = "PostRestaurant",
    indexes = { @Index(name = "PostRestaurant_postId_idx", columnList = "postId") }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostRestaurant {

    @Id @Column(length = 30) private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "postId", nullable = false)
    private Post post;

    @Column(nullable = false, length = 100) private String name;
    @Column(nullable = false, length = 300) private String address;
    @Column(length = 50)                    private String category;
    @Column                                  private Double latitude;
    @Column                                  private Double longitude;
    @Column(name = "kakaoPlaceId", length = 50) private String kakaoPlaceId;

    @PrePersist
    void prePersist() { if (this.id == null) this.id = CuidGenerator.generate(); }

    @Builder
    private PostRestaurant(Post post, String name, String address, String category,
                            Double latitude, Double longitude, String kakaoPlaceId) {
        this.post = post;
        this.name = name;
        this.address = address;
        this.category = category;
        this.latitude = latitude;
        this.longitude = longitude;
        this.kakaoPlaceId = kakaoPlaceId;
    }
}
