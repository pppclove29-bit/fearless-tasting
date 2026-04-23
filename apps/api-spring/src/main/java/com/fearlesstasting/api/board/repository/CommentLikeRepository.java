package com.fearlesstasting.api.board.repository;

import com.fearlesstasting.api.board.entity.CommentLike;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentLikeRepository extends JpaRepository<CommentLike, String> {
    Optional<CommentLike> findByCommentIdAndUserId(String commentId, String userId);
    long countByCommentId(String commentId);
    void deleteByCommentIdAndUserId(String commentId, String userId);
}
