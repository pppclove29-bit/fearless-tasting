package com.fearlesstasting.api.room.service;

import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.room.entity.RoomMember;
import com.fearlesstasting.api.room.entity.RoomRestaurant;
import com.fearlesstasting.api.room.entity.RoomVisit;
import com.fearlesstasting.api.room.entity.RoomVisitParticipant;
import com.fearlesstasting.api.room.repository.RoomRestaurantRepository;
import com.fearlesstasting.api.room.repository.RoomVisitParticipantRepository;
import com.fearlesstasting.api.room.repository.RoomVisitRepository;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 방문 기록 서비스.
 * 정책:
 *  - 생성/조회: 방 멤버 누구나
 *  - 수정/삭제: 방문 생성자 또는 매니저+
 *  - 식당-방 관계 불일치 시 404 (레이싱 / 잘못된 URL 방어)
 *  - 참여자 태그: 방 멤버만 태그 가능, 중복 차단은 unique 제약 + 사전 필터
 */
@Service
@RequiredArgsConstructor
public class RoomVisitService {

    private final RoomVisitRepository visitRepository;
    private final RoomVisitParticipantRepository participantRepository;
    private final RoomRestaurantRepository restaurantRepository;
    private final UserRepository userRepository;
    private final RoomAccessService accessService;

    @Transactional
    public RoomVisit create(String roomId, String restaurantId, String userId,
                            LocalDate visitedAt, String memo, String waitTime, Boolean isDelivery,
                            List<String> participantUserIds) {
        accessService.requireMembership(roomId, userId);
        RoomRestaurant restaurant = loadRestaurantInRoom(roomId, restaurantId);

        User user = userRepository.findById(userId)
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));

        RoomVisit saved = visitRepository.save(RoomVisit.builder()
            .restaurant(restaurant)
            .createdBy(user)
            .visitedAt(visitedAt == null ? LocalDate.now() : visitedAt)
            .memo(memo)
            .waitTime(waitTime)
            .isDelivery(isDelivery)
            .build());

        if (participantUserIds != null && !participantUserIds.isEmpty()) {
            attachParticipants(roomId, saved, participantUserIds);
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public List<RoomVisit> list(String roomId, String restaurantId, String userId) {
        accessService.requireMembership(roomId, userId);
        loadRestaurantInRoom(roomId, restaurantId);
        return visitRepository.findAllByRestaurantIdWithCreator(restaurantId);
    }

    @Transactional(readOnly = true)
    public Map<String, List<ParticipantView>> participantsByVisitIds(Collection<String> visitIds) {
        if (visitIds.isEmpty()) return Map.of();
        Map<String, List<ParticipantView>> result = new HashMap<>();
        for (RoomVisitParticipant p : participantRepository.findByVisitIdsWithUser(visitIds)) {
            result.computeIfAbsent(p.getVisit().getId(), k -> new ArrayList<>())
                .add(new ParticipantView(p.getUser().getId(), p.getUser().getNickname()));
        }
        return result;
    }

    @Transactional
    public RoomVisit update(String roomId, String visitId, String userId,
                            LocalDate visitedAt, String memo, String waitTime,
                            List<String> participantUserIds) {
        RoomMember member = accessService.requireMembership(roomId, userId);
        RoomVisit visit = visitRepository.findByIdWithRestaurant(visitId)
            .orElseThrow(() -> ApiException.notFound("방문 기록을 찾을 수 없습니다."));

        if (!visit.getRestaurant().getRoom().getId().equals(roomId)) {
            throw ApiException.notFound("방문 기록을 찾을 수 없습니다.");
        }
        assertMutableBy(visit, member, userId);

        visit.update(visitedAt, memo, waitTime);

        if (participantUserIds != null) {
            participantRepository.deleteByVisitId(visitId);
            participantRepository.flush();
            if (!participantUserIds.isEmpty()) {
                attachParticipants(roomId, visit, participantUserIds);
            }
        }
        return visit;
    }

    @Transactional
    public void delete(String roomId, String visitId, String userId) {
        RoomMember member = accessService.requireMembership(roomId, userId);
        RoomVisit visit = visitRepository.findByIdWithRestaurant(visitId)
            .orElseThrow(() -> ApiException.notFound("방문 기록을 찾을 수 없습니다."));

        if (!visit.getRestaurant().getRoom().getId().equals(roomId)) {
            throw ApiException.notFound("방문 기록을 찾을 수 없습니다.");
        }
        assertMutableBy(visit, member, userId);
        visitRepository.delete(visit);
    }

    // ─── 헬퍼 ────────────────────────────────────────────────────────────

    private void attachParticipants(String roomId, RoomVisit visit, List<String> userIds) {
        for (String uid : userIds) {
            accessService.requireMembership(roomId, uid); // 방 멤버만 태그 가능
            User u = userRepository.findById(uid).orElse(null);
            if (u == null) continue;
            participantRepository.save(RoomVisitParticipant.builder().visit(visit).user(u).build());
        }
    }

    private RoomRestaurant loadRestaurantInRoom(String roomId, String restaurantId) {
        RoomRestaurant restaurant = restaurantRepository.findById(restaurantId)
            .orElseThrow(() -> ApiException.notFound("식당을 찾을 수 없습니다."));
        if (!restaurant.getRoom().getId().equals(roomId)) {
            throw ApiException.notFound("식당을 찾을 수 없습니다.");
        }
        return restaurant;
    }

    private void assertMutableBy(RoomVisit visit, RoomMember member, String userId) {
        boolean isCreator = visit.getCreatedBy() != null
            && userId.equals(visit.getCreatedBy().getId());
        if (!isCreator && !member.isOwnerOrManager()) {
            throw ApiException.forbidden("생성자 본인 또는 매니저 이상만 수정/삭제할 수 있습니다.");
        }
    }

    public record ParticipantView(String userId, String nickname) {}
}
