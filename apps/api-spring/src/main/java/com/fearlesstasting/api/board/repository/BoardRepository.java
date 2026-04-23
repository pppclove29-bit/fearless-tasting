package com.fearlesstasting.api.board.repository;

import com.fearlesstasting.api.board.entity.Board;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardRepository extends JpaRepository<Board, String> {
    Optional<Board> findBySlug(String slug);
    boolean existsBySlug(String slug);
    List<Board> findAllByEnabledTrueOrderBySortOrderAscCreatedAtAsc();
    List<Board> findAllByOrderBySortOrderAscCreatedAtAsc();
}
