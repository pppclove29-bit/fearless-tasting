package com.fearlesstasting.api.auth.service;

import com.fearlesstasting.api.auth.entity.Account;
import com.fearlesstasting.api.auth.oauth.KakaoOAuthClient;
import com.fearlesstasting.api.auth.oauth.NaverOAuthClient;
import com.fearlesstasting.api.auth.oauth.OAuthProfile;
import com.fearlesstasting.api.auth.repository.AccountRepository;
import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.config.AppProperties;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import java.security.SecureRandom;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * OAuth 로그인 + 토큰 발급 + 리프레시 회전.
 * Nest `AuthService`의 kakaoCallback/naverCallback/refresh/logout을 1:1 포팅.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final KakaoOAuthClient kakaoClient;
    private final NaverOAuthClient naverClient;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final JwtService jwtService;
    private final AppProperties props;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom rng = new SecureRandom();

    public String kakaoClientId() { return props.oauth().kakao().clientId(); }
    public String kakaoRedirectUri() { return props.oauth().kakao().redirectUri(); }
    public String naverClientId() { return props.oauth().naver().clientId(); }

    public TokenPair loginWithKakao(String code) {
        OAuthProfile profile = kakaoClient.fetchProfile(code);
        return loginOrRegister(profile);
    }

    public TokenPair loginWithNaver(String code, String state) {
        OAuthProfile profile = naverClient.fetchProfile(code, state);
        return loginOrRegister(profile);
    }

    @Transactional
    protected TokenPair loginOrRegister(OAuthProfile profile) {
        Account account = accountRepository
            .findByProviderAndProviderIdWithUser(profile.provider(), profile.providerId())
            .orElseGet(() -> registerNewUser(profile));

        User user = account.getUser();
        return issueTokens(user, account);
    }

    private Account registerNewUser(OAuthProfile profile) {
        String nickname = uniqueNickname(profile.nickname());
        User user = User.builder()
            .email(profile.email())
            .nickname(nickname)
            .profileImageUrl(profile.profileImageUrl())
            .role("user")
            .pushEnabled(true)
            .build();
        userRepository.save(user);

        Account account = Account.builder()
            .provider(profile.provider())
            .providerId(profile.providerId())
            .user(user)
            .build();
        return accountRepository.save(account);
    }

    private String uniqueNickname(String base) {
        String candidate = base;
        int attempt = 0;
        while (userRepository.existsByNickname(candidate)) {
            candidate = base + "_" + (rng.nextInt(9000) + 1000);
            if (++attempt > 10) {
                throw ApiException.conflict("닉네임 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
            }
        }
        return candidate;
    }

    /** 리프레시 토큰 검증 + 회전. bcrypt 비교로 탈취 토큰 거부. */
    @Transactional
    public TokenPair refresh(String refreshToken) {
        String userId = jwtService.parseRefresh(refreshToken);
        if (userId == null) throw ApiException.unauthorized("리프레시 토큰이 유효하지 않습니다.");

        Account account = accountRepository.findByUserIdWithUser(userId)
            .orElseThrow(() -> ApiException.unauthorized("계정을 찾을 수 없습니다."));

        String stored = account.getRefreshToken();
        if (stored == null || !passwordEncoder.matches(refreshToken, stored)) {
            throw ApiException.unauthorized("리프레시 토큰이 일치하지 않습니다.");
        }

        return issueTokens(account.getUser(), account);
    }

    /** 로그아웃: 저장된 refreshToken 무효화 (fire-and-forget은 컨트롤러에서). */
    @Transactional
    public void logout(String userId) {
        accountRepository.findByUserIdWithUser(userId)
            .ifPresent(a -> a.updateRefreshToken(null));
    }

    private TokenPair issueTokens(User user, Account account) {
        String access = jwtService.issueAccess(user.getId());
        String refresh = jwtService.issueRefresh(user.getId());
        account.updateRefreshToken(passwordEncoder.encode(refresh));
        user.markActive();
        return new TokenPair(access, refresh, user);
    }

    public record TokenPair(String accessToken, String refreshToken, User user) {}
}
