package com.fearlesstasting.api.board.controller;

import com.fearlesstasting.api.board.entity.Board;
import com.fearlesstasting.api.board.service.BoardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "게시판")
@RestController
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    public record BoardView(String id, String name, String slug, String description,
                            int sortOrder, boolean enabled, int popularThreshold) {
        static BoardView from(Board b) {
            return new BoardView(b.getId(), b.getName(), b.getSlug(), b.getDescription(),
                b.getSortOrder(), b.isEnabled(), b.getPopularThreshold());
        }
    }

    @Operation(summary = "게시판 목록 (공개)")
    @GetMapping("/boards")
    public List<BoardView> list() {
        return boardService.listPublic().stream().map(BoardView::from).toList();
    }

    @Operation(summary = "게시판 상세")
    @GetMapping("/boards/{slug}")
    public BoardView detail(@PathVariable String slug) {
        return BoardView.from(boardService.getBySlug(slug));
    }
}
