package com.fearlesstasting.api.board.controller;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.board.entity.Comment;
import com.fearlesstasting.api.board.entity.Post;
import com.fearlesstasting.api.board.service.PostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "게시글")
@RestController
@RequestMapping("/boards/{slug}/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    public record PostView(String id, String title, String content,
                           String boardSlug,
                           String authorId, String authorNickname,
                           boolean isAnonymous,
                           LocalDateTime createdAt, LocalDateTime updatedAt) {
        static PostView from(Post p) {
            return new PostView(
                p.getId(), p.getTitle(), p.getContent(),
                p.getBoard().getSlug(),
                p.isAnonymous() ? null : p.getAuthor().getId(),
                p.isAnonymous() ? "익명" : p.getAuthor().getNickname(),
                p.isAnonymous(),
                p.getCreatedAt(), p.getUpdatedAt()
            );
        }
    }

    public record PostRestaurantReq(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 300) String address,
        @Size(max = 50) String category,
        Double latitude, Double longitude, String kakaoPlaceId
    ) {}

    public record CreatePostRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank String content,
        Boolean isAnonymous,
        List<@Valid PostRestaurantReq> restaurants
    ) {}

    public record UpdatePostRequest(@Size(max = 200) String title, String content) {}

    @Operation(summary = "게시글 목록")
    @GetMapping
    public Map<String, Object> list(@PathVariable String slug,
                                     @RequestParam(defaultValue = "1") int page,
                                     @RequestParam(defaultValue = "20") int pageSize) {
        Page<Post> p = postService.listByBoard(slug, page, pageSize);
        return Map.of(
            "data", p.getContent().stream().map(PostView::from).toList(),
            "total", p.getTotalElements(),
            "page", p.getNumber() + 1,
            "pageSize", p.getSize()
        );
    }

    @Operation(summary = "게시글 상세")
    @GetMapping("/{id}")
    public PostView detail(@PathVariable String slug, @PathVariable String id) {
        return PostView.from(postService.get(id));
    }

    @Operation(summary = "게시글 작성")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PostView> create(@PathVariable String slug,
                                            @CurrentUser AuthUserPrincipal principal,
                                            @Valid @RequestBody CreatePostRequest req) {
        List<PostService.PostRestaurantInput> restaurants = req.restaurants() == null
            ? List.of()
            : req.restaurants().stream().map(r -> new PostService.PostRestaurantInput(
                r.name(), r.address(), r.category(),
                r.latitude(), r.longitude(), r.kakaoPlaceId()
            )).toList();
        var created = postService.create(slug, principal.userId(), req.title(), req.content(),
            req.isAnonymous() != null && req.isAnonymous(), restaurants);
        return ResponseEntity.status(201).body(PostView.from(created));
    }

    @Operation(summary = "게시글 수정")
    @PatchMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public PostView update(@PathVariable String slug, @PathVariable String id,
                           @CurrentUser AuthUserPrincipal principal,
                           @Valid @RequestBody UpdatePostRequest req) {
        return PostView.from(postService.update(id, principal.userId(), req.title(), req.content()));
    }

    @Operation(summary = "게시글 삭제")
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> delete(@PathVariable String slug, @PathVariable String id,
                                        @CurrentUser AuthUserPrincipal principal) {
        postService.delete(id, principal.userId());
        return ResponseEntity.noContent().build();
    }

    // ─── 좋아요 / 북마크 ─────────────────────────────────────────────────

    @Operation(summary = "게시글 추천 토글")
    @PostMapping("/{id}/like")
    @PreAuthorize("isAuthenticated()")
    public PostService.LikeResult togglePostLike(@PathVariable String slug, @PathVariable String id,
                                                  @CurrentUser AuthUserPrincipal principal) {
        return postService.togglePostLike(id, principal.userId());
    }

    @Operation(summary = "북마크 토글")
    @PostMapping("/{id}/bookmark")
    @PreAuthorize("isAuthenticated()")
    public PostService.LikeResult toggleBookmark(@PathVariable String slug, @PathVariable String id,
                                                  @CurrentUser AuthUserPrincipal principal) {
        return postService.toggleBookmark(id, principal.userId());
    }

    // ─── 댓글 ────────────────────────────────────────────────────────────

    public record CommentView(String id, String content, String authorId, String authorNickname,
                              boolean isAnonymous, LocalDateTime createdAt) {
        static CommentView from(Comment c) {
            return new CommentView(
                c.getId(), c.getContent(),
                c.isAnonymous() ? null : c.getAuthor().getId(),
                c.isAnonymous() ? "익명" : c.getAuthor().getNickname(),
                c.isAnonymous(), c.getCreatedAt()
            );
        }
    }

    public record CommentRequest(@NotBlank String content, Boolean isAnonymous) {}

    @Operation(summary = "댓글 목록")
    @GetMapping("/{id}/comments")
    public List<CommentView> comments(@PathVariable String slug, @PathVariable String id) {
        return postService.listComments(id).stream().map(CommentView::from).toList();
    }

    @Operation(summary = "댓글 작성")
    @PostMapping("/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    public CommentView addComment(@PathVariable String slug, @PathVariable String id,
                                   @CurrentUser AuthUserPrincipal principal,
                                   @Valid @RequestBody CommentRequest req) {
        return CommentView.from(
            postService.addComment(id, principal.userId(), req.content(),
                req.isAnonymous() != null && req.isAnonymous())
        );
    }

    @Operation(summary = "댓글 삭제")
    @DeleteMapping("/{id}/comments/{commentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteComment(@PathVariable String slug, @PathVariable String id,
                                               @PathVariable String commentId,
                                               @CurrentUser AuthUserPrincipal principal) {
        postService.deleteComment(commentId, principal.userId());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "댓글 추천 토글")
    @PostMapping("/{id}/comments/{commentId}/like")
    @PreAuthorize("isAuthenticated()")
    public PostService.LikeResult toggleCommentLike(@PathVariable String slug, @PathVariable String id,
                                                     @PathVariable String commentId,
                                                     @CurrentUser AuthUserPrincipal principal) {
        return postService.toggleCommentLike(commentId, principal.userId());
    }
}
