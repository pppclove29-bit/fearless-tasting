package com.fearlesstasting.api.common.ratelimit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 컨트롤러 메소드에 붙여 IP 기반 Rate Limit을 강제한다.
 *
 * <pre>
 * @RateLimit(capacity = 5, refillSeconds = 60)
 * @GetMapping("/auth/kakao/callback")
 * public ... { ... }
 * </pre>
 *
 * 미지정 시 전역 기본값(60회/60초, `app.rate-limit.default-*`)이 적용된다.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    /** 버킷 용량 (요청 허용 횟수) */
    int capacity();

    /** 용량을 완전히 재충전하는 주기(초) */
    int refillSeconds();
}
