package com.fearlesstasting.api.auth.oauth;

import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.config.AppProperties;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/** 카카오 OAuth: 인가 코드 → 액세스 토큰 → 프로필. */
@Slf4j
@Component
public class KakaoOAuthClient {

    private static final String TOKEN_URL = "https://kauth.kakao.com/oauth/token";
    private static final String USER_URL = "https://kapi.kakao.com/v2/user/me";

    private final RestClient rest = RestClient.create();
    private final AppProperties props;

    public KakaoOAuthClient(AppProperties props) {
        this.props = props;
    }

    public OAuthProfile fetchProfile(String code) {
        String accessToken = exchangeCodeForToken(code);
        return fetchUserProfile(accessToken);
    }

    @SuppressWarnings("unchecked")
    private String exchangeCodeForToken(String code) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", props.oauth().kakao().clientId());
        if (props.oauth().kakao().clientSecret() != null && !props.oauth().kakao().clientSecret().isBlank()) {
            form.add("client_secret", props.oauth().kakao().clientSecret());
        }
        form.add("redirect_uri", props.oauth().kakao().redirectUri());
        form.add("code", code);

        Map<String, Object> body = rest.post()
            .uri(TOKEN_URL)
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(form)
            .retrieve()
            .onStatus(s -> !s.is2xxSuccessful(), (req, res) -> {
                log.warn("카카오 토큰 교환 실패 status={}", res.getStatusCode());
                throw ApiException.unauthorized("카카오 인증에 실패했습니다.");
            })
            .body(Map.class);

        if (body == null || body.get("access_token") == null) {
            throw ApiException.unauthorized("카카오 토큰 응답이 비어있습니다.");
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
                throw ApiException.unauthorized("카카오 프로필 조회에 실패했습니다.");
            })
            .body(Map.class);

        if (body == null || body.get("id") == null) {
            throw ApiException.unauthorized("카카오 프로필이 비어있습니다.");
        }

        String providerId = body.get("id").toString();
        Map<String, Object> account = (Map<String, Object>) body.getOrDefault("kakao_account", Map.of());
        Map<String, Object> profile = (Map<String, Object>) account.getOrDefault("profile", Map.of());

        String email = (String) account.get("email");
        String nickname = (String) profile.get("nickname");
        String imageUrl = (String) profile.get("profile_image_url");

        if (email == null || email.isBlank()) {
            // 카카오 이메일 동의 누락 대비: provider-scoped 가짜 이메일 생성
            email = "kakao_" + providerId + "@kakao.fearless.local";
        }
        if (nickname == null || nickname.isBlank()) {
            nickname = "카카오유저_" + providerId;
        }

        return new OAuthProfile("kakao", providerId, email, nickname, imageUrl);
    }
}
