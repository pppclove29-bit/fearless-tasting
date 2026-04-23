package com.fearlesstasting.api.room.controller;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.room.service.RoomStatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "방 - 통계")
@RestController
@RequestMapping("/rooms/{roomId}/stats")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class RoomStatsController {

    private final RoomStatsService statsService;

    @Operation(summary = "방 통계 (요약 + 카테고리 분포)")
    @GetMapping
    public RoomStatsService.RoomStatsResponse stats(@PathVariable String roomId,
                                                     @CurrentUser AuthUserPrincipal principal) {
        return statsService.getStats(roomId, principal.userId());
    }
}
