package com.fearlesstasting.api.room.service;

import com.fearlesstasting.api.category.service.CategoryResolution;
import com.fearlesstasting.api.category.service.CategoryService;
import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.room.controller.dto.RoomRestaurantDetailResponse;
import com.fearlesstasting.api.room.entity.Room;
import com.fearlesstasting.api.room.entity.RoomMember;
import com.fearlesstasting.api.room.entity.RoomRestaurant;
import com.fearlesstasting.api.room.entity.RoomRestaurantImage;
import com.fearlesstasting.api.room.entity.RoomReview;
import com.fearlesstasting.api.room.entity.RoomVisit;
import com.fearlesstasting.api.room.entity.RoomVisitParticipant;
import com.fearlesstasting.api.room.repository.RoomRestaurantImageRepository;
import com.fearlesstasting.api.room.repository.RoomRestaurantRepository;
import com.fearlesstasting.api.room.repository.RoomRestaurantSearchCriteria;
import com.fearlesstasting.api.room.repository.RoomReviewRepository;
import com.fearlesstasting.api.room.repository.RoomVisitParticipantRepository;
import com.fearlesstasting.api.room.repository.RoomVisitRepository;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 방 내 식당 CRUD + QueryDSL 동적 검색 + 리뷰 집계.
 *
 * <h3>면접 어필 포인트</h3>
 * <ol>
 *   <li><b>N+1 방지</b>: 식당 목록을 페이징한 뒤 reviewRepository.aggregateByRestaurantIds(ids)
 *       로 한 번의 group-by 쿼리로 평균 평점·리뷰 수를 집계 → 기존 Nest 코드의 `visits.reviews`
 *       중첩 fetch를 N+1 없이 재현.</li>
 *   <li><b>QueryDSL 동적 조건</b>: {@link com.fearlesstasting.api.room.repository.RoomRestaurantQueryRepositoryImpl}
 *       참조 — search/category/wishlist 각각 null-safe BooleanExpression.</li>
 *   <li><b>Category 연동</b>: 원본 입력값을 `CategoryService.resolve()`에 넘겨 DB 매핑을 조회하고,
 *       미매핑이면 `categoryRef=null`로 남겨 관리자 CMS 큐에 자동 노출.</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
public class RoomRestaurantService {

    private final RoomRestaurantRepository restaurantRepository;
    private final RoomReviewRepository reviewRepository;
    private final RoomVisitRepository visitRepository;
    private final RoomVisitParticipantRepository participantRepository;
    private final RoomRestaurantImageRepository imageRepository;
    private final UserRepository userRepository;
    private final CategoryService categoryService;
    private final RoomAccessService accessService;

    @Transactional(readOnly = true)
    public Page<RestaurantListItem> list(String roomId, String userId,
                                          RoomRestaurantSearchCriteria criteria, Pageable pageable) {
        accessService.requireMembership(roomId, userId);

        Page<RoomRestaurant> page = restaurantRepository.search(roomId, criteria, pageable);
        if (page.isEmpty()) return page.map(r -> toItem(r, 0, 0, null, List.of()));

        List<String> ids = page.getContent().stream().map(RoomRestaurant::getId).toList();
        Map<String, Aggregate> aggMap = aggregates(ids);
        Map<String, List<String>> imageMap = imagesByRestaurantIds(ids);

        return page.map(r -> {
            Aggregate agg = aggMap.getOrDefault(r.getId(), Aggregate.EMPTY);
            List<String> imgs = imageMap.getOrDefault(r.getId(), List.of());
            return toItem(r, agg.reviewCount(), agg.reviewCount(), agg.avgRating(), imgs);
        });
    }

    /**
     * 식당 상세 (GET /rooms/:id/restaurants/:rid).
     * visits + 각 visit의 participants + reviews를 fetch 최적화로 함께 로드.
     */
    @Transactional(readOnly = true)
    public RoomRestaurantDetailResponse detail(String roomId, String restaurantId, String userId) {
        accessService.requireMembership(roomId, userId);
        RoomRestaurant restaurant = restaurantRepository.findByIdWithCategory(restaurantId)
            .orElseThrow(() -> ApiException.notFound("식당을 찾을 수 없습니다."));
        if (!restaurant.getRoom().getId().equals(roomId)) {
            throw ApiException.notFound("식당을 찾을 수 없습니다.");
        }

        List<RoomVisit> visits = visitRepository.findAllByRestaurantIdWithCreator(restaurantId);
        List<String> visitIds = visits.stream().map(RoomVisit::getId).toList();

        Map<String, List<RoomVisitParticipant>> participantMap = new HashMap<>();
        if (!visitIds.isEmpty()) {
            for (RoomVisitParticipant p : participantRepository.findByVisitIdsWithUser(visitIds)) {
                participantMap.computeIfAbsent(p.getVisit().getId(), k -> new ArrayList<>()).add(p);
            }
        }

        Map<String, List<RoomReview>> reviewMap = new HashMap<>();
        if (!visitIds.isEmpty()) {
            for (RoomReview rv : reviewRepository.findAllByVisitIdInWithUser(visitIds)) {
                reviewMap.computeIfAbsent(rv.getVisit().getId(), k -> new ArrayList<>()).add(rv);
            }
        }

        List<String> images = imageRepository.findAllByRestaurantId(restaurantId).stream()
            .map(RoomRestaurantImage::getUrl).toList();

        // 평균 평점 계산
        long totalReviews = reviewMap.values().stream().mapToLong(List::size).sum();
        Double avgRating = null;
        if (totalReviews > 0) {
            double sum = reviewMap.values().stream()
                .flatMap(List::stream)
                .mapToDouble(RoomReview::getRating).sum();
            avgRating = Math.round(sum / totalReviews * 10) / 10.0;
        }

        List<RoomRestaurantDetailResponse.VisitView> visitViews = visits.stream().map(v -> {
            List<RoomVisitParticipant> ps = participantMap.getOrDefault(v.getId(), List.of());
            List<RoomReview> rs = reviewMap.getOrDefault(v.getId(), List.of());
            return new RoomRestaurantDetailResponse.VisitView(
                v.getId(), v.getVisitedAt(), v.getMemo(), v.getWaitTime(), v.isDelivery(),
                v.getRestaurant().getId(),
                v.getCreatedBy() == null ? null : v.getCreatedBy().getId(),
                v.getCreatedAt(),
                v.getCreatedBy() == null ? null : new RoomRestaurantDetailResponse.UserBrief(
                    v.getCreatedBy().getId(), v.getCreatedBy().getNickname(), v.getCreatedBy().getProfileImageUrl()),
                ps.stream().map(p -> new RoomRestaurantDetailResponse.ParticipantView(
                    p.getId(), v.getId(), p.getUser().getId(),
                    new RoomRestaurantDetailResponse.UserBrief(
                        p.getUser().getId(), p.getUser().getNickname(), p.getUser().getProfileImageUrl())
                )).toList(),
                rs.stream().map(rv -> new RoomRestaurantDetailResponse.ReviewView(
                    rv.getId(), rv.getRating(), rv.getContent(), rv.getWouldRevisit(),
                    rv.getTasteRating(), rv.getValueRating(), rv.getServiceRating(),
                    rv.getCleanlinessRating(), rv.getAccessibilityRating(),
                    rv.getFavoriteMenu(), rv.getTryNextMenu(), rv.getImages(),
                    v.getId(), rv.getUser().getId(),
                    rv.getCreatedAt(), rv.getUpdatedAt(),
                    new RoomRestaurantDetailResponse.UserBrief(
                        rv.getUser().getId(), rv.getUser().getNickname(), rv.getUser().getProfileImageUrl())
                )).toList(),
                new RoomRestaurantDetailResponse.VisitInnerCount(rs.size())
            );
        }).toList();

        return new RoomRestaurantDetailResponse(
            restaurant.getId(), restaurant.getName(), restaurant.getAddress(),
            restaurant.getProvince(), restaurant.getCity(), restaurant.getNeighborhood(),
            restaurant.getCategory(), images,
            restaurant.getLatitude(), restaurant.getLongitude(),
            restaurant.isClosed(), restaurant.isWishlist(),
            restaurant.getRoom().getId(),
            restaurant.getAddedBy() == null ? null : restaurant.getAddedBy().getId(),
            restaurant.getCreatedAt(),
            restaurant.getAddedBy() == null ? null : new RoomRestaurantDetailResponse.UserBrief(
                restaurant.getAddedBy().getId(), restaurant.getAddedBy().getNickname(),
                restaurant.getAddedBy().getProfileImageUrl()),
            avgRating,
            new RoomRestaurantDetailResponse.VisitCount(visits.size(), totalReviews),
            visitViews
        );
    }

    private Map<String, List<String>> imagesByRestaurantIds(List<String> ids) {
        Map<String, List<String>> map = new HashMap<>();
        if (ids.isEmpty()) return map;
        for (RoomRestaurantImage img : imageRepository.findAllByRestaurantIdIn(ids)) {
            map.computeIfAbsent(img.getRestaurant().getId(), k -> new ArrayList<>()).add(img.getUrl());
        }
        return map;
    }

    @Transactional
    public RoomRestaurant create(String roomId, String userId, CreateRestaurantCommand cmd) {
        accessService.requireMembership(roomId, userId);
        Room room = accessService.loadRoom(roomId);

        restaurantRepository.findByRoomIdAndNameAndAddress(roomId, cmd.name(), cmd.address())
            .ifPresent(dup -> {
                throw ApiException.conflict(dup.isWishlist()
                    ? "이미 위시리스트에 등록된 식당입니다."
                    : "이미 등록된 식당입니다.");
            });

        User user = userRepository.findById(userId)
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));

        CategoryResolution resolved = categoryService.resolve(cmd.category());

        RoomRestaurant restaurant = RoomRestaurant.builder()
            .room(room)
            .addedBy(user)
            .name(cmd.name())
            .address(cmd.address())
            .province(cmd.province())
            .city(cmd.city())
            .neighborhood(cmd.neighborhood())
            .category(resolved.displayName().isBlank() ? cmd.category() : resolved.displayName())
            .categoryRef(resolved.category())
            .latitude(cmd.latitude())
            .longitude(cmd.longitude())
            .isWishlist(cmd.isWishlist())
            .build();
        return restaurantRepository.save(restaurant);
    }

    @Transactional
    public RoomRestaurant update(String roomId, String restaurantId, String userId, UpdateRestaurantCommand cmd) {
        RoomMember member = accessService.requireMembership(roomId, userId);
        RoomRestaurant restaurant = restaurantRepository.findById(restaurantId)
            .orElseThrow(() -> ApiException.notFound("식당을 찾을 수 없습니다."));

        if (!restaurant.getRoom().getId().equals(roomId)) {
            throw ApiException.notFound("식당을 찾을 수 없습니다.");
        }

        boolean isOwnerOrManager = member.isOwnerOrManager();
        boolean isAddedByMe = restaurant.getAddedBy() != null
            && userId.equals(restaurant.getAddedBy().getId());
        if (!isAddedByMe && !isOwnerOrManager) {
            throw ApiException.forbidden("본인이 등록한 식당이거나 매니저 이상만 수정할 수 있습니다.");
        }

        restaurant.update(cmd.name(), cmd.address(), cmd.province(), cmd.city(),
            cmd.neighborhood(), cmd.latitude(), cmd.longitude(), cmd.isClosed());

        if (cmd.category() != null) {
            CategoryResolution resolved = categoryService.resolve(cmd.category());
            String displayName = resolved.displayName().isBlank() ? cmd.category() : resolved.displayName();
            restaurant.assignCategory(displayName, resolved.category());
        }
        return restaurant;
    }

    @Transactional
    public void delete(String roomId, String restaurantId, String userId) {
        RoomMember member = accessService.requireMembership(roomId, userId);
        RoomRestaurant restaurant = restaurantRepository.findById(restaurantId)
            .orElseThrow(() -> ApiException.notFound("식당을 찾을 수 없습니다."));

        boolean isAddedByMe = restaurant.getAddedBy() != null
            && userId.equals(restaurant.getAddedBy().getId());
        if (!isAddedByMe && !member.isOwnerOrManager()) {
            throw ApiException.forbidden("본인이 등록한 식당이거나 매니저 이상만 삭제할 수 있습니다.");
        }
        restaurantRepository.delete(restaurant);
    }

    /** 위시리스트 토글 — 멤버 누구나. */
    @Transactional
    public RoomRestaurant toggleWishlist(String roomId, String restaurantId, String userId) {
        accessService.requireMembership(roomId, userId);
        RoomRestaurant restaurant = restaurantRepository.findById(restaurantId)
            .orElseThrow(() -> ApiException.notFound("식당을 찾을 수 없습니다."));
        if (!restaurant.getRoom().getId().equals(roomId)) {
            throw ApiException.notFound("식당을 찾을 수 없습니다.");
        }
        restaurant.toggleWishlist(!restaurant.isWishlist());
        return restaurant;
    }

    /** 같은 방 내 유사 식당 추천 (카테고리·지역 heuristic). 상위 3개. */
    @Transactional(readOnly = true)
    public java.util.List<RestaurantListItem> similar(String roomId, String restaurantId, String userId) {
        accessService.requireMembership(roomId, userId);
        RoomRestaurant target = restaurantRepository.findByIdWithCategory(restaurantId)
            .orElseThrow(() -> ApiException.notFound("식당을 찾을 수 없습니다."));
        if (!target.getRoom().getId().equals(roomId)) {
            throw ApiException.notFound("식당을 찾을 수 없습니다.");
        }

        var candidates = restaurantRepository.findAllByRoomIdWithCategory(roomId).stream()
            .filter(r -> !r.getId().equals(restaurantId))
            .filter(r -> !r.isClosed() && !r.isWishlist())
            .toList();

        // 점수: 카테고리+지역(3) > 카테고리(2) > 지역(1)
        record Scored(RoomRestaurant r, int score) {}
        var scored = candidates.stream().map(r -> {
            int score = 0;
            if (r.getCategory() != null && r.getCategory().equals(target.getCategory())) score += 2;
            if (r.getProvince() != null && r.getProvince().equals(target.getProvince())
                && r.getCity() != null && r.getCity().equals(target.getCity())) score += 1;
            return new Scored(r, score);
        }).filter(s -> s.score() > 0).toList();

        var top = scored.stream()
            .sorted((a, b) -> b.score() - a.score())
            .limit(3).toList();

        if (top.isEmpty()) return java.util.List.of();
        java.util.List<String> ids = top.stream().map(s -> s.r().getId()).toList();
        var aggMap = aggregates(ids);
        return top.stream()
            .map(s -> {
                Aggregate a = aggMap.getOrDefault(s.r().getId(), Aggregate.EMPTY);
                return toItem(s.r(), a.reviewCount(), a.reviewCount(), a.avgRating(), List.of());
            }).toList();
    }

    // ─── 헬퍼 ────────────────────────────────────────────────────────────

    private Map<String, Aggregate> aggregates(List<String> restaurantIds) {
        Map<String, Aggregate> map = new HashMap<>();
        for (Object[] row : reviewRepository.aggregateByRestaurantIds(restaurantIds)) {
            String id = (String) row[0];
            long count = ((Number) row[1]).longValue();
            Double avg = row[2] == null ? null : ((Number) row[2]).doubleValue();
            map.put(id, new Aggregate(count, avg == null ? null : Math.round(avg * 10) / 10.0));
        }
        return map;
    }

    private RestaurantListItem toItem(RoomRestaurant r, long reviewCount, long visitCount, Double avgRating,
                                      List<String> images) {
        return new RestaurantListItem(
            r.getId(), r.getName(), r.getAddress(),
            r.getProvince(), r.getCity(), r.getNeighborhood(),
            r.getCategory(),
            r.getCategoryRef() == null ? null : r.getCategoryRef().getId(),
            images,
            r.getLatitude(), r.getLongitude(),
            r.isClosed(), r.isWishlist(),
            r.getRoom().getId(),
            r.getAddedBy() == null ? null : r.getAddedBy().getId(),
            r.getCreatedAt(),
            avgRating,
            new Count(visitCount, reviewCount),
            r.getAddedBy() == null ? null :
                new UserBrief(r.getAddedBy().getId(), r.getAddedBy().getNickname(), r.getAddedBy().getProfileImageUrl())
        );
    }

    // ─── 반환·입력 타입 ─────────────────────────────────────────────────

    /** Nest `RoomRestaurantInfo` shape. */
    public record RestaurantListItem(
        String id, String name, String address,
        String province, String city, String neighborhood,
        String category, Integer categoryId,
        java.util.List<String> images,
        Double latitude, Double longitude,
        boolean isClosed, boolean isWishlist,
        String roomId, String addedById,
        java.time.LocalDateTime createdAt,
        Double avgRating,
        Count _count,
        UserBrief addedBy
    ) {}

    public record Count(long visits, long reviews) {}
    public record UserBrief(String id, String nickname, String profileImageUrl) {}

    private record Aggregate(long reviewCount, Double avgRating) {
        static final Aggregate EMPTY = new Aggregate(0, null);
    }

    public record CreateRestaurantCommand(
        String name, String address, String province, String city, String neighborhood,
        String category, Double latitude, Double longitude, Boolean isWishlist
    ) {}

    public record UpdateRestaurantCommand(
        String name, String address, String province, String city, String neighborhood,
        String category, Double latitude, Double longitude, Boolean isClosed
    ) {}
}
