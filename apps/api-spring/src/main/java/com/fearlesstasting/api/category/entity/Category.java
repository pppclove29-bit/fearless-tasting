package com.fearlesstasting.api.category.entity;

import com.fearlesstasting.api.common.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 식당 카테고리 (관리자 CMS 관리). 기존 Prisma의 Category 모델과 호환. */
@Entity
@Table(
    name = "Category",
    indexes = {
        @Index(name = "Category_isActive_displayOrder_idx", columnList = "isActive, displayOrder"),
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Category extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(length = 10)
    private String emoji;

    @Column(name = "displayOrder", nullable = false)
    private int displayOrder;

    @Column(name = "isActive", nullable = false)
    private boolean isActive;

    @Builder
    private Category(String name, String emoji, Integer displayOrder, Boolean isActive) {
        this.name = name;
        this.emoji = emoji;
        this.displayOrder = displayOrder == null ? 999 : displayOrder;
        this.isActive = isActive == null ? true : isActive;
    }

    public void update(String name, String emoji, Integer displayOrder, Boolean isActive) {
        if (name != null) this.name = name;
        if (emoji != null) this.emoji = emoji.isBlank() ? null : emoji;
        if (displayOrder != null) this.displayOrder = displayOrder;
        if (isActive != null) this.isActive = isActive;
    }
}
