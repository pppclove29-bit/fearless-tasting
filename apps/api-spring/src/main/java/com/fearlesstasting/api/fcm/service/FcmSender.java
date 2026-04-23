package com.fearlesstasting.api.fcm.service;

import java.util.Map;

/**
 * FCM 발송 추상화. 프로덕션은 Firebase Admin SDK 구현,
 * 테스트·로컬은 `NoopFcmSender`로 주입해 외부 호출 없이 동작.
 */
public interface FcmSender {
    void send(String token, String title, String body, Map<String, String> data);
}
