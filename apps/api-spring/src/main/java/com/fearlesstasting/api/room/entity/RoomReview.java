package com.fearlesstasting.api.room.entity;

import com.fearlesstasting.api.common.entity.BaseTimeEntity;
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

/** 방문당 1인 1리뷰. 종합 평점 + 세부 평점 5종 + 메뉴 2종 + 이미지(JSON). */
@Entity
@Table(
    name = "RoomReview",
    uniqueConstraints = {
        @UniqueConstraint(name = "RoomReview_visitId_userId_key", columnNames = {"visitId", "userId"}),
    },
    indexes = {
        @Index(name = "RoomReview_userId_idx", columnList = "userId"),
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoomReview extends BaseTimeEntity {

    @Id
    @Column(length = 30)
    private String id;

    @Column(nullable = false)
    private double rating;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "wouldRevisit", nullable = false)
    private int wouldRevisit;

    @Column(name = "tasteRating") private Double tasteRating;
    @Column(name = "valueRating") private Double valueRating;
    @Column(name = "serviceRating") private Double serviceRating;
    @Column(name = "cleanlinessRating") private Double cleanlinessRating;
    @Column(name = "accessibilityRating") private Double accessibilityRating;

    @Column(name = "favoriteMenu", length = 200) private String favoriteMenu;
    @Column(name = "tryNextMenu", length = 200)  private String tryNextMenu;

    @Column(columnDefinition = "TEXT")
    private String images;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visitId", nullable = false)
    private RoomVisit visit;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
        if (this.wouldRevisit == 0) this.wouldRevisit = 4;
    }

    @Builder
    private RoomReview(RoomVisit visit, User user, double rating, String content,
                       Integer wouldRevisit,
                       Double tasteRating, Double valueRating, Double serviceRating,
                       Double cleanlinessRating, Double accessibilityRating,
                       String favoriteMenu, String tryNextMenu, String images) {
        this.visit = visit;
        this.user = user;
        this.rating = rating;
        this.content = content == null ? "" : content;
        this.wouldRevisit = wouldRevisit == null ? 4 : wouldRevisit;
        this.tasteRating = tasteRating;
        this.valueRating = valueRating;
        this.serviceRating = serviceRating;
        this.cleanlinessRating = cleanlinessRating;
        this.accessibilityRating = accessibilityRating;
        this.favoriteMenu = favoriteMenu;
        this.tryNextMenu = tryNextMenu;
        this.images = images;
    }

    public void update(double rating, String content, Integer wouldRevisit,
                       Double tasteRating, Double valueRating, Double serviceRating,
                       Double cleanlinessRating, Double accessibilityRating,
                       String favoriteMenu, String tryNextMenu, String images) {
        this.rating = rating;
        this.content = content == null ? "" : content;
        if (wouldRevisit != null) this.wouldRevisit = wouldRevisit;
        this.tasteRating = tasteRating;
        this.valueRating = valueRating;
        this.serviceRating = serviceRating;
        this.cleanlinessRating = cleanlinessRating;
        this.accessibilityRating = accessibilityRating;
        this.favoriteMenu = favoriteMenu;
        this.tryNextMenu = tryNextMenu;
        this.images = images;
    }
}
