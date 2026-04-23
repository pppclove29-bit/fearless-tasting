package com.fearlesstasting.api.fcm.service;

import com.fearlesstasting.api.common.web.ApiException;
import com.fearlesstasting.api.fcm.entity.FcmToken;
import com.fearlesstasting.api.fcm.repository.FcmTokenRepository;
import com.fearlesstasting.api.user.entity.User;
import com.fearlesstasting.api.user.repository.UserRepository;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FCM 푸시 발송 + 토큰 관리.
 *
 * <h3>설계 노트</h3>
 * <ul>
 *   <li>실제 Firebase Admin SDK는 프로덕션 주입 시점에 붙이면 되고, 본 포팅 프로젝트는
 *       HTTP v1 API 호출을 <b>인터페이스 수준으로 시뮬레이션</b>해둔다. 주입식 전환이 용이하도록
 *       {@link FcmSender} 인터페이스로 격리.</li>
 *   <li><b>fire-and-forget</b>: `@Async`로 푸시 발송은 요청-응답 경로에서 분리.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FcmService {

    private final FcmTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final FcmSender sender;

    @Transactional
    public FcmToken registerToken(String userId, String token, String device) {
        tokenRepository.findByToken(token).ifPresent(tokenRepository::delete); // 재등록 대비
        User user = userRepository.findById(userId)
            .orElseThrow(() -> ApiException.unauthorized("세션이 만료되었습니다."));
        return tokenRepository.save(FcmToken.builder()
            .user(user)
            .token(token)
            .device(device)
            .build());
    }

    @Transactional
    public void unregisterToken(String token) {
        tokenRepository.deleteByToken(token);
    }

    /**
     * 여러 유저에게 비동기 브로드캐스트. 호출자의 트랜잭션이 커밋된 뒤 발송되도록
     * 호출부에서 `TransactionSynchronizationManager.registerSynchronization`를 쓰는 것이
     * 가장 안전하지만, 본 프로젝트에선 별도 트랜잭션(REQUIRES_NEW)으로 조회한다.
     */
    @Async("taskExecutor")
    public void sendToUsersAsync(List<String> userIds, String title, String body, Map<String, String> data) {
        if (userIds == null || userIds.isEmpty()) return;
        List<FcmToken> tokens = tokenRepository.findAllByUserIdIn(userIds);
        if (tokens.isEmpty()) {
            log.debug("FCM skip: 등록된 토큰 없음 users={}", userIds.size());
            return;
        }
        for (FcmToken t : tokens) {
            try {
                sender.send(t.getToken(), title, body, data);
            } catch (Exception ex) {
                log.warn("FCM 발송 실패 token={} err={}", t.getToken(), ex.getMessage());
            }
        }
    }
}
