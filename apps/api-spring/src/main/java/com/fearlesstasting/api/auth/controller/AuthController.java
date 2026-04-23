package com.fearlesstasting.api.auth.controller;

import com.fearlesstasting.api.auth.controller.dto.LoginResponse;
import com.fearlesstasting.api.auth.controller.dto.RefreshRequest;
import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.auth.service.AuthService;
import com.fearlesstasting.api.common.ratelimit.RateLimit;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * OAuth 콜백 + 토큰 갱신 + 로그아웃.
 * Nest `AuthController`와 엔드포인트·시그니처 동일 유지 (프론트 그대로 호출 가능).
 */
@Tag(name = "인증")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "카카오 로그인 진입 URL (302 리다이렉트)")
    @GetMapping("/kakao")
    public ResponseEntity<Void> kakaoRedirect() {
        String url = "https://kauth.kakao.com/oauth/authorize"
            + "?response_type=code"
            + "&client_id=" + URLEncoder.encode(authService.kakaoClientId(), StandardCharsets.UTF_8)
            + "&redirect_uri=" + URLEncoder.encode(authService.kakaoRedirectUri(), StandardCharsets.UTF_8);
        return ResponseEntity.status(302).header("Location", url).build();
    }

    @Operation(summary = "네이버 로그인 진입 URL (302 리다이렉트)")
    @GetMapping("/naver")
    public ResponseEntity<Void> naverRedirect(@RequestParam(required = false) String state) {
        String safeState = state == null ? "ft" : state;
        String redirectUri = authService.kakaoRedirectUri().replace("/auth/kakao/callback", "/auth/naver/callback");
        String url = "https://nid.naver.com/oauth2.0/authorize"
            + "?response_type=code"
            + "&client_id=" + URLEncoder.encode(authService.naverClientId(), StandardCharsets.UTF_8)
            + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
            + "&state=" + URLEncoder.encode(safeState, StandardCharsets.UTF_8);
        return ResponseEntity.status(302).header("Location", url).build();
    }

    @Operation(summary = "카카오 OAuth 콜백")
    @GetMapping("/kakao/callback")
    @RateLimit(capacity = 5, refillSeconds = 60)
    public LoginResponse kakaoCallback(@RequestParam String code) {
        var pair = authService.loginWithKakao(code);
        return LoginResponse.of(pair.accessToken(), pair.refreshToken(), pair.user());
    }

    @Operation(summary = "네이버 OAuth 콜백")
    @GetMapping("/naver/callback")
    @RateLimit(capacity = 5, refillSeconds = 60)
    public LoginResponse naverCallback(@RequestParam String code,
                                       @RequestParam(required = false) String state) {
        var pair = authService.loginWithNaver(code, state);
        return LoginResponse.of(pair.accessToken(), pair.refreshToken(), pair.user());
    }

    @Operation(summary = "리프레시 토큰 회전")
    @PostMapping("/refresh")
    @RateLimit(capacity = 5, refillSeconds = 60)
    public LoginResponse refresh(@Valid @RequestBody RefreshRequest req) {
        var pair = authService.refresh(req.refreshToken());
        return LoginResponse.of(pair.accessToken(), pair.refreshToken(), pair.user());
    }

    @Operation(summary = "로그아웃 (서버 측 refreshToken 무효화)")
    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> logout(@CurrentUser AuthUserPrincipal principal) {
        authService.logout(principal.userId());
        return ResponseEntity.noContent().build();
    }
}
