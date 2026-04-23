package com.fearlesstasting.api.poll.controller.dto;

import com.fearlesstasting.api.poll.service.PollService;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Nest `Poll` 타입 shape.
 * <pre>
 * { id, title, roomId, status, endsAt, createdAt,
 *   createdBy: { id, nickname },
 *   options: [{ id, label, restaurantId, restaurant, votes: [{ id, userId, user }] }] }
 * </pre>
 */
public record PollView(
    String id,
    String title,
    String roomId,
    String status,
    LocalDateTime endsAt,
    LocalDateTime createdAt,
    Creator createdBy,
    List<OptionView> options
) {
    public record Creator(String id, String nickname) {}

    public record UserBrief(String id, String nickname) {}

    public record VoteView(String id, String userId, UserBrief user) {}

    public record RestaurantBrief(String id, String name) {}

    public record OptionView(
        String id,
        String label,
        String restaurantId,
        RestaurantBrief restaurant,
        List<VoteView> votes
    ) {}

    public static PollView fromService(PollService.PollDetail d, String roomId) {
        // PollService의 OptionView에 votes[] 상세가 없어 단순화 버전으로 변환
        // (Nest는 user 배열을 내려주지만 Spring은 count와 myVote만 있음 → votes[] 배열은 빈 배열로)
        var opts = d.options().stream().map(o -> new OptionView(
            o.id(), o.label(), o.restaurantId(),
            o.restaurantId() == null ? null : new RestaurantBrief(o.restaurantId(), o.restaurantName()),
            List.of()  // 투표자 상세는 향후 확장
        )).toList();
        return new PollView(
            d.id(), d.title(), roomId, d.status(), d.endsAt(), d.createdAt(),
            new Creator(d.createdById(), d.createdByNickname()),
            opts
        );
    }
}
