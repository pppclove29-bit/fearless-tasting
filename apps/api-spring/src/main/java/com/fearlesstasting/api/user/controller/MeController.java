package com.fearlesstasting.api.user.controller;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 내 정보 조회. JWT 인증 체인이 동작하는지 확인하는 스모크 엔드포인트이자
 * Nest `GET /users/me`와 동일한 응답 구조 유지.
 */
@Tag(name = "내 정보")
@RestController
@RequestMapping("/users/me")
@RequiredArgsConstructor
public class MeController {

    private final UserRepository userRepository;

    public record MeResponse(String id, String email, String nickname,
                             String profileImageUrl, String role, boolean pushEnabled) {
        static MeResponse from(User u) {
            return new MeResponse(u.getId(), u.getEmail(), u.getNickname(),
                u.getProfileImageUrl(), u.getRole(), u.isPushEnabled());
        }
    }

    @Operation(summary = "내 프로필 조회")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public MeResponse me(@CurrentUser AuthUserPrincipal principal) {
        User user = userRepository.findById(principal.userId())
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));
        return MeResponse.from(user);
    }
}
