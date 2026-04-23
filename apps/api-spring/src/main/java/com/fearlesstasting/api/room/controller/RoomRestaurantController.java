package com.fearlesstasting.api.room.controller;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.common.ratelimit.RateLimit;
import com.fearlesstasting.api.room.controller.dto.CreateRestaurantRequest;
import com.fearlesstasting.api.room.controller.dto.PagedRestaurants;
import com.fearlesstasting.api.room.controller.dto.RoomRestaurantDetailResponse;
import com.fearlesstasting.api.room.controller.dto.UpdateRestaurantRequest;
import com.fearlesstasting.api.room.entity.RoomRestaurant;
import com.fearlesstasting.api.room.repository.RoomRestaurantSearchCriteria;
import com.fearlesstasting.api.room.service.CompareReviewsService;
import com.fearlesstasting.api.room.service.RoomRestaurantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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

@Tag(name = "방 - 식당")
@RestController
@RequestMapping("/rooms/{roomId}/restaurants")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class RoomRestaurantController {

    private final RoomRestaurantService restaurantService;
    private final CompareReviewsService compareService;

    @Operation(summary = "식당 목록 (QueryDSL 동적 검색)")
    @GetMapping
    public PagedRestaurants list(
        @PathVariable String roomId,
        @CurrentUser AuthUserPrincipal principal,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "10") int pageSize,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) Integer categoryId,
        @RequestParam(required = false) Boolean wishlist,
        @RequestParam(defaultValue = "latest") String sort
    ) {
        int safePage = Math.max(1, page);
        int safeSize = Math.min(50, Math.max(1, pageSize));
        var criteria = new RoomRestaurantSearchCriteria(search, categoryId, wishlist, sort);
        Page<RoomRestaurantService.RestaurantListItem> result = restaurantService.list(
            roomId, principal.userId(), criteria,
            PageRequest.of(safePage - 1, safeSize)
        );
        return PagedRestaurants.from(result);
    }

    @Operation(summary = "식당 상세 (visits + reviews + participants + images nested)")
    @GetMapping("/{restaurantId}")
    public RoomRestaurantDetailResponse detail(
        @PathVariable String roomId,
        @PathVariable String restaurantId,
        @CurrentUser AuthUserPrincipal principal
    ) {
        return restaurantService.detail(roomId, restaurantId, principal.userId());
    }

    @Operation(summary = "식당 등록")
    @PostMapping
    @RateLimit(capacity = 10, refillSeconds = 60)
    public ResponseEntity<Map<String, Object>> create(
        @PathVariable String roomId,
        @CurrentUser AuthUserPrincipal principal,
        @Valid @RequestBody CreateRestaurantRequest req
    ) {
        var cmd = new RoomRestaurantService.CreateRestaurantCommand(
            req.name(), req.address(), req.province(), req.city(), req.neighborhood(),
            req.category(), req.latitude(), req.longitude(), req.isWishlist()
        );
        RoomRestaurant created = restaurantService.create(roomId, principal.userId(), cmd);
        return ResponseEntity.status(201).body(summary(created));
    }

    @Operation(summary = "식당 수정")
    @PatchMapping("/{restaurantId}")
    public Map<String, Object> update(
        @PathVariable String roomId,
        @PathVariable String restaurantId,
        @CurrentUser AuthUserPrincipal principal,
        @Valid @RequestBody UpdateRestaurantRequest req
    ) {
        var cmd = new RoomRestaurantService.UpdateRestaurantCommand(
            req.name(), req.address(), req.province(), req.city(), req.neighborhood(),
            req.category(), req.latitude(), req.longitude(), req.isClosed()
        );
        return summary(restaurantService.update(roomId, restaurantId, principal.userId(), cmd));
    }

    @Operation(summary = "위시리스트 토글")
    @PostMapping("/{restaurantId}/wishlist")
    public Map<String, Object> toggleWishlist(
        @PathVariable String roomId,
        @PathVariable String restaurantId,
        @CurrentUser AuthUserPrincipal principal
    ) {
        RoomRestaurant updated = restaurantService.toggleWishlist(roomId, restaurantId, principal.userId());
        Map<String, Object> body = new HashMap<>();
        body.put("id", updated.getId());
        body.put("isWishlist", updated.isWishlist());
        return body;
    }

    @Operation(summary = "유사 식당 추천 (같은 방)")
    @GetMapping("/{restaurantId}/similar")
    public List<RoomRestaurantService.RestaurantListItem> similar(
        @PathVariable String roomId,
        @PathVariable String restaurantId,
        @CurrentUser AuthUserPrincipal principal
    ) {
        return restaurantService.similar(roomId, restaurantId, principal.userId());
    }

    @Operation(summary = "식당 리뷰 비교 (멤버별)")
    @GetMapping("/{restaurantId}/compare")
    public CompareReviewsService.CompareResponse compare(
        @PathVariable String roomId,
        @PathVariable String restaurantId,
        @CurrentUser AuthUserPrincipal principal
    ) {
        return compareService.compare(roomId, restaurantId, principal.userId());
    }

    public record QuickReviewRequest(
        Double rating,
        @jakarta.validation.constraints.Size(max = 2000) String content,
        Integer wouldRevisit,
        Double tasteRating, Double valueRating, Double serviceRating,
        Double cleanlinessRating, Double accessibilityRating,
        @jakarta.validation.constraints.Size(max = 200) String favoriteMenu,
        @jakarta.validation.constraints.Size(max = 200) String tryNextMenu,
        String memo, String waitTime, Boolean isDelivery,
        java.time.LocalDate visitedAt
    ) {}

    /**
     * 빠른 리뷰 — 방문 + 리뷰 동시 생성 (Nest의 /restaurants/:rid/quick-review).
     * 트랜잭션 하나로 visit → review 원자 생성.
     */
    @Operation(summary = "빠른 리뷰 (방문+리뷰 동시 생성)")
    @PostMapping("/{restaurantId}/quick-review")
    @RateLimit(capacity = 10, refillSeconds = 60)
    public ResponseEntity<Map<String, Object>> quickReview(
        @PathVariable String roomId,
        @PathVariable String restaurantId,
        @CurrentUser AuthUserPrincipal principal,
        @Valid @RequestBody QuickReviewRequest req,
        @org.springframework.beans.factory.annotation.Autowired
        com.fearlesstasting.api.room.service.QuickReviewService quickReviewService
    ) {
        var result = quickReviewService.create(roomId, restaurantId, principal.userId(), req);
        Map<String, Object> body = new HashMap<>();
        body.put("visitId", result.visitId());
        body.put("reviewId", result.reviewId());
        return ResponseEntity.status(201).body(body);
    }

    @Operation(summary = "식당 삭제")
    @DeleteMapping("/{restaurantId}")
    public ResponseEntity<Void> delete(
        @PathVariable String roomId,
        @PathVariable String restaurantId,
        @CurrentUser AuthUserPrincipal principal
    ) {
        restaurantService.delete(roomId, restaurantId, principal.userId());
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> summary(RoomRestaurant r) {
        Map<String, Object> body = new HashMap<>();
        body.put("id", r.getId());
        body.put("name", r.getName());
        body.put("category", r.getCategory());
        body.put("categoryId", r.getCategoryRef() == null ? null : r.getCategoryRef().getId());
        body.put("isClosed", r.isClosed());
        body.put("isWishlist", r.isWishlist());
        return body;
    }
}
