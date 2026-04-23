package com.fearlesstasting.api.poll.service;

import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.poll.entity.RoomPoll;
import com.fearlesstasting.api.poll.entity.RoomPollOption;
import com.fearlesstasting.api.poll.entity.RoomPollVote;
import com.fearlesstasting.api.poll.repository.RoomPollOptionRepository;
import com.fearlesstasting.api.poll.repository.RoomPollRepository;
import com.fearlesstasting.api.poll.repository.RoomPollVoteRepository;
import com.fearlesstasting.api.room.entity.Room;
import com.fearlesstasting.api.room.entity.RoomRestaurant;
import com.fearlesstasting.api.room.repository.RoomRestaurantRepository;
import com.fearlesstasting.api.room.service.RoomAccessService;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 방 투표 서비스. Nest `rooms.service.ts`의 createPoll/getPolls/vote/closePoll을 포팅.
 *
 * 정책:
 *  - 옵션 2~10개
 *  - 단일 선택, 재투표 시 이전 표 삭제 후 새 표 기록 (옵션 교체)
 *  - 동일 옵션 클릭 시 해제 (토글)
 *  - endsAt 경과 시 자동 closed (조회 시 lazy 전환)
 */
@Service
@RequiredArgsConstructor
public class PollService {

    private static final int MIN_OPTIONS = 2;
    private static final int MAX_OPTIONS = 10;

    private final RoomPollRepository pollRepository;
    private final RoomPollOptionRepository optionRepository;
    private final RoomPollVoteRepository voteRepository;
    private final RoomRestaurantRepository restaurantRepository;
    private final UserRepository userRepository;
    private final RoomAccessService accessService;

    @Transactional
    public PollDetail create(String roomId, String userId, String title,
                              LocalDateTime endsAt, List<OptionInput> options) {
        accessService.requireMembership(roomId, userId);
        if (options == null || options.size() < MIN_OPTIONS || options.size() > MAX_OPTIONS) {
            throw ApiException.badRequest("선택지는 " + MIN_OPTIONS + "~" + MAX_OPTIONS + "개여야 합니다.");
        }

        Room room = accessService.loadRoom(roomId);
        User creator = userRepository.findById(userId)
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));

        RoomPoll poll = pollRepository.save(RoomPoll.builder()
            .room(room).createdBy(creator).title(title).endsAt(endsAt).build());

        for (OptionInput in : options) {
            RoomRestaurant restaurant = null;
            if (in.restaurantId() != null) {
                restaurant = restaurantRepository.findById(in.restaurantId())
                    .filter(r -> r.getRoom().getId().equals(roomId))
                    .orElse(null);
            }
            optionRepository.save(RoomPollOption.builder()
                .poll(poll).label(in.label()).restaurant(restaurant).build());
        }
        return buildDetail(poll, userId);
    }

    @Transactional
    public List<PollDetail> list(String roomId, String userId) {
        accessService.requireMembership(roomId, userId);

        List<RoomPoll> polls = pollRepository.findAllByRoomIdWithCreator(roomId);
        // 자동 마감
        LocalDateTime now = LocalDateTime.now();
        for (RoomPoll p : polls) {
            if (p.shouldAutoClose(now)) p.close();
        }
        return polls.stream().map(p -> buildDetail(p, userId)).toList();
    }

    /** 옵션에 투표. 같은 옵션 재클릭은 해제, 다른 옵션 클릭은 교체. */
    @Transactional
    public PollDetail vote(String roomId, String pollId, String optionId, String userId) {
        accessService.requireMembership(roomId, userId);
        RoomPoll poll = pollRepository.findByIdWithCreator(pollId)
            .orElseThrow(() -> ApiException.notFound("투표를 찾을 수 없습니다."));
        if (!poll.getRoom().getId().equals(roomId)) {
            throw ApiException.notFound("투표를 찾을 수 없습니다.");
        }
        if (poll.isClosed() || (poll.getEndsAt() != null && LocalDateTime.now().isAfter(poll.getEndsAt()))) {
            throw ApiException.badRequest("이미 마감된 투표입니다.");
        }

        RoomPollOption option = optionRepository.findByIdWithPoll(optionId)
            .orElseThrow(() -> ApiException.notFound("선택지를 찾을 수 없습니다."));
        if (!option.getPoll().getId().equals(pollId)) {
            throw ApiException.badRequest("선택지가 투표에 속하지 않습니다.");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));

        var existingOpt = voteRepository.findByPollIdAndUserId(pollId, userId);
        boolean toggleOff = existingOpt.isPresent()
            && existingOpt.get().getOption().getId().equals(optionId);

        existingOpt.ifPresent(v -> {
            voteRepository.delete(v);
            voteRepository.flush();
        });
        if (!toggleOff) {
            voteRepository.save(RoomPollVote.builder().option(option).user(user).build());
        }
        return buildDetail(poll, userId);
    }

    @Transactional
    public PollDetail close(String roomId, String pollId, String userId) {
        accessService.requireMembership(roomId, userId);
        RoomPoll poll = pollRepository.findByIdWithCreator(pollId)
            .orElseThrow(() -> ApiException.notFound("투표를 찾을 수 없습니다."));
        if (!poll.getRoom().getId().equals(roomId)) {
            throw ApiException.notFound("투표를 찾을 수 없습니다.");
        }
        if (!poll.getCreatedBy().getId().equals(userId)) {
            throw ApiException.forbidden("생성자만 마감할 수 있습니다.");
        }
        poll.close();
        return buildDetail(poll, userId);
    }

    // ─── Detail 조립 ─────────────────────────────────────────────────────

    private PollDetail buildDetail(RoomPoll poll, String userId) {
        List<RoomPollOption> options = optionRepository.findByPollIdWithRestaurant(poll.getId());
        List<String> optionIds = options.stream().map(RoomPollOption::getId).toList();

        Map<String, Long> voteCounts = new HashMap<>();
        if (!optionIds.isEmpty()) {
            for (Object[] row : voteRepository.countByOptionIds(optionIds)) {
                voteCounts.put((String) row[0], ((Number) row[1]).longValue());
            }
        }

        String myOptionId = voteRepository.findByPollIdAndUserId(poll.getId(), userId)
            .map(v -> v.getOption().getId()).orElse(null);

        long totalVotes = voteCounts.values().stream().mapToLong(Long::longValue).sum();

        List<OptionView> views = options.stream().map(o -> new OptionView(
            o.getId(), o.getLabel(),
            o.getRestaurant() == null ? null : o.getRestaurant().getId(),
            o.getRestaurant() == null ? null : o.getRestaurant().getName(),
            voteCounts.getOrDefault(o.getId(), 0L),
            o.getId().equals(myOptionId)
        )).toList();

        return new PollDetail(
            poll.getId(), poll.getTitle(), poll.getStatus(), poll.getEndsAt(),
            poll.getCreatedBy().getId(), poll.getCreatedBy().getNickname(),
            poll.getCreatedAt(), views, totalVotes, myOptionId
        );
    }

    // ─── 입력·반환 타입 ──────────────────────────────────────────────────

    public record OptionInput(String label, String restaurantId) {}

    public record OptionView(
        String id, String label, String restaurantId, String restaurantName,
        long voteCount, boolean votedByMe
    ) {}

    public record PollDetail(
        String id, String title, String status, LocalDateTime endsAt,
        String createdById, String createdByNickname, LocalDateTime createdAt,
        List<OptionView> options, long totalVotes, String myOptionId
    ) {}
}
