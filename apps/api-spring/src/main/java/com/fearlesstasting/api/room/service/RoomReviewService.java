package com.fearlesstasting.api.room.service;

import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.room.entity.RoomReview;
import com.fearlesstasting.api.room.entity.RoomVisit;
import com.fearlesstasting.api.room.repository.RoomReviewRepository;
import com.fearlesstasting.api.room.repository.RoomVisitRepository;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 방문당 1인 1리뷰 제약. 작성·수정·삭제는 본인만.
 * Unique constraint (visitId, userId)로 DB 레벨 중복 차단 + 서비스에서 선조회로 친절한 메시지.
 */
@Service
@RequiredArgsConstructor
public class RoomReviewService {

    private final RoomReviewRepository reviewRepository;
    private final RoomVisitRepository visitRepository;
    private final UserRepository userRepository;
    private final RoomAccessService accessService;

    @Transactional
    public RoomReview create(String roomId, String visitId, String userId, ReviewCommand cmd) {
        accessService.requireMembership(roomId, userId);
        RoomVisit visit = loadVisitInRoom(roomId, visitId);

        if (reviewRepository.findByVisitIdAndUserId(visitId, userId).isPresent()) {
            throw ApiException.conflict("이미 이 방문에 리뷰를 작성했습니다.");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));

        return reviewRepository.save(RoomReview.builder()
            .visit(visit)
            .user(user)
            .rating(cmd.rating())
            .content(cmd.content())
            .wouldRevisit(cmd.wouldRevisit())
            .tasteRating(cmd.tasteRating())
            .valueRating(cmd.valueRating())
            .serviceRating(cmd.serviceRating())
            .cleanlinessRating(cmd.cleanlinessRating())
            .accessibilityRating(cmd.accessibilityRating())
            .favoriteMenu(cmd.favoriteMenu())
            .tryNextMenu(cmd.tryNextMenu())
            .images(cmd.images())
            .build());
    }

    @Transactional(readOnly = true)
    public List<RoomReview> listForVisit(String roomId, String visitId, String userId) {
        accessService.requireMembership(roomId, userId);
        loadVisitInRoom(roomId, visitId);
        return reviewRepository.findAllByVisitIdWithUser(visitId);
    }

    @Transactional
    public RoomReview update(String roomId, String reviewId, String userId, ReviewCommand cmd) {
        accessService.requireMembership(roomId, userId);
        RoomReview review = reviewRepository.findById(reviewId)
            .orElseThrow(() -> ApiException.notFound("리뷰를 찾을 수 없습니다."));

        assertRoomMatch(roomId, review);
        if (!userId.equals(review.getUser().getId())) {
            throw ApiException.forbidden("본인의 리뷰만 수정할 수 있습니다.");
        }

        // @Transactional + JPA dirty checking — update() 호출만으로 커밋 시 UPDATE 쿼리 발행
        review.update(
            cmd.rating(), cmd.content(), cmd.wouldRevisit(),
            cmd.tasteRating(), cmd.valueRating(), cmd.serviceRating(),
            cmd.cleanlinessRating(), cmd.accessibilityRating(),
            cmd.favoriteMenu(), cmd.tryNextMenu(), cmd.images()
        );
        return review;
    }

    @Transactional
    public void delete(String roomId, String reviewId, String userId) {
        accessService.requireMembership(roomId, userId);
        RoomReview review = reviewRepository.findById(reviewId)
            .orElseThrow(() -> ApiException.notFound("리뷰를 찾을 수 없습니다."));

        assertRoomMatch(roomId, review);
        if (!userId.equals(review.getUser().getId())) {
            throw ApiException.forbidden("본인의 리뷰만 삭제할 수 있습니다.");
        }
        reviewRepository.delete(review);
    }

    private RoomVisit loadVisitInRoom(String roomId, String visitId) {
        RoomVisit visit = visitRepository.findByIdWithRestaurant(visitId)
            .orElseThrow(() -> ApiException.notFound("방문 기록을 찾을 수 없습니다."));
        if (!visit.getRestaurant().getRoom().getId().equals(roomId)) {
            throw ApiException.notFound("방문 기록을 찾을 수 없습니다.");
        }
        return visit;
    }

    private void assertRoomMatch(String roomId, RoomReview review) {
        if (!review.getVisit().getRestaurant().getRoom().getId().equals(roomId)) {
            throw ApiException.notFound("리뷰를 찾을 수 없습니다.");
        }
    }

    public record ReviewCommand(
        double rating,
        String content,
        Integer wouldRevisit,
        Double tasteRating, Double valueRating, Double serviceRating,
        Double cleanlinessRating, Double accessibilityRating,
        String favoriteMenu, String tryNextMenu, String images
    ) {}
}
