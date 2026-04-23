package com.fearlesstasting.api.board.repository;

import com.fearlesstasting.api.board.entity.PostBookmark;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostBookmarkRepository extends JpaRepository<PostBookmark, String> {
    Optional<PostBookmark> findByPostIdAndUserId(String postId, String userId);
    long countByPostId(String postId);
    void deleteByPostIdAndUserId(String postId, String userId);
}
