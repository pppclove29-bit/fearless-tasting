package com.fearlesstasting.api.notice.entity;

import com.fearlesstasting.api.common.entity.BaseTimeEntity;
import com.fearlesstasting.api.common.util.CuidGenerator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 서비스 공지. 활성 상태만 공개 노출, sortOrder 오름차순. */
@Entity
@Table(
    name = "Notice",
    indexes = { @Index(name = "Notice_enabled_sortOrder_idx", columnList = "enabled, sortOrder") }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notice extends BaseTimeEntity {

    @Id
    @Column(length = 30)
    private String id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "sortOrder", nullable = false)
    private int sortOrder;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
    }

    @Builder
    private Notice(String title, String content, Boolean enabled, Integer sortOrder) {
        this.title = title;
        this.content = content;
        this.enabled = enabled == null ? true : enabled;
        this.sortOrder = sortOrder == null ? 0 : sortOrder;
    }

    public void update(String title, String content, Boolean enabled, Integer sortOrder) {
        if (title != null) this.title = title;
        if (content != null) this.content = content;
        if (enabled != null) this.enabled = enabled;
        if (sortOrder != null) this.sortOrder = sortOrder;
    }
}
