package com.fearlesstasting.api.room.service;

import com.fearlesstasting.api.room.entity.RoomReview;
import com.fearlesstasting.api.room.entity.RoomVisit;
import com.fearlesstasting.api.room.repository.RoomReviewRepository;
import com.fearlesstasting.api.room.repository.RoomVisitRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 방 타임라인. Nest `TimelineItem` shape을 그대로 맞춤:
 * <pre>{ type: 'visit_added' | 'review_added' | ..., date: ISO, data: Record }</pre>
 */
@Service
@RequiredArgsConstructor
public class RoomTimelineService {

    private static final int LIMIT = 50;

    private final RoomVisitRepository visitRepository;
    private final RoomReviewRepository reviewRepository;
    private final RoomAccessService accessService;

    @Transactional(readOnly = true)
    public List<TimelineItem> timeline(String roomId, String userId) {
        accessService.requireMembership(roomId, userId);

        List<TimelineItem> items = new ArrayList<>();

        for (RoomVisit v : visitRepository.findByRoomIdRecent(roomId, LIMIT)) {
            Map<String, Object> data = new HashMap<>();
            data.put("visitId", v.getId());
            data.put("restaurantId", v.getRestaurant().getId());
            data.put("restaurantName", v.getRestaurant().getName());
            data.put("visitedAt", v.getVisitedAt());
            data.put("actorId", v.getCreatedBy() == null ? null : v.getCreatedBy().getId());
            data.put("actorNickname", v.getCreatedBy() == null ? null : v.getCreatedBy().getNickname());
            items.add(new TimelineItem("visit_added", v.getCreatedAt(), data));
        }

        for (RoomReview r : reviewRepository.findByRoomIdRecent(roomId, LIMIT)) {
            Map<String, Object> data = new HashMap<>();
            data.put("reviewId", r.getId());
            data.put("visitId", r.getVisit().getId());
            data.put("restaurantId", r.getVisit().getRestaurant().getId());
            data.put("restaurantName", r.getVisit().getRestaurant().getName());
            data.put("rating", r.getRating());
            data.put("actorId", r.getUser().getId());
            data.put("actorNickname", r.getUser().getNickname());
            items.add(new TimelineItem("review_added", r.getCreatedAt(), data));
        }

        items.sort(Comparator.comparing(TimelineItem::date).reversed());
        return items.size() > LIMIT ? items.subList(0, LIMIT) : items;
    }

    public record TimelineItem(String type, LocalDateTime date, Map<String, Object> data) {}
}
