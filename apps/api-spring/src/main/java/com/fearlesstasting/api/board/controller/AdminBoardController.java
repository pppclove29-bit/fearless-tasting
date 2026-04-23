package com.fearlesstasting.api.board.controller;

import com.fearlesstasting.api.board.controller.BoardController.BoardView;
import com.fearlesstasting.api.board.service.BoardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 - 게시판")
@RestController
@RequestMapping("/admin/boards")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminBoardController {

    private final BoardService boardService;

    public record CreateBoardRequest(
        @NotBlank @Size(max = 50)  String name,
        @NotBlank @Size(max = 50)  String slug,
        @Size(max = 200)           String description,
        Integer sortOrder, Boolean enabled, Integer popularThreshold
    ) {}

    public record UpdateBoardRequest(
        @Size(max = 50)  String name,
        @Size(max = 50)  String slug,
        @Size(max = 200) String description,
        Integer sortOrder, Boolean enabled, Integer popularThreshold
    ) {}

    @Operation(summary = "전체 게시판 목록 (관리자)")
    @GetMapping
    public List<BoardView> list() {
        return boardService.listAll().stream().map(BoardView::from).toList();
    }

    @Operation(summary = "게시판 생성")
    @PostMapping
    public BoardView create(@Valid @RequestBody CreateBoardRequest req) {
        return BoardView.from(boardService.create(
            req.name(), req.slug(), req.description(),
            req.sortOrder(), req.enabled(), req.popularThreshold()
        ));
    }

    @Operation(summary = "게시판 수정")
    @PatchMapping("/{id}")
    public BoardView update(@PathVariable String id, @Valid @RequestBody UpdateBoardRequest req) {
        return BoardView.from(boardService.update(
            id, req.name(), req.slug(), req.description(),
            req.sortOrder(), req.enabled(), req.popularThreshold()
        ));
    }

    @Operation(summary = "게시판 삭제")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        boardService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
