package com.fearlesstasting.api.auth.controller.dto;

import com.fearlesstasting.api.user.entity.User;

public record LoginResponse(
    String accessToken,
    String refreshToken,
    UserSummary user
) {
    public record UserSummary(String id, String email, String nickname, String profileImageUrl, String role) {
        public static UserSummary from(User u) {
            return new UserSummary(u.getId(), u.getEmail(), u.getNickname(), u.getProfileImageUrl(), u.getRole());
        }
    }

    public static LoginResponse of(String access, String refresh, User user) {
        return new LoginResponse(access, refresh, UserSummary.from(user));
    }
}
