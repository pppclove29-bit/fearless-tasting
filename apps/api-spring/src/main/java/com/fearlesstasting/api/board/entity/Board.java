package com.fearlesstasting.api.board.entity;

import com.fearlesstasting.api.common.entity.BaseTimeEntity;
import com.fearlesstasting.api.common.util.CuidGenerator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "Board")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Board extends BaseTimeEntity {

    @Id @Column(length = 30) private String id;

    @Column(nullable = false, length = 50) private String name;

    @Column(nullable = false, unique = true, length = 50) private String slug;

    @Column(length = 200) private String description;

    @Column(name = "sortOrder", nullable = false) private int sortOrder;

    @Column(nullable = false) private boolean enabled;

    @Column(name = "popularThreshold", nullable = false) private int popularThreshold;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
    }

    @Builder
    private Board(String name, String slug, String description, Integer sortOrder,
                  Boolean enabled, Integer popularThreshold) {
        this.name = name;
        this.slug = slug;
        this.description = description;
        this.sortOrder = sortOrder == null ? 0 : sortOrder;
        this.enabled = enabled == null ? true : enabled;
        this.popularThreshold = popularThreshold == null ? 5 : popularThreshold;
    }

    public void update(String name, String slug, String description, Integer sortOrder,
                       Boolean enabled, Integer popularThreshold) {
        if (name != null) this.name = name;
        if (slug != null) this.slug = slug;
        if (description != null) this.description = description;
        if (sortOrder != null) this.sortOrder = sortOrder;
        if (enabled != null) this.enabled = enabled;
        if (popularThreshold != null) this.popularThreshold = popularThreshold;
    }
}
