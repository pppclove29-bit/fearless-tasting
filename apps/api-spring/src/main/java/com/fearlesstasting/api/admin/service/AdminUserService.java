package com.fearlesstasting.api.admin.service;

import com.fearlesstasting.api.auth.service.JwtService;
import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 관리자: 유저 검색 / 역할 변경 / 데모 로그인 발급. */
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final JwtService jwtService;

    @Transactional(readOnly = true)
    public User searchByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> ApiException.notFound("해당 이메일의 유저를 찾을 수 없습니다."));
    }

    @Transactional
    public User updateRole(String targetUserId, String role, String actorUserId) {
        if (targetUserId.equals(actorUserId)) {
            throw ApiException.badRequest("본인의 역할은 변경할 수 없습니다.");
        }
        if (!"admin".equals(role) && !"user".equals(role)) {
            throw ApiException.badRequest("유효하지 않은 역할입니다.");
        }
        User target = userRepository.findById(targetUserId)
            .orElseThrow(() -> ApiException.notFound("유저를 찾을 수 없습니다."));

        // User 엔티티에 role setter가 없으니 update 메소드 하나 추가 필요 — 여기서 우회하려면
        // reflection 또는 엔티티 확장. 엔티티에 updateRole 추가하는 게 정석.
        target.applyRole(role);
        return target;
    }

    /** 데모 계정으로 즉시 로그인 — access/refresh 쌍 반환. */
    @Transactional(readOnly = true)
    public DemoLoginResult issueDemoLogin(String userId) {
        userRepository.findById(userId)
            .orElseThrow(() -> ApiException.notFound("유저를 찾을 수 없습니다."));
        return new DemoLoginResult(
            jwtService.issueAccess(userId),
            jwtService.issueRefresh(userId)
        );
    }

    public record DemoLoginResult(String accessToken, String refreshToken) {}
}
