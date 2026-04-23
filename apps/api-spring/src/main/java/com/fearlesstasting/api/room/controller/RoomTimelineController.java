package com.fearlesstasting.api.room.controller;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.room.service.RoomTimelineService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "방 - 타임라인")
@RestController
@RequestMapping("/rooms/{roomId}/timeline")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class RoomTimelineController {

    private final RoomTimelineService timelineService;

    @Operation(summary = "방 활동 타임라인 (방문/리뷰 최근 50개)")
    @GetMapping
    public List<RoomTimelineService.TimelineItem> timeline(
        @PathVariable String roomId, @CurrentUser AuthUserPrincipal principal
    ) {
        return timelineService.timeline(roomId, principal.userId());
    }
}
