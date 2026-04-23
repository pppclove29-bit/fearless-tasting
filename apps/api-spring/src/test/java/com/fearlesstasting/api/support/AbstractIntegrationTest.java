package com.fearlesstasting.api.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * 통합 테스트 베이스 클래스.
 *
 * <h3>어떻게 동작하나</h3>
 * <ul>
 *   <li>Testcontainers가 MySQL 8 컨테이너를 JVM 한 번에 1회만 띄움 (static + .start())</li>
 *   <li>{@code @DynamicPropertySource}로 컨테이너 주소를 application properties에 주입</li>
 *   <li>Flyway가 baseline 스키마를 자동 적용</li>
 *   <li>각 테스트 메소드는 {@code @Transactional}로 감싸면 자동 롤백 (하위 클래스 책임)</li>
 * </ul>
 *
 * <h3>왜 H2가 아닌 Testcontainers MySQL인가</h3>
 * <p>H2 MySQL 모드는 TiDB/MySQL과 동작이 미묘하게 다름 — 예: JSON 함수, FK 지연 제약, 정렬 locale.
 * 프로덕션 DB를 그대로 쓰는 Testcontainers가 프로덕션 버그 재현율이 훨씬 높다.</p>
 */
@SpringBootTest
@ActiveProfiles("integration")
@Testcontainers
public abstract class AbstractIntegrationTest {

    @SuppressWarnings("resource")
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0")
        .withDatabaseName("fearless_tasting_it")
        .withUsername("root")
        .withPassword("test")
        .withCommand("--character-set-server=utf8mb4", "--collation-server=utf8mb4_unicode_ci")
        .withReuse(true);

    static {
        MYSQL.start();
    }

    @DynamicPropertySource
    static void registerDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
    }
}
