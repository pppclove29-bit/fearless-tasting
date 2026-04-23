# Fearless Tasting API · Spring Boot

> 📸 **Portfolio Snapshot** — 2026-04-23 기준 NestJS API([apps/api](../api/))를 Spring Boot 3.3 + Java 21로 포팅한 결과물입니다.
> 본 서비스(무모한 시식가)는 **계속 Nest로 운영 중**이며, 이 디렉토리는 Java/Spring 실력 시연용으로 **의도적으로 동결**되었습니다.
> 스택 단일화는 유저 규모·팀 구성 변화에 따라 향후 재검토 예정입니다.

NestJS로 구현된 [apps/api](../api/)를 포트폴리오 목적으로 Spring Boot 3.3 + Java 21로 포팅한 프로젝트입니다.

## 기술 스택

| 계층 | 스택 |
|---|---|
| Runtime | Java 21 (Temurin) |
| Framework | Spring Boot 3.3 |
| ORM | Spring Data JPA (Hibernate 6) + QueryDSL 5 |
| Migration | Flyway 10 |
| Auth | Spring Security + jjwt 0.12 |
| DTO Mapping | MapStruct 1.6 |
| API Docs | springdoc-openapi 2.6 (Swagger UI) |
| Rate Limit | Bucket4j 8 |
| Build | Gradle 8.10 (Kotlin DSL) |
| Test | JUnit 5, Spring Security Test, Testcontainers MySQL, H2 |

## 디렉토리 구조

```
apps/api-spring/
├── build.gradle.kts              # 빌드 + 의존성
├── settings.gradle.kts
├── Dockerfile                    # 멀티 스테이지 + non-root 유저
├── src/main/java/com/fearlesstasting/api/
│   ├── FearlessTastingApplication.java
│   ├── common/
│   │   ├── entity/BaseTimeEntity.java   # JPA Auditing (createdAt/updatedAt)
│   │   ├── util/CuidGenerator.java      # Prisma cuid 호환 ID 생성기
│   │   └── web/                          # ApiException, ErrorResponse, GlobalExceptionHandler
│   ├── config/SecurityConfig.java       # SecurityFilterChain + CORS
│   ├── health/HealthController.java
│   ├── user/entity/User.java
│   ├── auth/entity/Account.java
│   ├── room/entity/                     # Room, RoomMember, RoomRestaurant
│   └── category/                        # entity + repository + service + controller
└── src/main/resources/
    ├── application.yml                  # 공통 + 프로파일 라우팅
    ├── application-dev.yml              # 로컬 MySQL
    ├── application-prod.yml             # 운영 (로그 WARN)
    └── db/migration/V1__baseline.sql    # Flyway 베이스라인
```

## NestJS → Spring 매핑 표

| NestJS / Prisma | Spring / JPA |
|---|---|
| `@Module` + `providers` | `@Configuration` + `@ComponentScan` (기본) |
| `@Controller` + `class-validator` | `@RestController` + `@Valid` + `record` DTO |
| `@Injectable()` + 생성자 주입 | `@Service` + `@RequiredArgsConstructor` (Lombok) |
| Prisma schema.prisma | `@Entity` JPA + Flyway SQL |
| `prisma.write.$transaction` | `@Transactional` (AOP) |
| `prisma.read` / `prisma.write` | `@Transactional(readOnly = true)` 힌트 |
| `JwtAuthGuard` / `AdminGuard` | Spring Security `SecurityFilterChain` + filter |
| `@Throttle({ ttl, limit })` | Bucket4j interceptor / filter |
| `APP_GUARD` 전역 Throttler | SecurityConfig + custom filter |
| `@nestjs/swagger` `@ApiOperation` | springdoc `@Operation` / `@Tag` |
| `cuid` | `CuidGenerator` (Prisma 호환) |
| Reader/Writer 분리 | `AbstractRoutingDataSource` + `@Transactional(readOnly=true)` |

## 실행

### 로컬 개발
```bash
# 1) 로컬 MySQL 8 실행 (Docker)
docker run -d --name ft-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=fearless_tasting_spring \
  -p 3306:3306 mysql:8

# 2) Gradle 래퍼로 실행 (JDK 21 필요)
cd apps/api-spring
./gradlew bootRun
# → http://localhost:8080/health
# → http://localhost:8080/swagger-ui
```

> ⚠️ 최초 체크아웃 시 Gradle 래퍼 JAR이 없으면 `gradle wrapper --gradle-version 8.10.2` 실행. 이후 `./gradlew` 사용.

### 프로덕션 빌드 & Docker
```bash
./gradlew bootJar
docker build -t fearless-tasting-api-spring .
docker run -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DATABASE_URL=jdbc:mysql://... \
  -e DATABASE_USERNAME=... \
  -e DATABASE_PASSWORD=... \
  -e JWT_ACCESS_SECRET=... \
  fearless-tasting-api-spring
```

## 주차별 포팅 로드맵

| 주차 | 범위 | 어필 포인트 |
|---|---|---|
| **Week 1** ✅ | Gradle 스캐폴드, Flyway baseline, 핵심 JPA 엔티티(User/Account/Room/RoomMember/RoomRestaurant/Category/CategoryMapping), SecurityConfig stub, GlobalExceptionHandler, Health, CategoryService CRUD | 프로젝트 구조, 예외 처리 표준화 |
| **Week 2** ✅ | `AppProperties` 타입 세이프 바인딩, `JwtService` (jjwt 0.12), `JwtAuthenticationFilter`, `AuthUserPrincipal` + `@CurrentUser`, Kakao/Naver OAuth 클라이언트(RestClient), `AuthService` (로그인·리프레시 회전·로그아웃), `AuthController`, SecurityFilterChain 본편 + `@EnableMethodSecurity`, `/users/me` 스모크 | SecurityFilterChain, OncePerRequestFilter, bcrypt 회전, `@ConfigurationProperties` records |
| **Week 3** ✅ | RoomKick/RoomVisit/RoomReview/RoomRestaurantImage 엔티티 + Flyway, `QuerydslConfig`, `RoomAccessService` (멤버/매니저/owner 도메인 가드), `RoomService` (CRUD + 초대 코드 + 강퇴 차단 + 최대 인원 정책), `RoomRestaurantService` (QueryDSL 동적 검색 + 리뷰 집계 group-by), `RoomController` + `RoomRestaurantController` | **QueryDSL BooleanBuilder**, null-safe 동적 조건, N+1 방지 group-by 집계, Pageable 변환, 도메인 가드 서비스 |
| **Week 4** ✅ | `RoomVisitService` (생성자/매니저 권한), `RoomReviewService` (1 visit 1 user 1 review, DB unique + 친절한 메시지), `RoomStatsService` (summary + 카테고리 분포, JPQL group by), 컨트롤러 3종, **Testcontainers MySQL 통합 테스트** (AbstractIntegrationTest, RoomService/RoomRestaurantService IT) | JPA dirty checking, `@Transactional @Rollback` 테스트, Testcontainers reuse, 카테고리 해석 매핑/미매핑 behavior 검증 |
| **Week 5** ✅ | `@RateLimit` 어노테이션 + Bucket4j 인터셉터(IP + endpoint 스코프), `AsyncConfig` (ThreadPoolTaskExecutor + CallerRuns), `FcmToken` 엔티티 + Flyway, `FcmService.sendToUsersAsync()`, `FcmSender` 추상화(Noop/Firebase 주입 가능), S3/R2 호환 `StorageService` — 프리사인드 업로드 URL + 유저별 폴더 스코프 + MIME/크기 화이트리스트 | 토큰 버킷 알고리즘, 메소드 핸들러 어노테이션 스캐닝, `@Async` fire-and-forget, AWS SDK v2 `S3Presigner`, path traversal 방어 |
| **Week 6** ✅ | `AdminCategoryController` (카테고리 CRUD + 매핑 대기 큐 + 매핑 upsert with **벌크 UPDATE**), `Notice` 공개·관리자 CRUD, `Inquiry` 공개 등록 + 관리자 목록, `@PreAuthorize("hasRole('ADMIN')")` 일괄 적용, **GitHub Actions CI** (JDK 21 + Gradle + Testcontainers) | 관리자 API 완결, JPA `@Modifying` 벌크 업데이트, 역할 기반 인가, CI 파이프라인 |
| **Week 7** ✅ | **풀 마이그레이션** — Polls(3 entities + toggle/교체/자동마감), RoomVisitParticipant, RoomNotification + 비동기 FCM 브로드캐스트, PublicRoom(/rooms/public/*), RoomMember(역할·강퇴·위임·탈퇴), Wishlist/Similar/Timeline, Discover/Rankings/PlatformStats, UserController(닉네임/푸시/온보딩/튜토리얼), 커뮤니티(Board/Post/Comment/Like/Bookmark/PostRestaurant), AdminBoard, AdminUser/Demo/Stats, Places(Naver 검색), Auth OAuth redirect URLs | Nest 패리티 완성, `@Async` 알림 fire-and-forget, 익명 댓글/게시글 처리, 데모 로그인 JWT 발급 |

## 현재 상태 (Week 2 완료)

### Week 1
- ✅ 프로젝트 스캐폴드, Gradle + JDK 21 toolchain
- ✅ Flyway V1 baseline — 기존 Prisma 마이그레이션 결과 스키마 그대로
- ✅ JPA Auditing + BaseTimeEntity
- ✅ 핵심 엔티티 7개 (User, Account, Room, RoomMember, RoomRestaurant, Category, CategoryMapping)
- ✅ `CategoryService.resolve()` — Nest 해석 로직 100% 포팅
- ✅ GlobalExceptionHandler + ApiException

### Week 2
- ✅ `AppProperties` — `app.jwt`, `app.oauth`, `app.frontend-url` 타입 세이프
- ✅ `JwtService` — HS256, access 15m / refresh 7d, `sub=userId` 페이로드
- ✅ `JwtAuthenticationFilter` (OncePerRequestFilter) → SecurityContext 세팅
- ✅ `AuthUserPrincipal` + `@CurrentUser` 파라미터 리졸버
- ✅ `KakaoOAuthClient`, `NaverOAuthClient` — Spring 6 RestClient, 이메일 동의 누락 대비 fallback
- ✅ `AuthService` — find-or-create user, 닉네임 유일성(충돌 시 랜덤 suffix), bcrypt refresh 회전, 로그아웃 무효화
- ✅ `AuthController` — `/auth/kakao/callback`, `/auth/naver/callback`, `/auth/refresh`, `/auth/logout`
- ✅ `SecurityConfig` 본편 — 공개 경로 whitelist, JWT 필터 체인, `@EnableMethodSecurity`
- ✅ `/users/me` — 스모크 엔드포인트
### Week 3
- ✅ 나머지 엔티티 4개 (RoomKick / RoomVisit / RoomReview / RoomRestaurantImage) + Flyway V1 확장
- ✅ `QuerydslConfig` — `JPAQueryFactory` 빈
- ✅ `RoomAccessService` — `RoomMemberGuard`/`RoomManagerGuard` 대체, 도메인 레이어 가드
- ✅ `RoomService` — 방 CRUD, 초대 코드 생성(8자 hex 충돌 회피 retry), 초대 코드 재생성, 강퇴 이력 차단, 방당 20인 / 유저당 30방 제한, 탭 설정
- ✅ `RoomRestaurantService` — **QueryDSL 동적 검색**(search/category/wishlist/정렬/페이징) + 리뷰 그룹 쿼리로 N+1 방지 집계 + `CategoryService.resolve()` 연동
- ✅ `RoomController` — 7개 엔드포인트 (`POST/GET/PATCH/DELETE /rooms`, `POST /rooms/{id}/invite-code`, `POST /rooms/join`)
- ✅ `RoomRestaurantController` — 4개 엔드포인트 + 페이지네이션 응답(`PagedRestaurants`)
### Week 4
- ✅ `RoomVisitService` — 방문 CRUD. 생성자 또는 매니저+ 만 수정/삭제
- ✅ `RoomReviewService` — 리뷰 CRUD. 방문당 1인 1리뷰, JPA dirty checking으로 UPDATE 자동 발행
- ✅ `RoomStatsService` — 요약(식당/방문/리뷰 수·평균 평점) + 카테고리 분포, JPQL group-by
- ✅ 컨트롤러 3종: `RoomVisitController` / `RoomReviewController` / `RoomStatsController`
- ✅ **Testcontainers MySQL 통합 테스트 베이스** — 컨테이너 1회만 기동, Flyway 자동 적용, `@DynamicPropertySource` 주입
- ✅ `RoomServiceIntegrationTest` — 방 생성 시 owner 멤버십 자동 생성, 초대 코드 입장, 만원 시 403, 비-owner update 403
- ✅ `RoomRestaurantServiceIntegrationTest` — 카테고리 매핑 성공 시 `categoryRef` 세팅, 미매핑(예: "맥도날드") 시 원본 보존, QueryDSL 검색, 중복 차단
### Week 5
- ✅ `@RateLimit(capacity, refillSeconds)` 메소드 어노테이션 + `RateLimitInterceptor` (Bucket4j, IP × endpoint 스코프 버킷 캐시)
- ✅ auth 콜백/refresh `5/60s`, 방·식당 생성 `10/60s`, 스토리지 프리사인 `30/60s` 적용
- ✅ `AsyncConfig` — 코어 4 / 최대 16 / 큐 200 / `CallerRunsPolicy` (유실 방지 백프레셔)
- ✅ `FcmToken` 엔티티 + Flyway + `FcmTokenRepository` + `FcmService.sendToUsersAsync()`
- ✅ `FcmSender` 인터페이스 + `NoopFcmSender` 기본 구현 — Firebase SDK 부재 환경에서도 앱 구동
- ✅ `FcmController` — `POST/DELETE /fcm/tokens`
- ✅ AWS SDK v2 S3 의존성 + `S3Config` — `access-key` 존재 시에만 빈 등록 (`@ConditionalOnProperty`)
- ✅ `StorageService` — 이미지 MIME 화이트리스트(jpeg/png/webp/avif), 10MB 제한, 유저별 폴더 스코프, path traversal sanitize
- ✅ `StorageController` — `POST /storage/presigned-upload`, `@RateLimit(30/60)` 적용
### Week 6
- ✅ `AdminCategoryController` — `GET /admin/categories`, `POST/PATCH/DELETE`, `/unmapped` 큐, `/mappings` CRUD
- ✅ 매핑 upsert 시 `@Modifying` 벌크 UPDATE로 동일 원본값 식당 일괄 재분류 (Nest의 트랜잭션 벌크 업데이트 로직을 Spring JPA로 재현)
- ✅ `Notice` 엔티티 + Flyway + `NoticeRepository` + `NoticeService` + 공개/관리자 두 계층 컨트롤러
- ✅ `Inquiry` 엔티티 + 공개 `POST /inquiries` (`@RateLimit(5/300)`) + 관리자 목록
- ✅ `@PreAuthorize("hasRole('ADMIN')")` 일괄 적용 → Nest `AdminGuard` 대체
- ✅ **GitHub Actions CI** (`.github/workflows/ci-spring.yml`) — JDK 21 Temurin + Gradle 8.10 + Testcontainers 자동 수행, 실패 시 reports 아티팩트 업로드
- ✅ 포팅 종료. 프로덕션 Dockerfile은 Week 1에서 이미 멀티 스테이지로 완성됨.

## 포팅 완료 상태

총 **7주 130+ 파일**. Nest 기능 패리티는:

| 영역 | Nest | Spring | 패리티 |
|---|---|---|---|
| OAuth (Kakao/Naver) + URL redirect | ✅ | ✅ | 100% |
| JWT access/refresh 회전 | ✅ | ✅ | 100% (`sub=userId` 동일) |
| Room CRUD + 초대 코드 + 공개 방 | ✅ | ✅ | 100% |
| 식당 CRUD + QueryDSL 검색 + 위시리스트 + 유사 추천 | ✅ | ✅ | 100% |
| 방문/리뷰 CRUD + 참여자 태그 | ✅ | ✅ | 100% |
| 멤버 관리 (역할/강퇴/위임/탈퇴) | ✅ | ✅ | 100% |
| 타임라인 | ✅ | ✅ | 100% |
| 투표 (Poll/Option/Vote) | ✅ | ✅ | 100% (토글·교체·자동 마감) |
| 방 알림 + FCM 브로드캐스트 | ✅ | ✅ | 100% (`@Async`) |
| 카테고리 CMS + 벌크 매핑 | ✅ | ✅ | 100% |
| 방 통계 | ✅ | △ | 90% (멤버 심화 분석 제외) |
| Discover / Rankings / Platform Stats | ✅ | ✅ | 100% |
| 유저 (닉네임/푸시/온보딩/튜토리얼/알림) | ✅ | ✅ | 100% |
| 커뮤니티 (Board/Post/Comment/Like/Bookmark/PostRestaurant) | ✅ | ✅ | 100% |
| 관리자 (유저/데모/대시보드/게시판/카테고리/공지/문의) | ✅ | ✅ | 100% |
| Places (Naver 로컬 검색) | ✅ | ✅ | 100% |
| Throttler | ✅ (TTL 윈도우) | ✅ (Bucket4j 토큰 버킷) | 알고리즘 개선 |
| Storage (S3/R2 presigned) | — | ✅ | Spring 신규 |
| 통합 테스트 (Testcontainers MySQL) | ❌ | ✅ | Spring 신규 |
| CI | ✅ | ✅ | 분리된 워크플로 |
| OG 이미지 (satori PNG 렌더링) | ✅ | ❌ | **의도 제외** — 자바 JSX-PNG 대체 무거움 |

## 공존 전략

기존 Nest API([apps/api](../api/))는 계속 운영됩니다. Spring API는 **별도 DB**(`fearless_tasting_spring`)에서 시작하고, 각 주차가 끝날 때 Nest와 동등한 기능을 검증한 뒤 프론트 환경변수 `PUBLIC_API_URL`을 스위칭해가며 점진 전환합니다. 완료 후 Nest API는 포트폴리오 히스토리로 보존.
