package com.fearlesstasting.api.user.entity;

import com.fearlesstasting.api.common.entity.BaseTimeEntity;
import com.fearlesstasting.api.common.util.CuidGenerator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 서비스 사용자. OAuth 인증 정보는 Account에 분리.
 * 기존 Prisma schema의 User 모델과 1:1 매핑.
 */
@Entity
@Table(
    name = "User",
    indexes = {
        @Index(name = "User_lastActiveAt_idx", columnList = "lastActiveAt"),
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseTimeEntity {

    @Id
    @Column(length = 30)
    private String id;

    @Column(nullable = false, unique = true, length = 191)
    private String email;

    @Column(nullable = false, unique = true, length = 191)
    private String nickname;

    @Column(name = "profileImageUrl", length = 500)
    private String profileImageUrl;

    @Column(nullable = false, length = 10)
    private String role;

    @Column(name = "pushEnabled", nullable = false)
    private boolean pushEnabled;

    @Column(name = "lastActiveAt")
    private LocalDateTime lastActiveAt;

    @Column(name = "onboardingCompletedAt")
    private LocalDateTime onboardingCompletedAt;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
        if (this.role == null) this.role = "user";
    }

    @Builder
    private User(String email, String nickname, String profileImageUrl, String role, boolean pushEnabled) {
        this.email = email;
        this.nickname = nickname;
        this.profileImageUrl = profileImageUrl;
        this.role = role == null ? "user" : role;
        this.pushEnabled = pushEnabled;
    }

    public void updateNickname(String nickname) {
        this.nickname = nickname;
    }

    public void updateProfileImage(String url) {
        this.profileImageUrl = url;
    }

    public void markActive() {
        this.lastActiveAt = LocalDateTime.now();
    }

    public void completeOnboarding() {
        if (this.onboardingCompletedAt == null) {
            this.onboardingCompletedAt = LocalDateTime.now();
        }
    }

    public void updatePushEnabled(boolean enabled) {
        this.pushEnabled = enabled;
    }

    public void applyRole(String role) {
        this.role = role;
    }

    public boolean isAdmin() {
        return "admin".equals(this.role);
    }
}
