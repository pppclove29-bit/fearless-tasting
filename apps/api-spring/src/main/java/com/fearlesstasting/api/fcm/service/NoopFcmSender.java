package com.fearlesstasting.api.fcm.service;

import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

/**
 * Firebase Admin SDK가 주입되지 않은 환경(개발/로컬/테스트)용 기본 sender.
 * 실제 프로덕션에는 별도 FirebaseFcmSender @Primary 빈으로 덮어씀.
 */
@Slf4j
@Component
@ConditionalOnMissingBean(name = "firebaseFcmSender")
public class NoopFcmSender implements FcmSender {

    @Override
    public void send(String token, String title, String body, Map<String, String> data) {
        log.debug("[FCM-noop] token={} title={} body={} data={}", mask(token), title, body, data);
    }

    private String mask(String token) {
        if (token == null || token.length() < 8) return "***";
        return token.substring(0, 4) + "…" + token.substring(token.length() - 4);
    }
}

@Configuration
class FcmSenderConfig {
    // 추가 구성이 필요하면 여기에 — 현재는 NoopFcmSender 빈만 존재.
}
