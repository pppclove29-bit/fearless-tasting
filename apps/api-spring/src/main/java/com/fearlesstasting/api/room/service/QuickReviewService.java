package com.fearlesstasting.api.room.service;

import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.room.controller.RoomRestaurantController.QuickReviewRequest;
import com.fearlesstasting.api.room.entity.RoomRestaurant;
import com.fearlesstasting.api.room.entity.RoomReview;
import com.fearlesstasting.api.room.entity.RoomVisit;
import com.fearlesstasting.api.room.repository.RoomRestaurantRepository;
import com.fearlesstasting.api.room.repository.RoomReviewRepository;
import com.fearlesstasting.api.room.repository.RoomVisitRepository;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 방문 + 리뷰 원자 생성 (Nest `quick-review` 포팅). */
@Service
@RequiredArgsConstructor
public class QuickReviewService {

    private final RoomRestaurantRepository restaurantRepository;
    private final RoomVisitRepository visitRepository;
    private final RoomReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final RoomAccessService accessService;

    @Transactional
    public Result create(String roomId, String restaurantId, String userId, QuickReviewRequest req) {
        accessService.requireMembership(roomId, userId);
        RoomRestaurant restaurant = restaurantRepository.findById(restaurantId)
            .orElseThrow(() -> ApiException.notFound("식당을 찾을 수 없습니다."));
        if (!restaurant.getRoom().getId().equals(roomId)) {
            throw ApiException.notFound("식당을 찾을 수 없습니다.");
        }
        if (req.rating() == null) {
            throw ApiException.badRequest("평점(rating)은 필수입니다.");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));

        RoomVisit visit = visitRepository.save(RoomVisit.builder()
            .restaurant(restaurant).createdBy(user)
            .visitedAt(req.visitedAt() == null ? LocalDate.now() : req.visitedAt())
            .memo(req.memo()).waitTime(req.waitTime())
            .isDelivery(req.isDelivery())
            .build());

        RoomReview review = reviewRepository.save(RoomReview.builder()
            .visit(visit).user(user)
            .rating(req.rating())
            .content(req.content() == null ? "" : req.content())
            .wouldRevisit(req.wouldRevisit() == null ? 4 : req.wouldRevisit())
            .tasteRating(req.tasteRating()).valueRating(req.valueRating())
            .serviceRating(req.serviceRating()).cleanlinessRating(req.cleanlinessRating())
            .accessibilityRating(req.accessibilityRating())
            .favoriteMenu(req.favoriteMenu()).tryNextMenu(req.tryNextMenu())
            .build());

        return new Result(visit.getId(), review.getId());
    }

    public record Result(String visitId, String reviewId) {}
}
