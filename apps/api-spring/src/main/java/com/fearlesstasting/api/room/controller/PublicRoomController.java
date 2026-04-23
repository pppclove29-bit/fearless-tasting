package com.fearlesstasting.api.room.controller;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.room.controller.dto.RoomResponse;
import com.fearlesstasting.api.room.service.PublicRoomService;
import com.fearlesstasting.api.room.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 공개 방 열람 — 비로그인 접근 허용. SecurityConfig에 `/rooms/public/**` permitAll 적용됨. */
@Tag(name = "공개 방")
@RestController
@RequestMapping("/rooms/public")
@RequiredArgsConstructor
public class PublicRoomController {

    private final PublicRoomService service;
    private final RoomService roomService;

    @Operation(summary = "공개 방 목록")
    @GetMapping
    public List<PublicRoomService.PublicRoomCard> list() {
        return service.list();
    }

    @Operation(summary = "공개 방 sitemap용 ID 목록")
    @GetMapping("/sitemap-ids")
    public List<String> sitemapIds() {
        return service.sitemapIds();
    }

    @Operation(summary = "공개 방 상세")
    @GetMapping("/{id}")
    public PublicRoomService.PublicRoomDetail detail(@PathVariable String id) {
        return service.detail(id);
    }

    @Operation(summary = "공개 방의 식당 상세 (익명 리뷰)")
    @GetMapping("/{id}/restaurants/{rid}")
    public PublicRoomService.PublicRestaurantDetail restaurantDetail(
        @PathVariable String id, @PathVariable String rid
    ) {
        return service.restaurantDetail(id, rid);
    }

    @Operation(summary = "공개 방 참여 (로그인 필수, 초대 코드 불필요)")
    @PostMapping("/{id}/join")
    @PreAuthorize("isAuthenticated()")
    public RoomResponse join(@PathVariable String id, @CurrentUser AuthUserPrincipal principal) {
        return RoomResponse.from(roomService.joinPublicRoom(id, principal.userId()));
    }
}
