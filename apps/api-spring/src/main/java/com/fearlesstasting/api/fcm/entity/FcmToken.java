package com.fearlesstasting.api.fcm.entity;

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
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** FCM 디바이스 토큰. 같은 유저 여러 디바이스 보유 가능. */
@Entity
@Table(
    name = "FcmToken",
    indexes = {
        @Index(name = "FcmToken_userId_idx", columnList = "userId"),
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FcmToken extends BaseTimeEntity {

    @Id
    @Column(length = 30)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @Column(nullable = false, unique = true, length = 500)
    private String token;

    @Column(length = 200)
    private String device;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
    }

    @Builder
    private FcmToken(User user, String token, String device) {
        this.user = user;
        this.token = token;
        this.device = device;
    }
}
