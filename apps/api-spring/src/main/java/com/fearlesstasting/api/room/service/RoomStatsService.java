package com.fearlesstasting.api.room.service;

import com.fearlesstasting.api.room.repository.RoomRestaurantRepository;
import com.fearlesstasting.api.room.repository.RoomReviewRepository;
import com.fearlesstasting.api.room.repository.RoomVisitRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 방 통계. Nest `RoomStatsService`의 서브셋(summary + 카테고리 분포)만 포팅.
 * 멤버 행동 분석 등 심화 지표는 후속 주차.
 */
@Service
@RequiredArgsConstructor
public class RoomStatsService {

    private final RoomRestaurantRepository restaurantRepository;
    private final RoomVisitRepository visitRepository;
    private final RoomReviewRepository reviewRepository;
    private final RoomAccessService accessService;

    @Transactional(readOnly = true)
    public RoomStatsResponse getStats(String roomId, String userId) {
        accessService.requireMembership(roomId, userId);

        long totalRestaurants = restaurantRepository.countByRoomId(roomId);
        long totalVisits = visitRepository.countByRoomId(roomId);

        Object[] summary = reviewRepository.summaryByRoomId(roomId);
        long totalReviews = summary == null || summary[0] == null
            ? 0 : ((Number) summary[0]).longValue();
        Double overallAvg = summary == null || summary[1] == null
            ? null : Math.round(((Number) summary[1]).doubleValue() * 10) / 10.0;

        List<CategoryStat> categoryStats = reviewRepository.categoryDistributionByRoomId(roomId).stream()
            .map(row -> new CategoryStat(
                (String) row[0],
                ((Number) row[1]).longValue(),
                row[2] == null ? null : Math.round(((Number) row[2]).doubleValue() * 10) / 10.0
            ))
            .toList();

        return new RoomStatsResponse(
            new Summary(totalRestaurants, totalVisits, totalReviews, overallAvg),
            categoryStats
        );
    }

    public record Summary(long totalRestaurants, long totalVisits, long totalReviews, Double overallAvg) {}
    public record CategoryStat(String category, long count, Double avgRating) {}
    public record RoomStatsResponse(Summary summary, List<CategoryStat> categoryStats) {}
}
