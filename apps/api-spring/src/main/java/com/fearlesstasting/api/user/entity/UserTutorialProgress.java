package com.fearlesstasting.api.user.entity;

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
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 유저별 튜토리얼 진행 (코치마크 완료 기록). */
@Entity
@Table(
    name = "UserTutorialProgress",
    uniqueConstraints = {
        @UniqueConstraint(name = "UserTutorialProgress_userId_tutorialKey_key", columnNames = {"userId", "tutorialKey"}),
    },
    indexes = { @Index(name = "UserTutorialProgress_userId_idx", columnList = "userId") }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserTutorialProgress {

    @Id
    @Column(length = 30)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @Column(name = "tutorialKey", nullable = false, length = 50)
    private String tutorialKey;

    @Column(name = "completedAt", nullable = false)
    private LocalDateTime completedAt;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
        if (this.completedAt == null) this.completedAt = LocalDateTime.now();
    }

    @Builder
    private UserTutorialProgress(User user, String tutorialKey) {
        this.user = user;
        this.tutorialKey = tutorialKey;
    }
}
