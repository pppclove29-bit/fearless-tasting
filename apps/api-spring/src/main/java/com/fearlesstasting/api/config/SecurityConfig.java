package com.fearlesstasting.api.config;

import com.fearlesstasting.api.auth.filter.JwtAuthenticationFilter;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Week 2: JWT 필터 체인 + 메소드 보안(@PreAuthorize) 활성화.
 * 공개 엔드포인트(/auth/**, /categories, /rooms/public/**, /health, /swagger 등)는 permitAll,
 * 나머지는 인증 필수. 관리자 전용은 컨트롤러에서 @PreAuthorize("hasRole('ADMIN')").
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final AppProperties props;
    private final JwtAuthenticationFilter jwtFilter;

    public SecurityConfig(AppProperties props, JwtAuthenticationFilter jwtFilter) {
        this.props = props;
        this.jwtFilter = jwtFilter;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(
                    "/health",
                    "/actuator/**",
                    "/swagger-ui/**",
                    "/swagger-ui",
                    "/v3/api-docs/**",
                    "/auth/**",
                    "/categories",
                    "/notices",
                    "/rooms/public/**"
                ).permitAll()
                .requestMatchers(HttpMethod.POST, "/inquiries").permitAll()
                .requestMatchers(HttpMethod.GET,
                    "/rankings", "/discover", "/rooms/platform-stats",
                    "/boards", "/boards/*", "/boards/*/posts", "/boards/*/posts/*",
                    "/boards/*/posts/*/comments"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(props.frontendUrl()));
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
