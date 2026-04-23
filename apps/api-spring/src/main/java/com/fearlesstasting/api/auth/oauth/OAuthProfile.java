package com.fearlesstasting.api.auth.oauth;

/**
 * OAuth 프로바이더에서 받은 프로필 정규화 형태.
 * 카카오/네이버/구글 등 프로바이더별 응답을 이 타입으로 맞춰 `AuthService`가 로그인 흐름을 통일.
 */
public record OAuthProfile(
    String provider,
    String providerId,
    String email,
    String nickname,
    String profileImageUrl
) {}
