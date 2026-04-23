package com.fearlesstasting.api.notice.controller;

import com.fearlesstasting.api.notice.entity.Notice;
import com.fearlesstasting.api.notice.service.NoticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
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

@Tag(name = "공지")
@RestController
@RequestMapping
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService service;

    public record NoticeView(String id, String title, String content, boolean enabled,
                             int sortOrder, LocalDateTime createdAt, LocalDateTime updatedAt) {
        static NoticeView from(Notice n) {
            return new NoticeView(n.getId(), n.getTitle(), n.getContent(), n.isEnabled(),
                n.getSortOrder(), n.getCreatedAt(), n.getUpdatedAt());
        }
    }

    public record CreateRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank String content,
        Boolean enabled,
        Integer sortOrder
    ) {}

    public record UpdateRequest(
        @Size(max = 200) String title,
        String content,
        Boolean enabled,
        Integer sortOrder
    ) {}

    // ─── 공개 ───
    @Operation(summary = "활성 공지 목록")
    @GetMapping("/notices")
    public List<NoticeView> listPublic() {
        return service.listPublic().stream().map(NoticeView::from).toList();
    }

    // ─── 관리자 ───
    @Operation(summary = "전체 공지 목록 (관리자)")
    @GetMapping("/admin/notices")
    @PreAuthorize("hasRole('ADMIN')")
    public List<NoticeView> listAll() {
        return service.listAll().stream().map(NoticeView::from).toList();
    }

    @Operation(summary = "공지 생성")
    @PostMapping("/admin/notices")
    @PreAuthorize("hasRole('ADMIN')")
    public NoticeView create(@Valid @RequestBody CreateRequest req) {
        return NoticeView.from(service.create(req.title(), req.content(), req.enabled(), req.sortOrder()));
    }

    @Operation(summary = "공지 수정")
    @PatchMapping("/admin/notices/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public NoticeView update(@PathVariable String id, @Valid @RequestBody UpdateRequest req) {
        return NoticeView.from(service.update(id, req.title(), req.content(), req.enabled(), req.sortOrder()));
    }

    @Operation(summary = "공지 삭제")
    @DeleteMapping("/admin/notices/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
