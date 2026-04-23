package com.fearlesstasting.api.common.ratelimit;

import com.fearlesstasting.api.config.AppProperties;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * IP + 엔드포인트(핸들러 메소드) 조합으로 Bucket4j 버킷을 캐시해 Rate Limit 강제.
 *
 * <h3>면접 어필 포인트</h3>
 * <ul>
 *   <li><b>토큰 버킷 알고리즘</b>: 순간 버스트 허용 + 일정 비율 재충전. TTL 기반(Nest ThrottlerGuard)과 대비</li>
 *   <li><b>핸들러 메소드 어노테이션</b>: `@RateLimit` 유무·값에 따라 per-endpoint 정책 override</li>
 *   <li><b>단일 JVM 인스턴스 전제</b>: ConcurrentHashMap 사용. 멀티 인스턴스 환경은 bucket4j-redis로 전환</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitInterceptor implements HandlerInterceptor {

    private final AppProperties props;
    private final ConcurrentMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod method)) return true;

        int capacity;
        int refillSeconds;
        RateLimit annotation = method.getMethodAnnotation(RateLimit.class);
        if (annotation != null) {
            capacity = annotation.capacity();
            refillSeconds = annotation.refillSeconds();
        } else {
            capacity = props.rateLimit().defaultCapacity();
            refillSeconds = props.rateLimit().defaultRefillSeconds();
        }

        String key = bucketKey(request, method, capacity, refillSeconds);
        Bucket bucket = buckets.computeIfAbsent(key, k -> newBucket(capacity, refillSeconds));

        if (bucket.tryConsume(1)) return true;

        log.warn("Rate limit exceeded key={} remaining=0", key);
        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(refillSeconds));
        return false;
    }

    private Bucket newBucket(int capacity, int refillSeconds) {
        Bandwidth limit = Bandwidth.classic(capacity, Refill.greedy(capacity, Duration.ofSeconds(refillSeconds)));
        return Bucket.builder().addLimit(limit).build();
    }

    private String bucketKey(HttpServletRequest request, HandlerMethod method, int capacity, int refillSeconds) {
        // X-Forwarded-For 지원 (클라우드플레어/ALB 뒤)
        String forwarded = request.getHeader("X-Forwarded-For");
        String ip = forwarded != null && !forwarded.isBlank()
            ? forwarded.split(",")[0].trim()
            : request.getRemoteAddr();
        // endpoint-specific: 같은 IP라도 /auth/* 와 /rooms 버킷 분리
        return ip + "::" + method.getBeanType().getSimpleName() + "#" + method.getMethod().getName()
            + "::" + capacity + "/" + refillSeconds;
    }
}
