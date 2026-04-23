package com.fearlesstasting.api.admin.service;

import com.fearlesstasting.api.board.repository.PostRepository;
import com.fearlesstasting.api.inquiry.repository.InquiryRepository;
import com.fearlesstasting.api.room.repository.RoomRepository;
import com.fearlesstasting.api.room.repository.RoomRestaurantRepository;
import com.fearlesstasting.api.room.repository.RoomReviewRepository;
import com.fearlesstasting.api.room.repository.RoomVisitRepository;
import com.fearlesstasting.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 관리자 대시보드 요약 통계. */
@Service
@RequiredArgsConstructor
public class AdminStatsService {

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final RoomRestaurantRepository restaurantRepository;
    private final RoomVisitRepository visitRepository;
    private final RoomReviewRepository reviewRepository;
    private final PostRepository postRepository;
    private final InquiryRepository inquiryRepository;

    @Transactional(readOnly = true)
    public Dashboard dashboard() {
        return new Dashboard(
            userRepository.count(),
            roomRepository.count(),
            restaurantRepository.count(),
            visitRepository.count(),
            reviewRepository.count(),
            postRepository.count(),
            inquiryRepository.count()
        );
    }

    public record Dashboard(
        long users, long rooms, long restaurants, long visits,
        long reviews, long posts, long inquiries
    ) {}
}
