package com.fearlesstasting.api.discover;

import com.fearlesstasting.api.room.repository.RoomReviewRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 비로그인 공개: 고평점 맛집 추천 / 유저 랭킹 / 플랫폼 통계. */
@Tag(name = "탐색")
@RestController
@RequiredArgsConstructor
public class DiscoverController {

    private final RoomReviewRepository reviewRepository;

    public record DiscoverRestaurant(
        String id, String name, String address, String category,
        Double latitude, Double longitude,
        double avgRating, long reviewCount
    ) {}

    public record RankingUser(String id, String nickname, String profileImageUrl,
                              long reviewCount, Double avgRating) {}

    @Operation(summary = "고평점 맛집 추천 (공개 방, 리뷰 3개 이상)")
    @GetMapping("/discover")
    @Transactional(readOnly = true)
    public List<DiscoverRestaurant> discover(@RequestParam(defaultValue = "20") int limit) {
        int safe = Math.max(1, Math.min(100, limit));
        return reviewRepository.discoverHighRated(PageRequest.of(0, safe)).stream()
            .map(row -> new DiscoverRestaurant(
                (String) row[0], (String) row[1], (String) row[2], (String) row[3],
                row[4] == null ? null : ((Number) row[4]).doubleValue(),
                row[5] == null ? null : ((Number) row[5]).doubleValue(),
                Math.round(((Number) row[6]).doubleValue() * 10) / 10.0,
                ((Number) row[7]).longValue()
            )).toList();
    }

    @Operation(summary = "유저 랭킹 (리뷰 수)")
    @GetMapping("/rankings")
    @Transactional(readOnly = true)
    public List<RankingUser> rankings(@RequestParam(defaultValue = "30") int limit) {
        int safe = Math.max(1, Math.min(100, limit));
        return reviewRepository.rankByReviewCount(PageRequest.of(0, safe)).stream()
            .map(row -> new RankingUser(
                (String) row[0], (String) row[1], (String) row[2],
                ((Number) row[3]).longValue(),
                row[4] == null ? null : Math.round(((Number) row[4]).doubleValue() * 10) / 10.0
            )).toList();
    }

    @Operation(summary = "플랫폼 통계 (총 리뷰 수 / 평균 평점)")
    @GetMapping("/rooms/platform-stats")
    @Transactional(readOnly = true)
    public Map<String, Object> platformStats() {
        Object[] row = reviewRepository.platformSummary();
        long total = row == null || row[0] == null ? 0 : ((Number) row[0]).longValue();
        Double avg = row == null || row[1] == null
            ? null : Math.round(((Number) row[1]).doubleValue() * 10) / 10.0;
        return Map.of("totalReviews", total, "avgRating", avg == null ? 0 : avg);
    }
}
