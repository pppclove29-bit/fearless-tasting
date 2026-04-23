package com.fearlesstasting.api.room.service;

import com.fearlesstasting.api.room.repository.RoomVisitRepository;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 60일 이상 방문 안 한 고평점 식당 추천. */
@Service
@RequiredArgsConstructor
public class RevisitSuggestionService {

    private static final int DAYS_THRESHOLD = 60;

    private final RoomVisitRepository visitRepository;

    @Transactional(readOnly = true)
    public List<RevisitSuggestion> suggestionsFor(String userId) {
        LocalDate threshold = LocalDate.now().minusDays(DAYS_THRESHOLD);
        return visitRepository.findRevisitSuggestionsForUser(userId, threshold).stream()
            .map(row -> {
                LocalDate last = (LocalDate) row[6];
                long daysAgo = ChronoUnit.DAYS.between(last, LocalDate.now());
                double avg = ((Number) row[7]).doubleValue();
                long visitCount = ((Number) row[8]).longValue();
                return new RevisitSuggestion(
                    (String) row[0],             // restaurantId
                    (String) row[1],             // name
                    (String) row[2],             // address
                    (String) row[3],             // category
                    (String) row[4],             // roomId
                    (String) row[5],             // roomName
                    last,                         // lastVisit
                    (int) daysAgo,               // daysAgo
                    Math.round(avg * 10) / 10.0, // avgRating
                    (int) visitCount              // visitCount
                );
            }).toList();
    }

    /** Nest `RevisitSuggestion` shape 그대로. */
    public record RevisitSuggestion(
        String restaurantId, String name, String address, String category,
        String roomId, String roomName,
        LocalDate lastVisit, int daysAgo,
        double avgRating, int visitCount
    ) {}
}
