package com.fearlesstasting.api.auth.service;

import com.fearlesstasting.api.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * JWT 발급·검증. Nest `AuthService`의 토큰 발급 로직을 Java로 포팅.
 * payload는 기존과 동일하게 `sub = userId` 하나만 담아 가볍게 유지.
 */
@Slf4j
@Service
public class JwtService {

    private final SecretKey accessKey;
    private final SecretKey refreshKey;
    private final Duration accessTtl;
    private final Duration refreshTtl;

    public JwtService(AppProperties props) {
        this.accessKey = Keys.hmacShaKeyFor(props.jwt().accessSecret().getBytes(StandardCharsets.UTF_8));
        this.refreshKey = Keys.hmacShaKeyFor(props.jwt().refreshSecret().getBytes(StandardCharsets.UTF_8));
        this.accessTtl = Duration.ofSeconds(props.jwt().accessTtlSeconds());
        this.refreshTtl = Duration.ofSeconds(props.jwt().refreshTtlSeconds());
    }

    public String issueAccess(String userId) {
        return issue(userId, accessKey, accessTtl);
    }

    public String issueRefresh(String userId) {
        return issue(userId, refreshKey, refreshTtl);
    }

    public Duration accessTtl() {
        return accessTtl;
    }

    public Duration refreshTtl() {
        return refreshTtl;
    }

    private String issue(String userId, SecretKey key, Duration ttl) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(userId)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(ttl)))
            .signWith(key, Jwts.SIG.HS256)
            .compact();
    }

    /** @return userId (`sub` claim), 유효하지 않으면 null */
    public String parseAccess(String token) {
        return parse(token, accessKey);
    }

    public String parseRefresh(String token) {
        return parse(token, refreshKey);
    }

    private String parse(String token, SecretKey key) {
        if (token == null || token.isBlank()) return null;
        try {
            Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
            return claims.getSubject();
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("JWT 파싱 실패: {}", ex.getMessage());
            return null;
        }
    }
}
