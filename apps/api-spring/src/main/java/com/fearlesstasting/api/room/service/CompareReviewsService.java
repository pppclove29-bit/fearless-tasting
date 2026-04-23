package com.fearlesstasting.api.room.service;

import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.room.entity.RoomReview;
import com.fearlesstasting.api.room.entity.RoomVisit;
import com.fearlesstasting.api.room.repository.RoomRestaurantRepository;
import com.fearlesstasting.api.room.repository.RoomReviewRepository;
import com.fearlesstasting.api.room.repository.RoomVisitRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 식당 리뷰 비교 (같은 식당에 대한 멤버들의 리뷰를 한눈에).
 * Nest `CompareReviewsResponse` shape.
 */
@Service
@RequiredArgsConstructor
public class CompareReviewsService {

    private final RoomRestaurantRepository restaurantRepository;
    private final RoomVisitRepository visitRepository;
    private final RoomReviewRepository reviewRepository;
    private final RoomAccessService accessService;

    @Transactional(readOnly = true)
    public CompareResponse compare(String roomId, String restaurantId, String userId) {
        accessService.requireMembership(roomId, userId);
        var restaurant = restaurantRepository.findById(restaurantId)
            .orElseThrow(() -> ApiException.notFound("식당을 찾을 수 없습니다."));
        if (!restaurant.getRoom().getId().equals(roomId)) {
            throw ApiException.notFound("식당을 찾을 수 없습니다.");
        }

        List<RoomVisit> visits = visitRepository.findAllByRestaurantIdWithCreator(restaurantId);
        List<String> visitIds = visits.stream().map(RoomVisit::getId).toList();

        List<RoomReview> reviews = visitIds.isEmpty()
            ? List.of()
            : reviewRepository.findAllByVisitIdInWithUser(visitIds);

        // 유저별 최신 리뷰 하나만 사용 (한 유저가 여러 방문에 리뷰 가능, UI상 1개 비교)
        // 유저별 최신 리뷰 1개만 유지
        Map<String, RoomReview> latestByUser = new HashMap<>();
        for (RoomReview rv : reviews) {
            String uid = rv.getUser().getId();
            RoomReview existing = latestByUser.get(uid);
            if (existing == null || existing.getCreatedAt().isBefore(rv.getCreatedAt())) {
                latestByUser.put(uid, rv);
            }
        }

        Map<String, ReviewComparison> byUser = new HashMap<>();
        for (var entry : latestByUser.entrySet()) {
            RoomReview rv = entry.getValue();
            byUser.put(entry.getKey(), new ReviewComparison(
                rv.getUser().getId(), rv.getUser().getNickname(), rv.getUser().getProfileImageUrl(),
                rv.getRating(), rv.getContent(), rv.getWouldRevisit(),
                rv.getTasteRating(), rv.getValueRating(), rv.getServiceRating(),
                rv.getCleanlinessRating(), rv.getAccessibilityRating(),
                rv.getFavoriteMenu(), rv.getTryNextMenu(),
                rv.getCreatedAt().toString()
            ));
        }

        List<ReviewComparison> list = new ArrayList<>(byUser.values());
        list.sort((a, b) -> Double.compare(b.rating(), a.rating()));
        return new CompareResponse(restaurant.getId(), restaurant.getName(), list);
    }

    public record ReviewComparison(
        String userId, String nickname, String profileImageUrl,
        double rating, String content, int wouldRevisit,
        Double tasteRating, Double valueRating, Double serviceRating,
        Double cleanlinessRating, Double accessibilityRating,
        String favoriteMenu, String tryNextMenu,
        String createdAt
    ) {}

    public record CompareResponse(String restaurantId, String restaurantName, List<ReviewComparison> reviews) {}
}
