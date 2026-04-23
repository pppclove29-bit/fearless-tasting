package com.fearlesstasting.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * application.yml 의 `app.*` 설정을 타입 세이프 바인딩.
 * Spring Boot 3 records + @ConfigurationProperties 조합으로 불변 객체 보장.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
    Jwt jwt,
    OAuth oauth,
    String frontendUrl,
    RateLimit rateLimit,
    Storage storage
) {
    public record Jwt(
        String accessSecret,
        String refreshSecret,
        long accessTtlSeconds,
        long refreshTtlSeconds
    ) {}

    public record OAuth(Kakao kakao, Naver naver) {
        public record Kakao(String clientId, String clientSecret, String redirectUri) {}
        public record Naver(String clientId, String clientSecret) {}
    }

    public record RateLimit(int defaultCapacity, int defaultRefillSeconds) {}

    /**
     * S3 호환 오브젝트 스토리지 설정.
     * Cloudflare R2를 쓰는 경우 endpoint에 `https://<accountId>.r2.cloudflarestorage.com` 지정.
     * 순정 AWS S3면 endpoint는 비워두고 region만 설정.
     */
    public record Storage(
        String endpoint,
        String region,
        String bucket,
        String accessKey,
        String secretKey,
        String publicBaseUrl,
        long presignExpireSeconds
    ) {}
}
