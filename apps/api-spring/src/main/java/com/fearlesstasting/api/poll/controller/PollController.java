package com.fearlesstasting.api.poll.controller;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.common.ratelimit.RateLimit;
import com.fearlesstasting.api.poll.controller.dto.PollView;
import com.fearlesstasting.api.poll.service.PollService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "방 - 투표")
@RestController
@RequestMapping("/rooms/{roomId}/polls")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class PollController {

    private final PollService pollService;

    public record OptionRequest(
        @NotBlank @Size(max = 200) String label,
        String restaurantId
    ) {}

    public record CreatePollRequest(
        @NotBlank @Size(max = 200) String title,
        LocalDateTime endsAt,
        @NotNull @Size(min = 2, max = 10) List<@Valid OptionRequest> options
    ) {}

    @Operation(summary = "투표 생성")
    @PostMapping
    @RateLimit(capacity = 10, refillSeconds = 60)
    public ResponseEntity<PollView> create(
        @PathVariable String roomId,
        @CurrentUser AuthUserPrincipal principal,
        @Valid @RequestBody CreatePollRequest req
    ) {
        var opts = req.options().stream()
            .map(o -> new PollService.OptionInput(o.label(), o.restaurantId()))
            .toList();
        var detail = pollService.create(roomId, principal.userId(), req.title(), req.endsAt(), opts);
        return ResponseEntity.status(201).body(PollView.fromService(detail, roomId));
    }

    @Operation(summary = "투표 목록 (자동 마감 반영)")
    @GetMapping
    public List<PollView> list(@PathVariable String roomId,
                               @CurrentUser AuthUserPrincipal principal) {
        return pollService.list(roomId, principal.userId()).stream()
            .map(d -> PollView.fromService(d, roomId)).toList();
    }

    public record VoteRequest(@NotBlank String optionId) {}

    @Operation(summary = "옵션에 투표 (같은 옵션 재클릭 시 해제, 다른 옵션 클릭 시 교체)")
    @PostMapping("/{pollId}/vote")
    public PollView vote(
        @PathVariable String roomId,
        @PathVariable String pollId,
        @CurrentUser AuthUserPrincipal principal,
        @Valid @RequestBody VoteRequest req
    ) {
        var detail = pollService.vote(roomId, pollId, req.optionId(), principal.userId());
        return PollView.fromService(detail, roomId);
    }

    @Operation(summary = "투표 마감 (생성자만)")
    @PatchMapping("/{pollId}/close")
    public PollView close(
        @PathVariable String roomId,
        @PathVariable String pollId,
        @CurrentUser AuthUserPrincipal principal
    ) {
        var detail = pollService.close(roomId, pollId, principal.userId());
        return PollView.fromService(detail, roomId);
    }
}
