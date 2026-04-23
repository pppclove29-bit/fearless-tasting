package com.fearlesstasting.api.room.controller;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.room.controller.dto.CreateVisitRequest;
import com.fearlesstasting.api.room.controller.dto.UpdateVisitRequest;
import com.fearlesstasting.api.room.controller.dto.VisitResponse;
import com.fearlesstasting.api.room.service.RoomVisitService;
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

@Tag(name = "방 - 방문")
@RestController
@RequestMapping("/rooms/{roomId}")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class RoomVisitController {

    private final RoomVisitService visitService;

    @Operation(summary = "방문 목록 (식당별)")
    @GetMapping("/restaurants/{restaurantId}/visits")
    public List<VisitResponse> list(@PathVariable String roomId,
                                    @PathVariable String restaurantId,
                                    @CurrentUser AuthUserPrincipal principal) {
        return visitService.list(roomId, restaurantId, principal.userId()).stream()
            .map(VisitResponse::from).toList();
    }

    @Operation(summary = "방문 기록 등록")
    @PostMapping("/restaurants/{restaurantId}/visits")
    public ResponseEntity<VisitResponse> create(@PathVariable String roomId,
                                                 @PathVariable String restaurantId,
                                                 @CurrentUser AuthUserPrincipal principal,
                                                 @Valid @RequestBody CreateVisitRequest req) {
        var visit = visitService.create(roomId, restaurantId, principal.userId(),
            req.visitedAt(), req.memo(), req.waitTime(), req.isDelivery(),
            req.participantUserIds());
        return ResponseEntity.status(201).body(VisitResponse.from(visit));
    }

    @Operation(summary = "방문 기록 수정")
    @PatchMapping("/visits/{visitId}")
    public VisitResponse update(@PathVariable String roomId,
                                @PathVariable String visitId,
                                @CurrentUser AuthUserPrincipal principal,
                                @Valid @RequestBody UpdateVisitRequest req) {
        return VisitResponse.from(
            visitService.update(roomId, visitId, principal.userId(),
                req.visitedAt(), req.memo(), req.waitTime(), req.participantUserIds())
        );
    }

    @Operation(summary = "방문 기록 삭제")
    @DeleteMapping("/visits/{visitId}")
    public ResponseEntity<Void> delete(@PathVariable String roomId,
                                        @PathVariable String visitId,
                                        @CurrentUser AuthUserPrincipal principal) {
        visitService.delete(roomId, visitId, principal.userId());
        return ResponseEntity.noContent().build();
    }
}
