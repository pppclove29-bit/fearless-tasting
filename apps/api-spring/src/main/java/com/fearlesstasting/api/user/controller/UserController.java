package com.fearlesstasting.api.user.controller;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.principal.CurrentUser;
import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.entity.UserTutorialProgress;
import com.fearlesstasting.api.user.repository.UserRepository;
import com.fearlesstasting.api.user.repository.UserTutorialProgressRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 내 프로필 수정 / 푸시 토글 / 온보딩 / 튜토리얼 진행. */
@Tag(name = "유저")
@RestController
@RequestMapping("/users/me")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class UserController {

    private final UserRepository userRepository;
    private final UserTutorialProgressRepository tutorialRepository;

    public record UpdateMeRequest(
        @Size(max = 20) String nickname,
        @Size(max = 500) String profileImageUrl,
        Boolean pushEnabled
    ) {}

    public record TutorialRequest(@NotBlank @Size(max = 50) String tutorialKey) {}

    @Operation(summary = "내 정보 수정")
    @PatchMapping
    @Transactional
    public Map<String, Object> updateMe(@CurrentUser AuthUserPrincipal principal,
                                         @Valid @RequestBody UpdateMeRequest req) {
        User user = userRepository.findById(principal.userId())
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));

        if (req.nickname() != null) {
            String trimmed = req.nickname().trim();
            if (trimmed.isBlank()) throw ApiException.badRequest("닉네임을 입력해주세요.");
            if (!trimmed.equals(user.getNickname())
                && userRepository.existsByNicknameAndIdNot(trimmed, user.getId())) {
                throw ApiException.conflict("이미 사용 중인 닉네임입니다.");
            }
            user.updateNickname(trimmed);
        }
        if (req.profileImageUrl() != null) {
            user.updateProfileImage(req.profileImageUrl().isBlank() ? null : req.profileImageUrl());
        }
        if (req.pushEnabled() != null) {
            user.updatePushEnabled(req.pushEnabled());
        }
        return Map.of(
            "id", user.getId(),
            "nickname", user.getNickname(),
            "profileImageUrl", user.getProfileImageUrl() == null ? "" : user.getProfileImageUrl(),
            "pushEnabled", user.isPushEnabled()
        );
    }

    @Operation(summary = "온보딩 완료 처리")
    @PostMapping("/onboarding-complete")
    @Transactional
    public Map<String, Object> completeOnboarding(@CurrentUser AuthUserPrincipal principal) {
        User user = userRepository.findById(principal.userId())
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));
        user.completeOnboarding();
        return Map.of("onboardingCompletedAt", user.getOnboardingCompletedAt());
    }

    @Operation(summary = "튜토리얼 진행 목록")
    @GetMapping("/tutorials")
    @Transactional(readOnly = true)
    public List<String> listTutorials(@CurrentUser AuthUserPrincipal principal) {
        return tutorialRepository.findAllByUserId(principal.userId()).stream()
            .map(UserTutorialProgress::getTutorialKey).toList();
    }

    @Operation(summary = "튜토리얼 완료 기록")
    @PostMapping("/tutorials")
    @Transactional
    public Map<String, Object> completeTutorial(@CurrentUser AuthUserPrincipal principal,
                                                 @Valid @RequestBody TutorialRequest req) {
        if (tutorialRepository.findByUserIdAndTutorialKey(principal.userId(), req.tutorialKey()).isPresent()) {
            return Map.of("tutorialKey", req.tutorialKey(), "alreadyCompleted", true);
        }
        User user = userRepository.findById(principal.userId())
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));
        tutorialRepository.save(UserTutorialProgress.builder()
            .user(user).tutorialKey(req.tutorialKey()).build());
        return Map.of("tutorialKey", req.tutorialKey(), "alreadyCompleted", false);
    }
}
