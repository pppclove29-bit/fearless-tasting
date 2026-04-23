package com.fearlesstasting.api.board.entity;

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

@Entity
@Table(
    name = "Post",
    indexes = {
        @Index(name = "Post_boardId_createdAt_idx", columnList = "boardId, createdAt"),
        @Index(name = "Post_authorId_idx", columnList = "authorId"),
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Post extends BaseTimeEntity {

    @Id @Column(length = 30) private String id;

    @Column(nullable = false, length = 200) private String title;

    @Column(nullable = false, columnDefinition = "TEXT") private String content;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "boardId", nullable = false)
    private Board board;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "authorId", nullable = false)
    private User author;

    @Column(name = "isAnonymous", nullable = false) private boolean isAnonymous;

    @PrePersist
    void prePersist() {
        if (this.id == null) this.id = CuidGenerator.generate();
    }

    @Builder
    private Post(Board board, User author, String title, String content, Boolean isAnonymous) {
        this.board = board;
        this.author = author;
        this.title = title;
        this.content = content;
        this.isAnonymous = isAnonymous != null && isAnonymous;
    }

    public void update(String title, String content) {
        if (title != null) this.title = title;
        if (content != null) this.content = content;
    }
}
