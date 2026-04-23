package com.fearlesstasting.api.category.entity;

import com.fearlesstasting.api.common.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 카테고리 매핑 규칙 (원본 문자열 → Category). */
@Entity
@Table(
    name = "CategoryMapping",
    indexes = {
        @Index(name = "CategoryMapping_categoryId_idx", columnList = "categoryId"),
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CategoryMapping extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "rawInput", nullable = false, unique = true, length = 200)
    private String rawInput;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "categoryId", nullable = false)
    private Category category;

    @Builder
    private CategoryMapping(String rawInput, Category category) {
        this.rawInput = rawInput;
        this.category = category;
    }

    public void reassign(Category category) {
        this.category = category;
    }
}
