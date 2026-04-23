package com.fearlesstasting.api.common.util;

import java.security.SecureRandom;
import java.time.Instant;

/**
 * 기존 Prisma cuid 포맷 호환용 생성기.
 * cuid v1 규격: c{timestamp 8-char base36}{counter 4}{fingerprint 4}{random 8} → 총 25자.
 * 정확한 Prisma cuid v1을 100% 재현하진 않지만, 길이·접두사·기본 구조를 맞추어 기존 DB와 공존 가능.
 * 신규 생성분만 이 포맷을 따르고, 기존 cuid는 그대로 유지됨.
 */
public final class CuidGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final char PREFIX = 'c';
    private static final int COUNTER_MAX = 36 * 36 * 36 * 36; // base36 4자리

    private static int counter = RANDOM.nextInt(COUNTER_MAX);
    private static final String FINGERPRINT = fingerprint();

    private CuidGenerator() {}

    public static synchronized String generate() {
        String timestamp = padLeft(Long.toString(Instant.now().toEpochMilli(), 36), 8);
        String count = padLeft(Integer.toString(counter++ % COUNTER_MAX, 36), 4);
        String rnd = padLeft(Long.toString(Math.abs(RANDOM.nextLong()) % Long.parseLong("zzzzzzzz", 36), 36), 8);
        return PREFIX + timestamp + count + FINGERPRINT + rnd;
    }

    private static String fingerprint() {
        int pid = (int) (ProcessHandle.current().pid() % COUNTER_MAX);
        int host = Math.abs(System.getProperty("user.name", "spring").hashCode()) % COUNTER_MAX;
        return padLeft(Integer.toString(pid, 36), 2) + padLeft(Integer.toString(host, 36), 2);
    }

    private static String padLeft(String s, int length) {
        StringBuilder sb = new StringBuilder();
        for (int i = s.length(); i < length; i++) sb.append('0');
        sb.append(s);
        return sb.substring(sb.length() - length);
    }
}
