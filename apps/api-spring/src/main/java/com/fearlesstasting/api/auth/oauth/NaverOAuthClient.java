package com.fearlesstasting.api.auth.oauth;

import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.config.AppProperties;
import java.net.URI;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

/** 네이버 OAuth: 인가 코드 → 액세스 토큰 → 프로필. */
@Slf4j
@Component
public class NaverOAuthClient {

    private static final String TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
    private static final String USER_URL = "https://openapi.naver.com/v1/nid/me";

    private final RestClient rest = RestClient.create();
    private final AppProperties props;

    public NaverOAuthClient(AppProperties props) {
        this.props = props;
    }

    public OAuthProfile fetchProfile(String code, String state) {
        String accessToken = exchangeCodeForToken(code, state);
        return fetchUserProfile(accessToken);
    }

    @SuppressWarnings("unchecked")
    private String exchangeCodeForToken(String code, String state) {
        URI uri = UriComponentsBuilder.fromHttpUrl(TOKEN_URL)
            .queryParam("grant_type", "authorization_code")
            .queryParam("client_id", props.oauth().naver().clientId())
            .queryParam("client_secret", props.oauth().naver().clientSecret())
            .queryParam("code", code)
            .queryParam("state", state == null ? "" : state)
            .build(true)
            .toUri();

        Map<String, Object> body = rest.get()
            .uri(uri)
            .retrieve()
            .onStatus(s -> !s.is2xxSuccessful(), (req, res) -> {
                log.warn("네이버 토큰 교환 실패 status={}", res.getStatusCode());
                throw ApiException.unauthorized("네이버 인증에 실패했습니다.");
            })
            .body(Map.class);

        if (body == null || body.get("access_token") == null) {
            throw ApiException.unauthorized("네이버 토큰 응답이 비어있습니다.");
        }
        return body.get("access_token").toString();
    }

    @SuppressWarnings("unchecked")
    private OAuthProfile fetchUserProfile(String accessToken) {
        Map<String, Object> body = rest.get()
            .uri(USER_URL)
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
            .retrieve()
            .onStatus(s -> !s.is2xxSuccessful(), (req, res) -> {
                throw ApiException.unauthorized("네이버 프로필 조회에 실패했습니다.");
            })
            .body(Map.class);

        if (body == null || body.get("response") == null) {
            throw ApiException.unauthorized("네이버 프로필이 비어있습니다.");
        }
        Map<String, Object> r = (Map<String, Object>) body.get("response");

        String providerId = (String) r.get("id");
        String email = (String) r.get("email");
        String nickname = (String) r.getOrDefault("nickname", r.get("name"));
        String imageUrl = (String) r.get("profile_image");

        if (email == null || email.isBlank()) {
            email = "naver_" + providerId + "@naver.fearless.local";
        }
        if (nickname == null || nickname.isBlank()) {
            nickname = "네이버유저_" + providerId;
        }

        return new OAuthProfile("naver", providerId, email, nickname, imageUrl);
    }
}
