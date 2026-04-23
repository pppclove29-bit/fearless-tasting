package com.fearlesstasting.api.board.repository;

import com.fearlesstasting.api.board.entity.PostLike;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostLikeRepository extends JpaRepository<PostLike, String> {
    Optional<PostLike> findByPostIdAndUserId(String postId, String userId);
    long countByPostId(String postId);
    void deleteByPostIdAndUserId(String postId, String userId);
}
