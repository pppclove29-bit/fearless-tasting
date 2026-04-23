package com.fearlesstasting.api.auth.principal;

import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/**
 * SecurityContext에 저장되는 인증 주체. User 엔티티를 통째로 붙들지 않고
 * JWT 검증에 필요한 최소 필드(userId, role)만 보관 → per-request 비용 최소화.
 */
public record AuthUserPrincipal(String userId, String role) {

    public Collection<? extends GrantedAuthority> authorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
    }

    public boolean isAdmin() {
        return "admin".equalsIgnoreCase(role);
    }
}
