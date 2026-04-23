package com.fearlesstasting.api.admin.entity;

import com.fearlesstasting.api.common.util.CuidGenerator;
import com.fearlesstasting.api.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** 관리자가 생성하는 데모 계정 인덱스 (User 1:1 + memo). */
@Entity
@Table(name = "DemoAccount")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DemoAccount {

    @Id @Column(length = 30) private String id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "userId", nullable = false, unique = true)
    private User user;

    @Column(length = 200) private String memo;

    @CreatedDate
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() { if (this.id == null) this.id = CuidGenerator.generate(); }

    @Builder
    private DemoAccount(User user, String memo) {
        this.user = user;
        this.memo = memo;
    }

    public void updateMemo(String memo) { this.memo = memo; }
}
