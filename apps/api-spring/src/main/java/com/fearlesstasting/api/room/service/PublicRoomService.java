package com.fearlesstasting.api.room.service;

import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.room.entity.Room;
import com.fearlesstasting.api.room.entity.RoomRestaurant;
import com.fearlesstasting.api.room.repository.RoomRepository;
import com.fearlesstasting.api.room.repository.RoomRestaurantRepository;
import com.fearlesstasting.api.room.repository.RoomReviewRepository;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 공개 방 열람 서비스. 비로그인 접근 허용.
 * Nest `RoomsService` 중 공개 방 관련 메소드를 포팅 (품질 필터는 간소화).
 */
@Service
@RequiredArgsConstructor
public class PublicRoomService {

    private final RoomRepository roomRepository;
    private final RoomRestaurantRepository restaurantRepository;
    private final RoomReviewRepository reviewRepository;

    @Transactional(readOnly = true)
    public List<PublicRoomCard> list() {
        List<Room> rooms = roomRepository.findAllPublic();
        if (rooms.isEmpty()) return List.of();

        // 방별 식당 수 / 리뷰 통계를 효율적으로 조회하기엔 복잡 → 방별 건수만 보여주는 카드
        return rooms.stream().map(r -> new PublicRoomCard(
            r.getId(), r.getName(), r.getAnnouncement(),
            restaurantRepository.countByRoomId(r.getId()),
            r.getUpdatedAt()
        )).toList();
    }

    @Transactional(readOnly = true)
    public List<String> sitemapIds() {
        return roomRepository.findPublicIds();
    }

    @Transactional(readOnly = true)
    public PublicRoomDetail detail(String roomId) {
        Room room = roomRepository.findById(roomId)
            .orElseThrow(() -> ApiException.notFound("공개 방을 찾을 수 없습니다."));
        if (!room.isPublic()) throw ApiException.notFound("공개 방을 찾을 수 없습니다.");

        var restaurants = restaurantRepository.findAllByRoomIdWithCategory(roomId);
        Map<String, Aggregate> aggMap = aggregate(restaurants);

        long totalReviews = aggMap.values().stream().mapToLong(Aggregate::count).sum();
        double avgSum = aggMap.values().stream()
            .filter(a -> a.avg() != null)
            .mapToDouble(a -> a.avg() * a.count()).sum();
        Double avgRating = totalReviews > 0 ? Math.round(avgSum / totalReviews * 10) / 10.0 : null;

        // TOP 카테고리 / 지역 (빈도 내림차순 상위 5)
        java.util.Map<String, Long> catFreq = new java.util.HashMap<>();
        java.util.Map<String, Long> regionFreq = new java.util.HashMap<>();
        for (RoomRestaurant r : restaurants) {
            if (r.getCategory() != null) catFreq.merge(r.getCategory(), 1L, Long::sum);
            String region = (r.getCity() != null ? r.getCity() : "") + " " + (r.getNeighborhood() != null ? r.getNeighborhood() : "");
            region = region.trim();
            if (!region.isBlank()) regionFreq.merge(region, 1L, Long::sum);
        }
        List<String> topCategories = catFreq.entrySet().stream()
            .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
            .limit(5).map(Map.Entry::getKey).toList();
        List<String> topRegions = regionFreq.entrySet().stream()
            .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
            .limit(5).map(Map.Entry::getKey).toList();

        List<PublicRestaurant> items = restaurants.stream()
            .map(r -> {
                Aggregate a = aggMap.getOrDefault(r.getId(), Aggregate.EMPTY);
                return new PublicRestaurant(
                    r.getId(), r.getName(), r.getAddress(), r.getCategory(),
                    r.getLatitude(), r.getLongitude(),
                    a.count(), a.avg()
                );
            }).toList();

        return new PublicRoomDetail(
            room.getId(), room.getName(), room.getAnnouncement(),
            new Summary(restaurants.size(), totalReviews, avgRating, topCategories, topRegions),
            items
        );
    }

    @Transactional(readOnly = true)
    public PublicRestaurantDetail restaurantDetail(String roomId, String restaurantId) {
        Room room = roomRepository.findById(roomId)
            .orElseThrow(() -> ApiException.notFound("공개 방을 찾을 수 없습니다."));
        if (!room.isPublic()) throw ApiException.notFound("공개 방을 찾을 수 없습니다.");

        RoomRestaurant restaurant = restaurantRepository.findByIdWithCategory(restaurantId)
            .orElseThrow(() -> ApiException.notFound("식당을 찾을 수 없습니다."));
        if (!restaurant.getRoom().getId().equals(roomId)) {
            throw ApiException.notFound("식당을 찾을 수 없습니다.");
        }

        Object[] summary = reviewRepository.summaryByRoomId(roomId); // 방 단위 — 그대로 활용
        // 식당별 리뷰 간단 형태 (user 익명화)
        var reviewRows = reviewRepository.findAllByRestaurantIdAnonymous(restaurantId);
        List<AnonymousReview> reviews = reviewRows.stream().map(row -> new AnonymousReview(
            ((Number) row[0]).doubleValue(),  // rating
            (String) row[1],                  // content
            ((java.sql.Timestamp) row[2] != null ? ((java.sql.Timestamp) row[2]).toLocalDateTime()
                : row[2] instanceof LocalDateTime l ? l : null)
        )).toList();

        return new PublicRestaurantDetail(
            restaurant.getId(), restaurant.getName(), restaurant.getAddress(),
            restaurant.getCategory(), restaurant.getLatitude(), restaurant.getLongitude(),
            reviews
        );
    }

    // ─── 헬퍼 ────────────────────────────────────────────────────────────

    private Map<String, Aggregate> aggregate(List<RoomRestaurant> restaurants) {
        if (restaurants.isEmpty()) return Map.of();
        List<String> ids = restaurants.stream().map(RoomRestaurant::getId).toList();
        Map<String, Aggregate> map = new HashMap<>();
        for (Object[] row : reviewRepository.aggregateByRestaurantIds(ids)) {
            String id = (String) row[0];
            long count = ((Number) row[1]).longValue();
            Double avg = row[2] == null ? null : Math.round(((Number) row[2]).doubleValue() * 10) / 10.0;
            map.put(id, new Aggregate(count, avg));
        }
        return map;
    }

    // ─── 반환 타입 ────────────────────────────────────────────────────────

    public record PublicRoomCard(String id, String name, String announcement,
                                 long restaurantCount, LocalDateTime updatedAt) {}

    public record PublicRoomDetail(String id, String name, String announcement,
                                   Summary summary, List<PublicRestaurant> restaurants) {}

    public record Summary(long restaurantCount, long totalReviews, Double avgRating,
                          List<String> topCategories, List<String> topRegions) {}

    public record PublicRestaurant(String id, String name, String address, String category,
                                   Double latitude, Double longitude,
                                   long reviewCount, Double avgRating) {}

    public record PublicRestaurantDetail(String id, String name, String address, String category,
                                         Double latitude, Double longitude,
                                         List<AnonymousReview> reviews) {}

    public record AnonymousReview(double rating, String content, LocalDateTime createdAt) {}

    private record Aggregate(long count, Double avg) {
        static final Aggregate EMPTY = new Aggregate(0, null);
    }
}
