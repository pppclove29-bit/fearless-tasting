package com.fearlesstasting.api.board.repository;

import com.fearlesstasting.api.board.entity.Comment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CommentRepository extends JpaRepository<Comment, String> {

    @Query("""
        select c from Comment c
        join fetch c.author
        where c.post.id = :postId
        order by c.createdAt asc
        """)
    List<Comment> findAllByPostIdWithAuthor(String postId);

    long countByPostId(String postId);
}
