package com.fearlesstasting.api.auth.entity;

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

/**
 * OAuth 계정 정보. 동일 provider + providerId 조합 유일.
 * User와 다대일 관계 (한 유저가 여러 소셜 계정 연결 가능).
 */
@Entity
@Table(
    name = "Account",
    uniqueConstraints = {
        @UniqueConstraint(name = "Account_provider_providerId_key", columnNames = {"provider", "providerId"}),
    },
    indexes = {
        @Index(name = "Account_userId_idx", columnList = "userId"),
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Account extends BaseTimeEntity {

    @Id
    @Column(length = 30)
    private String id;

    @Column(nullable = false, length = 20)
    private String provider;

    @Column(name = "providerId", nullable = false, length = 191)
    private String providerId;

    @Column(name = "refreshToken", columnDefinition = "TEXT")
    private String refreshToken;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "userId", nullable = false,
        foreignKey = @jakarta.persistence.ForeignKey(name = "Account_userId_fkey"))
    private User user;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
    }

    @Builder
    private Account(String provider, String providerId, User user) {
        this.provider = provider;
        this.providerId = providerId;
        this.user = user;
    }

    public void updateRefreshToken(String hashed) {
        this.refreshToken = hashed;
    }
}
