package com.fearlesstasting.api.room.controller;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.room.controller.dto.ReviewRequest;
import com.fearlesstasting.api.room.controller.dto.ReviewResponse;
import com.fearlesstasting.api.room.service.RoomReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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

@Tag(name = "방 - 리뷰")
@RestController
@RequestMapping("/rooms/{roomId}")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class RoomReviewController {

    private final RoomReviewService reviewService;

    @Operation(summary = "방문의 리뷰 목록")
    @GetMapping("/visits/{visitId}/reviews")
    public List<ReviewResponse> list(@PathVariable String roomId,
                                     @PathVariable String visitId,
                                     @CurrentUser AuthUserPrincipal principal) {
        return reviewService.listForVisit(roomId, visitId, principal.userId()).stream()
            .map(ReviewResponse::from).toList();
    }

    @Operation(summary = "리뷰 작성 (방문당 1인 1회)")
    @PostMapping("/visits/{visitId}/reviews")
    public ResponseEntity<ReviewResponse> create(@PathVariable String roomId,
                                                 @PathVariable String visitId,
                                                 @CurrentUser AuthUserPrincipal principal,
                                                 @Valid @RequestBody ReviewRequest req) {
        var cmd = toCommand(req);
        var created = reviewService.create(roomId, visitId, principal.userId(), cmd);
        return ResponseEntity.status(201).body(ReviewResponse.from(created));
    }

    @Operation(summary = "리뷰 수정 (본인)")
    @PatchMapping("/reviews/{reviewId}")
    public ReviewResponse update(@PathVariable String roomId,
                                 @PathVariable String reviewId,
                                 @CurrentUser AuthUserPrincipal principal,
                                 @Valid @RequestBody ReviewRequest req) {
        return ReviewResponse.from(
            reviewService.update(roomId, reviewId, principal.userId(), toCommand(req))
        );
    }

    @Operation(summary = "리뷰 삭제 (본인)")
    @DeleteMapping("/reviews/{reviewId}")
    public ResponseEntity<Void> delete(@PathVariable String roomId,
                                        @PathVariable String reviewId,
                                        @CurrentUser AuthUserPrincipal principal) {
        reviewService.delete(roomId, reviewId, principal.userId());
        return ResponseEntity.noContent().build();
    }

    private RoomReviewService.ReviewCommand toCommand(ReviewRequest req) {
        return new RoomReviewService.ReviewCommand(
            req.rating(), req.content(), req.wouldRevisit(),
            req.tasteRating(), req.valueRating(), req.serviceRating(),
            req.cleanlinessRating(), req.accessibilityRating(),
            req.favoriteMenu(), req.tryNextMenu(), req.images()
        );
    }
}
