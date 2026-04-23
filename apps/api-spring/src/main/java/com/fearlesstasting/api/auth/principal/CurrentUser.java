package com.fearlesstasting.api.auth.principal;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

/**
 * Controller 메소드 파라미터에 현재 로그인 유저를 주입한다.
 *
 * <pre>
 * @GetMapping("/users/me")
 * public MeResponse me(@CurrentUser AuthUserPrincipal principal) { ... }
 * </pre>
 *
 * 내부적으로 Spring Security의 `@AuthenticationPrincipal`을 래핑만 함.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@AuthenticationPrincipal
public @interface CurrentUser {
}
