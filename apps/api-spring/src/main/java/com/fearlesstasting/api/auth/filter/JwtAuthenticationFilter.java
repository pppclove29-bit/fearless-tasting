package com.fearlesstasting.api.auth.filter;

import com.fearlesstasting.api.auth.principal.AuthUserPrincipal;
import com.fearlesstasting.api.auth.service.JwtService;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Authorization: Bearer &lt;access token&gt; 헤더를 검증하고 SecurityContext에
 * {@link AuthUserPrincipal}을 세팅한다. 토큰 없거나 실패해도 다음 필터로 넘겨 —
 * 인가 결정은 SecurityConfig에서.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String token = extractToken(request);
        if (token != null) {
            String userId = jwtService.parseAccess(token);
            if (userId != null) {
                Optional<User> user = userRepository.findById(userId);
                if (user.isPresent()) {
                    AuthUserPrincipal principal = new AuthUserPrincipal(user.get().getId(), user.get().getRole());
                    var auth = new UsernamePasswordAuthenticationToken(principal, null, principal.authorities());
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        }
        chain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith(BEARER_PREFIX)) return null;
        return header.substring(BEARER_PREFIX.length()).trim();
    }
}
