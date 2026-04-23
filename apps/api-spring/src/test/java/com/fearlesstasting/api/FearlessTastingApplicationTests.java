package com.fearlesstasting.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/** Week 1 스모크 테스트: Spring 컨텍스트가 정상 로드되는지만 확인. */
@SpringBootTest
@ActiveProfiles("test")
class FearlessTastingApplicationTests {

    @Test
    void contextLoads() {
        // 컨텍스트 로드 실패 시 테스트 자동 실패
    }
}
