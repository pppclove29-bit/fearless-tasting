package com.fearlesstasting.api.places;

import com.fearlesstasting.api.config.AppProperties;
import java.net.URI;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * 네이버 로컬 장소 검색. Nest `PlacesService.searchNaver()` 포팅.
 * NAVER_SEARCH_CLIENT_ID/SECRET 환경변수가 필요. 미설정 시 빈 결과 반환.
 */
@Slf4j
@Service
public class PlacesService {

    private static final String BASE = "https://openapi.naver.com/v1/search/local.json";
    private final RestClient rest = RestClient.create();

    private final String clientId;
    private final String clientSecret;

    public PlacesService(
        @Value("${naver.search.client-id:${naver.client-id:}}") String clientId,
        @Value("${naver.search.client-secret:${naver.client-secret:}}") String clientSecret,
        AppProperties props
    ) {
        // app.oauth.naver.* 에도 있지만 검색 전용 앱을 따로 쓰는 경우 NAVER_SEARCH_* 우선
        String fallbackId = props.oauth() != null && props.oauth().naver() != null
            ? props.oauth().naver().clientId() : null;
        String fallbackSecret = props.oauth() != null && props.oauth().naver() != null
            ? props.oauth().naver().clientSecret() : null;
        this.clientId = (clientId != null && !clientId.isBlank()) ? clientId : fallbackId;
        this.clientSecret = (clientSecret != null && !clientSecret.isBlank()) ? clientSecret : fallbackSecret;
    }

    public SearchResult searchNaver(String query, int start) {
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            return new SearchResult(List.of(), "missing_credentials", start, false);
        }
        if (query == null || query.trim().length() < 2) {
            return new SearchResult(List.of(), "query_too_short", start, false);
        }
        int safeStart = Math.min(Math.max(1, start), 1000);
        URI uri = UriComponentsBuilder.fromHttpUrl(BASE)
            .queryParam("query", query)
            .queryParam("display", 5)
            .queryParam("start", safeStart)
            .queryParam("sort", "random")
            .build(true)
            .toUri();

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = rest.get()
                .uri(uri)
                .header("X-Naver-Client-Id", clientId)
                .header("X-Naver-Client-Secret", clientSecret)
                .retrieve()
                .onStatus(HttpStatusCode::isError, (req, res) -> {
                    throw new RuntimeException("naver_error_" + res.getStatusCode().value());
                })
                .body(Map.class);

            if (body == null) return new SearchResult(List.of(), "empty_body", safeStart, false);
            Object totalObj = body.get("total");
            int total = totalObj == null ? 0 : ((Number) totalObj).intValue();

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) body.getOrDefault("items", List.of());
            List<PlaceItem> list = items.stream().map(m -> new PlaceItem(
                "naver",
                stripHtml((String) m.get("title")),
                (String) m.get("address"),
                (String) m.get("roadAddress"),
                (String) m.get("category"),
                (String) m.get("telephone"),
                (String) m.get("mapx"),
                (String) m.get("mapy")
            )).toList();

            boolean hasMore = safeStart + list.size() <= Math.min(total, 1000) && list.size() == 5;
            String reason = list.isEmpty() ? "zero_results_total_" + total : "ok";
            return new SearchResult(list, reason, safeStart, hasMore);
        } catch (Exception ex) {
            log.warn("Naver 검색 예외 query={} err={}", query, ex.getMessage());
            return new SearchResult(List.of(), "exception", safeStart, false);
        }
    }

    private static String stripHtml(String s) {
        return s == null ? "" : s.replaceAll("<[^>]+>", "");
    }

    public record PlaceItem(
        String source, String name, String address, String roadAddress,
        String category, String telephone, String mapx, String mapy
    ) {}

    public record SearchResult(List<PlaceItem> items, String reason, int start, boolean hasMore) {}
}
