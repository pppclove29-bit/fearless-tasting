package com.fearlesstasting.api.room.controller;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.common.ratelimit.RateLimit;
import com.fearlesstasting.api.room.controller.dto.CreateRoomRequest;
import com.fearlesstasting.api.room.controller.dto.JoinRoomRequest;
import com.fearlesstasting.api.room.controller.dto.RoomDetailResponse;
import com.fearlesstasting.api.room.controller.dto.RoomListItemResponse;
import com.fearlesstasting.api.room.controller.dto.RoomResponse;
import com.fearlesstasting.api.room.controller.dto.UpdateRoomRequest;
import com.fearlesstasting.api.room.entity.Room;
import com.fearlesstasting.api.room.entity.RoomMember;
import com.fearlesstasting.api.room.entity.RoomRestaurant;
import com.fearlesstasting.api.room.repository.RoomMemberRepository;
import com.fearlesstasting.api.room.repository.RoomRestaurantRepository;
import com.fearlesstasting.api.room.repository.RoomReviewRepository;
import com.fearlesstasting.api.room.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "방")
@RestController
@RequestMapping("/rooms")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class RoomController {

    private final RoomService roomService;
    private final RoomMemberRepository memberRepository;
    private final RoomRestaurantRepository restaurantRepository;
    private final RoomReviewRepository reviewRepository;

    @Operation(summary = "방 생성")
    @PostMapping
    @RateLimit(capacity = 10, refillSeconds = 60)
    public RoomResponse create(@CurrentUser AuthUserPrincipal principal,
                               @Valid @RequestBody CreateRoomRequest req) {
        var defaults = RoomService.RoomCreateOptions.defaults();
        var opts = new RoomService.RoomCreateOptions(
            req.isPublic() == null ? defaults.isPublic() : req.isPublic(),
            req.maxMembers() == null ? defaults.maxMembers() : req.maxMembers(),
            req.tabWishlistEnabled() == null ? defaults.tabWishlistEnabled() : req.tabWishlistEnabled(),
            req.tabRegionEnabled() == null ? defaults.tabRegionEnabled() : req.tabRegionEnabled(),
            req.tabPollEnabled() == null ? defaults.tabPollEnabled() : req.tabPollEnabled(),
            req.tabStatsEnabled() == null ? defaults.tabStatsEnabled() : req.tabStatsEnabled()
        );
        Room room = roomService.create(principal.userId(), req.name(), opts);
        return RoomResponse.from(room);
    }

    @Operation(summary = "내 방 목록 (myRole/memberCount/restaurantCount 포함)")
    @GetMapping
    public List<RoomListItemResponse> myRooms(@CurrentUser AuthUserPrincipal principal) {
        return roomService.listMyRoomsWithCounts(principal.userId()).stream()
            .map(b -> RoomListItemResponse.from(b.room(), b.myRole(), b.memberCount(), b.restaurantCount()))
            .toList();
    }

    @Operation(summary = "방 상세 (members+restaurants nested)")
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public RoomDetailResponse get(@PathVariable String id, @CurrentUser AuthUserPrincipal principal) {
        Room room = roomService.get(id, principal.userId());

        List<RoomDetailResponse.MemberInfo> members = memberRepository.findAllByRoomIdWithUser(id).stream()
            .map(this::toMemberInfo).toList();

        List<RoomRestaurant> restaurants = restaurantRepository.findAllByRoomIdWithCategory(id);
        Map<String, long[]> aggMap = reviewAggregates(restaurants);
        List<RoomDetailResponse.RestaurantInfoView> restaurantViews = restaurants.stream()
            .map(r -> toRestaurantInfoView(r, aggMap)).toList();

        return RoomDetailResponse.build(room, members, restaurantViews);
    }

    @Operation(summary = "방 설정 수정 (owner)")
    @PatchMapping("/{id}")
    public RoomResponse update(@PathVariable String id, @CurrentUser AuthUserPrincipal principal,
                               @Valid @RequestBody UpdateRoomRequest req) {
        var opts = new RoomService.RoomUpdateOptions(
            req.name(), req.announcement(), req.maxMembers(), req.isPublic(),
            req.tabWishlistEnabled(), req.tabRegionEnabled(),
            req.tabPollEnabled(), req.tabStatsEnabled()
        );
        return RoomResponse.from(roomService.update(id, principal.userId(), opts));
    }

    @Operation(summary = "방 삭제 (owner)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, @CurrentUser AuthUserPrincipal principal) {
        roomService.delete(id, principal.userId());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "초대 코드 재생성 (owner)")
    @PatchMapping("/{id}/invite-code")
    public RoomResponse regenerate(@PathVariable String id, @CurrentUser AuthUserPrincipal principal) {
        return RoomResponse.from(roomService.regenerateInviteCode(id, principal.userId()));
    }

    @Operation(summary = "공개 방 토글 (owner)")
    @PatchMapping("/{id}/public")
    public Map<String, Boolean> togglePublic(@PathVariable String id,
                                              @CurrentUser AuthUserPrincipal principal,
                                              @RequestBody Map<String, Boolean> body) {
        boolean isPublic = Boolean.TRUE.equals(body.get("isPublic"));
        var opts = new RoomService.RoomUpdateOptions(null, null, null, isPublic,
            null, null, null, null);
        Room updated = roomService.update(id, principal.userId(), opts);
        return Map.of("isPublic", updated.isPublic());
    }

    @Operation(summary = "초대 코드로 입장")
    @PostMapping("/join")
    @RateLimit(capacity = 10, refillSeconds = 60)
    public RoomResponse join(@CurrentUser AuthUserPrincipal principal,
                             @Valid @RequestBody JoinRoomRequest req) {
        return RoomResponse.from(roomService.joinByInviteCode(req.inviteCode(), principal.userId()));
    }

    // ─── 헬퍼 ────────────────────────────────────────────────────────────

    private RoomDetailResponse.MemberInfo toMemberInfo(RoomMember m) {
        return new RoomDetailResponse.MemberInfo(
            m.getId(), m.getRole(), m.getUser().getId(), m.getJoinedAt(),
            new RoomDetailResponse.UserBrief(
                m.getUser().getId(), m.getUser().getNickname(), m.getUser().getProfileImageUrl())
        );
    }

    private Map<String, long[]> reviewAggregates(List<RoomRestaurant> restaurants) {
        Map<String, long[]> map = new HashMap<>();
        if (restaurants.isEmpty()) return map;
        var ids = restaurants.stream().map(RoomRestaurant::getId).toList();
        for (Object[] row : reviewRepository.aggregateByRestaurantIds(ids)) {
            String rid = (String) row[0];
            long count = ((Number) row[1]).longValue();
            Double avg = row[2] == null ? null : ((Number) row[2]).doubleValue();
            long avgTimes10 = avg == null ? -1 : Math.round(avg * 10);
            map.put(rid, new long[]{count, avgTimes10});
        }
        return map;
    }

    private RoomDetailResponse.RestaurantInfoView toRestaurantInfoView(RoomRestaurant r, Map<String, long[]> aggMap) {
        long[] agg = aggMap.getOrDefault(r.getId(), new long[]{0, -1});
        Double avgRating = agg[1] < 0 ? null : agg[1] / 10.0;
        return new RoomDetailResponse.RestaurantInfoView(
            r.getId(), r.getName(), r.getAddress(),
            r.getProvince(), r.getCity(), r.getNeighborhood(),
            r.getCategory(), List.of(),
            r.getLatitude(), r.getLongitude(),
            r.isClosed(), r.isWishlist(),
            r.getRoom().getId(),
            r.getAddedBy() == null ? null : r.getAddedBy().getId(),
            r.getCreatedAt(),
            avgRating,
            new RoomDetailResponse.Count(agg[0], agg[0]),
            r.getAddedBy() == null ? null :
                new RoomDetailResponse.UserBrief(r.getAddedBy().getId(), r.getAddedBy().getNickname(),
                    r.getAddedBy().getProfileImageUrl())
        );
    }
}
