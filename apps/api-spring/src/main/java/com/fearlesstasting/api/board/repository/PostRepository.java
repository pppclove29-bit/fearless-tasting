package com.fearlesstasting.api.board.repository;

import com.fearlesstasting.api.board.entity.Post;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PostRepository extends JpaRepository<Post, String> {

    @Query(value = """
        select p from Post p
        join fetch p.author
        join fetch p.board
        where p.board.id = :boardId
        order by p.createdAt desc
        """,
        countQuery = "select count(p) from Post p where p.board.id = :boardId")
    Page<Post> findByBoardIdWithAuthor(String boardId, Pageable pageable);

    @Query("""
        select p from Post p
        join fetch p.author
        join fetch p.board
        where p.id = :id
        """)
    Optional<Post> findByIdWithAuthor(String id);
}
