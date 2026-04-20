# 무모한 시식가 - Claude Code 가이드

방(Room) 기반 맛집 리뷰 공유 플랫폼 모노레포 프로젝트. 초대 코드로 방 입장, 공유 링크로 비로그인 열람, 방 전용 식당/리뷰 리스트 운영.

## 프로젝트 구조

- `apps/web/` - Astro 프론트엔드 (포트 4321)
- `apps/api/` - NestJS 백엔드 API (포트 4000, Prisma ORM, MySQL)
- `packages/types/` - 공유 타입 (`User`, `AuthUser`, `Room`, `RoomMember`, `RoomRestaurant`, `RoomVisit`, `RoomReview`, `RoomStats`, `PlatformStats`, `SharedRoom*`, `Inquiry`, `Notice`, `Poll`, `TimelineItem`, `AppNotification`, `RankingUser`, `DiscoverResponse` 등)
- `packages/utils/` - 공유 유틸 (`formatRating`, `formatDate`)
- `packages/typescript-config/` - 공유 tsconfig (base, astro, nestjs)
- `packages/eslint-config/` - 공유 ESLint flat config (base, astro, nestjs)

## 기술 스택

- **모노레포**: Turborepo + pnpm
- **프론트엔드**: Astro 5, TypeScript, 카카오맵 SDK, @astrojs/sitemap, View Transitions
- **백엔드**: NestJS 11, Prisma, TypeScript
- **DB**: MySQL 8.0 (Reader/Writer 분리)
- **컨테이너**: Docker, docker-compose
- **인증**: 카카오·네이버 OAuth + JWT (Bearer 토큰 + localStorage, payload: `{ sub }` userId만)
- **Rate Limit**: @nestjs/throttler

## 핵심 규칙

- `any`/`unknown` 타입 사용 금지
- Controller는 요청/응답만 처리, 비즈니스 로직은 Service에 작성
- DTO를 Service에 직접 전달 금지 (필요한 값만 파라미터로)
- DTO 프로퍼티에는 `!` (definite assignment assertion) 사용
- DB 읽기: `this.prisma.read`, 쓰기: `this.prisma.write`
- DB 쿼리는 Prisma ORM 사용 (Raw Query 시 사유 주석 필수)
- N+1 쿼리 금지, 트랜잭션 필요 시 `this.prisma.write.$transaction()`
- DB 조회 결과 null 체크 필수
- 삭제 시 cascade 관계 확인 (Prisma `onDelete: Cascade`)
- 정수 검증은 `@IsInt()` 사용 (`@IsNumber()` 금지 — 소수점 허용 방지)
- API 에러 처리: `throwIfNotOk(res, fallback)` 헬퍼 사용 (api.ts)
- **패턴 일괄 변경 시 전체 검증 필수**: 동일 패턴을 여러 곳 수정할 때(예: `img.url` → `toImageUrl(img.url)`) 반드시 `grep`으로 변경 전 패턴이 남아있는지 확인. 수정 후에도 누락 검증
- **DTO ↔ Controller ↔ Service 필드 동기화**: DTO에 필드 추가 시 Controller에서 Service로 전달하는 객체에도 반드시 포함. whitelist: true가 DTO에 없는 필드를 제거하므로 DTO-Controller-Service 3곳이 항상 일치해야 함

## API 모듈 구조

```
apps/api/src/
├── auth/           # 카카오 OAuth, JWT 인증, Guards (JwtAuth, Admin)
├── rooms/          # 방 기능 (초대 코드, 공유 링크, 멤버/식당/리뷰 관리)
│   ├── guards/     # RoomMemberGuard, RoomManagerGuard
│   ├── dto/        # 방 관련 DTO (CreateRoom, JoinRoom, ToggleShareCode 등)
│   ├── rooms.service.ts       # 방/식당/리뷰/방문 CRUD
│   └── room-stats.service.ts  # 방 통계 (getRoomStats, analyzeMemberBehaviors 등)
├── users/          # 유저 조회, 닉네임 수정
├── inquiries/      # 문의 CRUD
├── common/         # 공통 유틸 (LoggerMiddleware, measure 성능 측정)
└── prisma/         # PrismaService (Reader/Writer 분리, 쿼리 로깅)
```

## 공유 타입 패키지 (`packages/types/`)

프론트엔드와 백엔드에서 공통으로 사용하는 타입 정의. `apps/web/src/lib/api.ts`에서 `@repo/types`로 import하여 사용.

```
packages/types/src/
├── index.ts        # 전체 re-export
├── user.ts         # User, AuthUser
├── room.ts         # Room, RoomRestaurant, RoomVisit, RoomReview, RoomListItem,
│                   #   RoomDetailResponse, PaginatedRestaurants, ReviewData,
│                   #   ReviewComparison, CompareReviewsResponse 등
├── stats.ts        # RoomStats, PlatformStats
├── ranking.ts      # RankingUser, RankingsResponse
├── discover.ts     # DiscoverRestaurant, DiscoverResponse
├── inquiry.ts      # Inquiry
├── notice.ts       # Notice
├── poll.ts         # PollOption, Poll
├── notification.ts # AppNotification (DOM Notification과 이름 충돌 방지)
└── timeline.ts     # TimelineItem
```

## DB 모델

| 모델                 | 설명                             | 주요 관계                                |
| -------------------- | -------------------------------- | ---------------------------------------- |
| User                 | 서비스 사용자                    | Account, Room, RoomMember, RoomKick      |
| Account              | OAuth 계정 (카카오·네이버)        | User                                     |
| Room                 | 공유 방 (`inviteCode`, `isPublic`, `maxMembers` 2~20, `tabXxxEnabled` 4종, `announcement`) | RoomMember, RoomRestaurant, RoomKick, RoomPoll |
| RoomMember           | 방 멤버십 (owner/manager/member) | Room, User                               |
| RoomRestaurant       | 방 내 식당 (폐점·위시리스트 플래그) | Room, User, RoomVisit                    |
| RoomVisit            | 방문 기록 (visitedAt, memo, waitTime) | RoomRestaurant, User, RoomVisitParticipant, RoomReview |
| RoomVisitParticipant | 방문 참여자 태그                 | RoomVisit, User                          |
| RoomReview           | 방문별 리뷰 (세부 평점, 메뉴)    | RoomVisit, User                          |
| RoomKick             | 방 강퇴 기록 (재입장 차단)       | Room, User                               |
| RoomNotification     | 방 알림 (식당/방문/리뷰/투표 알림) | Room, User                              |
| RoomPoll             | 방 내 투표 (회식 등 의견 수렴)   | Room, User(생성자), RoomPollOption       |
| RoomPollOption       | 투표 선택지 (식당 연결 옵션)     | RoomPoll, RoomRestaurant?, RoomPollVote  |
| RoomPollVote         | 투표 참여 기록 (유저별 1표)      | RoomPollOption, User                     |
| Inquiry              | 고객 문의                        | -                                        |

## 방(Room) 권한 체계

| 역할               | 방 삭제 | 멤버 강퇴/역할 변경 | 방장 위임 | 초대 코드 재생성 | 공개 방 토글·탭 설정 | 타인 식당·리뷰 삭제 | 등록 | 본인 수정·삭제 | 열람 |
| ------------------ | :-----: | :-----------------: | :-------: | :--------------: | :-------------------: | :-----------------: | :--: | :------------: | :--: |
| owner (방장)       |    O    |          O          |     O     |        O         |           O           |          O          |  O   |       O        |  O   |
| manager (매니저)   |    X    |          X          |     X     |        X         |           X           |          O          |  O   |       O        |  O   |
| member (멤버)      |    X    |          X          |     X     |        X         |           X           |          X          |  O   |       O        |  O   |
| viewer (공개 방)   |    X    |          X          |     X     |        X         |           X           |          X          |  X   |       X        |  O   |

> viewer는 DB에 저장되지 않는 비로그인 읽기 전용 접근자. `Room.isPublic = true`로 설정된 방을 `/rooms/public/:id`에서 열람.

## 초대 코드 보안

- `crypto.randomBytes(4).toString('hex')` → 8자 hex 코드
- 만료 없음 (무기한 유효)
- 강퇴당한 유저 재입장 → `RoomKick` 테이블 확인 → 403 거부
- 방장이 초대 코드 재생성 가능 (새 코드 발급, 기존 코드 무효화)

## 공개 방 (비로그인 열람)

방을 **`isPublic = true`**로 전환하면 비로그인 사용자도 식당/리뷰를 읽기 전용으로 열람 가능. 블로그·SNS·검색엔진에 유통 가능.

### 정책
- 기본값 `isPublic = false` (비공개), **방장(owner)만 토글**
- 토글 전 **경고 모달**로 프라이버시(전 멤버 리뷰·메모 노출)·SEO 인덱싱 고지
- 공개 → 비공개 전환 시 `danger` 경고 (기존 링크 404 발생 안내)
- 응답에서 **멤버 정보(닉네임/프로필) 미포함**, 리뷰 작성자 정보 미노출 (rating, content, createdAt만)
- 목록 노출 **품질 필터**: 식당 3개 + 리뷰 3개 이상 + 90일 내 활동
- 전역 Rate Limit(60req/60s)으로 브루트포스 방지 (방 ID는 cuid 16자)

### SharedRoomDetail.summary (요약 카드용)
공개 상세 API는 `summary: { restaurantCount, totalReviews, avgRating, topCategories, topRegions }` 포함. 식당별 `avgRating`도 추가 노출.

### 공개 방 API

| Method  | Path                                       | Guard       | 설명                                  |
| ------- | ------------------------------------------ | ----------- | ------------------------------------- |
| `GET`   | `/rooms/public`                            | 없음        | 공개 방 목록 (품질 필터 + 페이지네이션) |
| `GET`   | `/rooms/public/:id`                        | 없음        | 공개 방 상세 (summary + 식당 목록)    |
| `GET`   | `/rooms/public/:id/restaurants/:rid`       | 없음        | 공개 식당 상세 (리뷰 포함, user 미노출) |
| `GET`   | `/rooms/public/sitemap-ids`                | 없음        | sitemap용 공개 방 ID 목록             |
| `PATCH` | `/rooms/:id/public`                        | JwtAuth (owner) | 공개/비공개 토글                  |

### 공개 방 진입 동선 (프론트)
- `/rooms/public` — 공개 방 목록 페이지 (카드 리스트)
- `/rooms/public/:id` — 개별 공개 방 상세 (요약 카드 · 태그 · "무료로 시작하기" CTA)
- `/discover` 하단 "👀 다른 사람 방 구경하기" 섹션에서 연결
- `/rooms` (내 방) **빈 상태**에 "공개 방 구경하기" CTA
- `sitemap-public-rooms.xml`로 검색엔진 인덱싱
- 방 설정 공유 팝오버에 "공개 방 링크" 섹션 (URL 복사 · 카카오톡 리치 공유)

## Rate Limit (어뷰저 정책)

`@nestjs/throttler`로 전역 + 엔드포인트별 제한 적용.

| 범위      | TTL  | 제한 | 대상                                                                                                         |
| --------- | ---- | ---- | ------------------------------------------------------------------------------------------------------------ |
| 전역 기본 | 60초 | 60회 | 모든 엔드포인트                                                                                              |
| 인증      | 60초 | 5회  | `GET /auth/kakao/callback`, `GET /auth/naver/callback`, `POST /auth/refresh`                                 |
| 생성      | 60초 | 10회 | `POST /rooms`, `POST /rooms/join`, `POST /rooms/:id/restaurants`, `POST /rooms/:id/restaurants/:rid/visits`, `POST /rooms/:id/visits/:visitId/reviews`, `POST /rooms/:id/restaurants/:rid/quick-review` |

- 초과 시 HTTP 429 (Too Many Requests) 응답
- IP 기반 추적 (ThrottlerGuard 기본)
- 전역 Guard로 `APP_GUARD`에 `ThrottlerGuard` 등록
- 개별 엔드포인트는 `@Throttle({ default: { ttl, limit } })` 데코레이터로 오버라이드

## 프론트엔드 페이지

| 경로              | 설명                                                |
| ----------------- | --------------------------------------------------- |
| `/`               | 홈 — 랜딩 페이지 + 로그인 시 내 방 대시보드         |
| `/rooms`          | 내 방 — 방 목록, 검색, 정렬, 방 생성                |
| `/room?id=xxx`    | 방 상세 — 식당/리뷰 CRUD, 멤버 관리, 공개 링크 공유, 탭 on/off, 검색/페이지네이션 |
| `/room/add`       | 식당 등록 + 리뷰 — 카카오/네이버 검색 또는 직접 입력 → 방문·리뷰 한 번에 |
| `/room/restaurant`| 식당 상세 — 방문 기록, 리뷰 CRUD, 세부 평점, 외부 링크(카카오맵/네이버/구글), 유사 식당 추천 |
| `/rooms/public`   | 공개 방 목록 — 비로그인, 품질 필터 적용 (식당 3+·리뷰 3+·90일 내) |
| `/rooms/public/:id` | 공개 방 상세 — 비로그인, 요약 카드·식당 목록·"무료로 시작하기" CTA, 동적 OG |
| `/join?code=xxx`  | 초대 링크 자동 입장 (미로그인 시 `/login` 경유 후 리다이렉트) |
| `/login`          | OAuth 프로바이더 선택 (카카오·네이버)                |
| `/discover`       | 맛집 추천 — 고평점/재방문 맛집 공개 랭킹             |
| `/rankings`       | 유저 랭킹 — 리뷰 수/평균 평점/방문 수 기준          |
| `/about`          | 서비스 소개 — 기능, 업적, 사용 흐름                 |
| `/cs`             | 문의 등록                                           |
| `/profile`        | 프로필 — 닉네임 수정, 화면 설정 (테마), 계정 관리 |
| `/admin`          | 관리자 — 문의 관리                                  |
| `/privacy`        | 개인정보처리방침                                    |

## 프론트엔드 컴포넌트

```
apps/web/src/components/
└── AdSlot.astro   # 재사용 가능한 광고 슬롯 (환경변수 기반 활성화)
```

## View Transitions 패턴

Astro View Transitions 사용 시 `<script>` 모듈은 최초 1회만 실행됨. 페이지별 초기화가 필요한 스크립트는 반드시 아래 패턴을 따라야 함:

```typescript
// 1. import는 모듈 레벨 (함수 바깥)
import { fetchCurrentUser } from '@/lib/api';

// 2. 초기화 코드를 함수로 감싸기
function initMyPage() {
  const el = document.getElementById('my-el');
  if (!el) return; // 해당 페이지가 아니면 early return

  // DOM 조작, 이벤트 리스너 등
}

// 3. astro:page-load 이벤트만 사용 (직접 호출 금지 — 이중 실행 방지)
document.addEventListener('astro:page-load', initMyPage);
```

**주의사항:**
- `initMyPage()` 직접 호출 금지 — `astro:page-load`는 최초 로드에서도 발생하므로 이중 실행됨
- 이벤트 리스너 중복 등록 방지: `cloneNode(true)` + `replaceWith`로 기존 리스너 제거
- 다크모드: `astro:after-swap` 이벤트에서 `data-theme` 재적용 (`is:inline` 스크립트)
- `fetchCurrentUser` 캐시: `astro:before-swap`에서 `resetUserCache()` 호출

## 알림 시스템

- `RoomNotification` 모델: 방 내 활동 (식당 등록, 방문, 리뷰, 멤버 참여) 시 자동 생성
- `createNotificationForRoom()`: 해당 방 멤버 전원에게 알림 (본인 제외), fire-and-forget
- 프론트: BaseLayout 알림 벨 → 드롭다운으로 최근 20개 표시
- API: `GET /users/me/notifications`, `GET /users/me/notifications/unread-count`, `PATCH /users/me/notifications/read`

## 방 인원 제한

- **방당 최대 인원은 방별 설정값** (`Room.maxMembers`, 범위 2~20, 기본 4)
  - 방 생성(`CreateRoomDto`) / 방 설정(`UpdateRoomDto`)에서 변경 가능
  - 축소 시 현재 멤버 수보다 작게 설정 불가 (`rooms.service.ts` `updateRoom`)
- `MAX_ROOMS_PER_USER = 30` — 유저당 참여 가능한 방 수 제한
- 초대 코드 입장 시 `memberCount >= room.maxMembers`면 403 ("방 인원이 가득 찼습니다")

## 식당/방문 수정

- `PATCH /rooms/:id/restaurants/:rid` — 식당 이름, 주소, 카테고리, 폐점 여부 수정 (본인 또는 매니저+)
- `PATCH /rooms/:id/visits/:visitId` — 방문 날짜, 메모, 웨이팅 수정 (생성자 또는 매니저+)
- 방문 수정 시 "날짜 모름" 옵션 지원 (메모에 `(날짜 미상)` 접두사)

## 방 통계

- `GET /rooms/:id/stats` — 방 종합 통계 (RoomMemberGuard)
- 통계 로직은 `room-stats.service.ts`에 분리
- 요약 (식당·방문·리뷰 수, 평균 평점), 멤버별 활동 분석
- 카테고리·지역 분포, 요일·월별 방문 패턴
- 세부 평점 레이더 차트 (맛/가성비)
- 대기시간 분포, 인기 메뉴 (또 먹고 싶은)
- TOP/BOTTOM 평점 식당, 재방문률 TOP 식당
- 미리뷰 방문 알림
- 멤버별 행동 분석 (탐험가율, 카테고리 편향, 평점 성향, 리뷰 성실도, 요일 선호)

## 리뷰 입력

- 리뷰 본문(content): 선택 입력 (별점만으로 리뷰 가능, 최대 2000자)
- **전체 평점**: 0.5 단위 별점 (half-star 지원, `20260417_half_star_ratings`)
- **세부 평점 5항목** — **별점 + 인라인 동적 라벨** UI (기존 칩 방식에서 개편됨):
  - 별 1~5 클릭 시 해당 점수·라벨을 별 아래에 즉시 표시, 같은 별 재클릭 시 0(취소)
  - 호버 시 preview 표시 (PC), 모바일에선 클릭으로 바로 확인
  - 맛(tasteRating): 남겼다(1) ~ 먹는 내내 감탄했다(5)
  - 가성비(valueRating): 돈 줘도 안 먹는다(1) ~ 사장님 남는 거 맞아요?(5)
  - 서비스(serviceRating): 손님이 죄인인 줄(1) ~ 사장님이 내 팬인가보다(5)
  - 청결(cleanlinessRating): 나오면 안 될 게 나왔다(1) ~ 수술실인가?(5)
  - 접근성(accessibilityRating): 등산인가 식사인가(1) ~ 눈 감고도 감(5)
- 재방문 의사(wouldRevisit): 5단계 (꼭 다시 갈 거예요 ~ 안 갈 것 같아요)
- 또 먹고 싶은 메뉴(favoriteMenu) 입력 (선택)
- 카테고리: 칩 셀렉터 (13종 프리셋 + "기타" 커스텀 입력)
- 웨이팅: 칩 버튼 (없음/~10분/~30분/~1시간/1시간+)
- 식당 목록: 10개씩 페이지네이션 ("더보기" 버튼) + 검색 (이름/주소/카테고리)

## 식당 상세 외부 링크 · 유사 식당 추천

식당 상세(`/room/restaurant`)에 방문 기록 위로 4개 외부 링크 칩:
- 🗺️ **카카오맵** — 좌표 있으면 `map/<name>,<lat>,<lng>`, 없으면 `search/<name>`
- 🧭 **네이버 지도** — `map.naver.com/p/search/<name>`
- 📅 **예약 확인** — 네이버 예약 검색 (`m.booking.naver.com/search`)
- 🔎 **리뷰 찾기** — 구글 검색 (`<name> <주소> 리뷰`)

하단에 **"🔁 비슷한 식당"** 섹션 (같은 방 내 heuristic 추천):
- 점수: 카테고리+지역 일치(3) > 카테고리(2) > 지역(1)
- 평점 높은 순 tie-break, 상위 3개 표시
- 폐점·위시리스트·현재 식당 제외

## 방 생성 템플릿

`/rooms` 방 만들기 모달에서 6종 템플릿 선택 가능 (`ROOM_TEMPLATES` in `rooms.astro`):

| 템플릿 | 기본 이름 | 기본 탭 구성 | 특이 동작 |
|--------|----------|-------------|----------|
| 빈 방 | (없음) | 위시·지역 ON | — |
| 🍻 회식 | "회식 맛집" | 투표만 ON, 나머지 OFF | 생성 직후 "🍜 오늘 뭐 먹지?" 투표 자동 시드 (한/중/일/양/분식/치킨) |
| 💑 데이트 | "우리 데이트 맛집" | 위시·지역·통계 ON | — |
| 🏠 신혼 | "신혼 맛집 지도" | 위시·지역 ON | — |
| 👨‍👩‍👧 가족 | "우리 가족 맛집" | 위시·지역 ON | — |
| 🎉 친구 | "친구들 맛집 모음" | 위시·투표 ON | — |

## 방별 탭 on/off 설정

`Room` 엔티티의 4개 boolean 필드로 방장이 탭 표시 여부 조절:

| 탭 | 필드 | 기본값 |
|----|------|--------|
| 💛 위시리스트 | `tabWishlistEnabled` | `true` |
| 📍 지역 | `tabRegionEnabled` | `true` |
| 🗳️ 투표 | `tabPollEnabled` | `false` |
| 📊 통계 | `tabStatsEnabled` | `false` |

- 🍽️ 식당 / 📋 활동 / 👥 멤버는 **고정** (토글 불가)
- 오너만 변경 가능 (방 설정 모달의 "탭 표시 설정" 섹션)
- 생성 시엔 템플릿 값이 적용됨

## 투표 (회식 훅)

`RoomPoll`·`RoomPollOption`·`RoomPollVote` 3개 모델 + "🗳️ 투표" 탭 (방 설정에 따라 표시).

### 기능
- 투표 생성: 제목 + 2~10개 선택지. 옵션에 `restaurantId` 연결 가능 (방 식당 원클릭 추가)
- 빠른 템플릿: "🍜 오늘 뭐 먹지?"(한/중/일/양/분식/치킨 자동), "🍽️ 방 식당에서 고르기"(최근 6개)
- 단일 선택 (변경 가능, 재클릭 시 해제)
- 마감: 생성자만 수동 마감, 또는 `endsAt` 지나면 자동 마감 (`getPolls` 조회 시)
- 우승 식당 CTA: 마감 후 최다득표 옵션이 `restaurantId` 있으면 "방문 기록 남기기" 버튼 (식당 상세 이동)
- 동점 시 🤝 동점 배지 + 안내 토스트
- 활성 투표는 방 상단 **배너**에 표시 (참여율/내 참여 여부 노출), 클릭 시 탭 이동
- 알림: `poll_created` 타입으로 방 멤버에 생성 알림

### API

| Method  | Path                               | Guard           | 설명         |
| ------- | ---------------------------------- | --------------- | ------------ |
| `POST`  | `/rooms/:id/polls`                 | RoomMemberGuard | 투표 생성    |
| `GET`   | `/rooms/:id/polls`                 | RoomMemberGuard | 투표 목록 (자동 마감 반영) |
| `POST`  | `/rooms/:id/polls/:pollId/vote`    | RoomMemberGuard | 옵션에 투표  |
| `PATCH` | `/rooms/:id/polls/:pollId/close`   | RoomMemberGuard | 투표 마감 (생성자) |

## 식당 등록 UI

- `/room/add` 페이지: 식당 등록 → 방문 기록 → 리뷰를 3단계 위저드로 한 번에 처리
- 카카오 검색 모드: 장소 검색 → 자동 입력
- 직접 입력 모드: 이름/주소/카테고리 수동 입력
- 폐점 여부 체크박스 (등록/수정 시 모두 가능)
- 폐점 식당은 카드에 빨간 "폐점" 뱃지 + 반투명 처리

## 성능 측정

- `measure()` 유틸 (`common/perf.ts`): 함수 단위 소요시간 측정 (DB/외부API/CPU 구간별)
  - 100ms 미만: debug, 100~500ms: log, 500ms 이상: warn `[SLOW]`
- Prisma 쿼리 이벤트 로깅 (`prisma.service.ts`): 200ms 이상 `[SLOW READER/WRITER]` 경고
- HTTP 요청 로깅 (`logger.middleware.ts`): 500ms 이상 `[SLOW]` 경고
- 개발 환경에서 debug 로그 레벨 활성화

## PWA (Progressive Web App)

- `manifest.json` — 앱 이름, 아이콘(192/512), standalone 모드, portrait 고정
- `sw.js` — Service Worker (캐시 `fearless-tasting-v3`)
  - API 요청: 캐시 안 함 (network only)
  - 네비게이션(HTML): network-first, 오프라인 시 `/` fallback
  - favicon/manifest/icons: network-first (변경 시 즉시 반영)
  - 정적 자산: stale-while-revalidate
- BaseLayout에서 `<link rel="manifest">` + `navigator.serviceWorker.register('/sw.js')` 등록
- 홈 화면 추가로 앱처럼 사용 가능 (Android/iOS)

## SEO

- `@astrojs/sitemap` — 빌드 시 sitemap.xml 자동 생성 (공개 페이지만)
- `robots.txt` — 크롤러별 세분화 (Googlebot/Bingbot 별도 규칙, AI 크롤러 차단)
- `robots` 메타 태그: `max-snippet:-1, max-image-preview:large` (리치 스니펫 허용)
- Open Graph + Twitter Card 메타 태그 (`og:image:alt`, `twitter:image:alt` 포함)
- JSON-LD 구조화 데이터:
  - BaseLayout: `WebSite` (publisher 포함) + `SoftwareApplication`
  - 홈: `FAQPage` (8개 Q&A) + `BreadcrumbList`
  - 소개: `AboutPage` + `BreadcrumbList`
  - 랭킹/맛집 추천: `CollectionPage` + `BreadcrumbList`
  - 문의: `ContactPage` + `BreadcrumbList`
  - 공유 페이지: `ItemList` (FoodEstablishment 목록)
- BaseLayout Props: `title`, `description`, `ogImage`, `ogImageAlt`, `noindex`
- `SITE_URL` 환경변수로 sitemap 도메인 설정
- Cloudflare Pages `_headers` 파일로 sitemap/robots.txt 캐시 설정

## 광고 인프라

광고 시스템 초석 (Google AdSense 준비). `PUBLIC_AD_CLIENT` 환경변수 미설정 시 완전 비활성.

- `AdSlot.astro` — 재사용 가능한 광고 컨테이너 컴포넌트
  - Props: `slot`(슬롯ID), `format`(auto/fluid/rectangle/horizontal/vertical), `position`(top/middle/bottom/sidebar), `width/height`(고정크기)
  - 개발 환경: placeholder 박스 표시 (슬롯 ID/포맷 확인용)
  - 프로덕션: `PUBLIC_AD_CLIENT` 설정 시 AdSense `<ins>` 태그 렌더링
- `ads.ts` — 광고 스크립트 지연 로더
  - IntersectionObserver로 뷰포트 200px 전에 미리 로드
  - AdSense 스크립트 1회만 로드 (중복 방지)
  - 광고 차단 시 조용히 실패 (앱 동작 영향 없음)
- 배치 위치: 홈(FAQ↔통계 사이), 맛집추천(콘텐츠↔SEO 사이), 랭킹(콘텐츠↔SEO 사이), 소개(중간)
- 광고 미배치 영역: 로그인, 방 상세, 프로필, 관리자, 공유 페이지

## DB 마이그레이션

- **프로덕션**: `prisma migrate deploy` (Dockerfile CMD에서 실행)
- **개발**: `prisma migrate dev` (`pnpm --filter @repo/api prisma:migrate`)
- 마이그레이션 파일: `apps/api/prisma/migrations/`
- 초기 baseline: `0_init` (기존 `db push`에서 전환)

## 환경 변수

### 백엔드 (`apps/api/.env`)

- `DATABASE_URL` — MySQL Writer 연결
- `DATABASE_READER_URL` — MySQL Reader 연결
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `KAKAO_CLIENT_ID`, `KAKAO_REDIRECT_URI`
- `FRONTEND_URL`

### 프론트엔드 (`apps/web/.env`)

- `PUBLIC_API_URL` — API 서버 주소
- `PUBLIC_KAKAO_MAP_KEY` — 카카오맵 JavaScript 키 (빈 값이면 지도 숨김)
- `PUBLIC_AD_CLIENT` — Google AdSense 클라이언트 ID (빈 값이면 광고 비활성)
- `SITE_URL` — 사이트 도메인 (sitemap 생성용, 예: `https://fearless-tasting.pages.dev`)

## 프론트엔드 인증 흐름

- 토큰 저장: `localStorage` (`access_token`, `refresh_token`)
- API 호출: `apiFetch()` — Bearer 토큰 자동 첨부, `credentials: 'omit'`
- **선제 갱신**: access token 만료 1분 전에 자동 refresh (JWT `exp` 디코딩)
- **401 처리**: refresh token으로 재시도 → 실패 시 `clearTokens()` + `/login` 리다이렉트
- **refresh mutex**: 동시 401 발생 시 refresh 요청 1회만 실행
- **fetchCurrentUser 캐싱**: 같은 페이지 내 중복 호출 방지, View Transitions 전환 시 `resetUserCache()` 호출
- **로그아웃**: 즉시 localStorage/쿠키 삭제, 서버 DB 무효화는 fire-and-forget
- Access Token 만료: 15분, Refresh Token 만료: 7일

## 프론트엔드 유틸리티

- `api.ts` — API 통신 래퍼, 타입은 `@repo/types`에서 import 후 re-export
- `toast.ts` — 토스트 알림 + 확인/위험 확인 모달 (`showConfirmModal` 내부 통합)
- `ads.ts` — 광고 스크립트 지연 로더 (IntersectionObserver)

## 명령어

```bash
pnpm dev                          # 전체 개발 서버
pnpm --filter @repo/web dev       # 프론트엔드만
pnpm --filter @repo/api dev       # 백엔드만
pnpm build                        # 전체 빌드
pnpm lint                         # 전체 린트
docker compose up                 # Docker 개발 서버
docker compose up -d --build api  # API만 리빌드 (스키마 변경 시)
```

## 문서 구조

```
docs/
├── backend/                    # 백엔드 개발 문서
│   ├── backend-guide.md        # 백엔드 가이드 인덱스
│   ├── nestjs-rules.md         # NestJS 모듈/컨트롤러/서비스 규칙
│   ├── prisma-rules.md         # Prisma ORM, Reader/Writer 분리
│   ├── api-design.md           # REST API 설계, DTO 패턴
│   └── security.md             # 보안 규칙
├── frontend/                   # 프론트엔드 개발 문서
│   ├── frontend-guide.md       # 프론트엔드 가이드 인덱스
│   ├── astro-rules.md          # Astro 페이지/컴포넌트/스타일 규칙
│   ├── api-communication.md    # API 통신, 환경 변수
│   ├── performance.md          # 성능 규칙
│   └── accessibility.md        # 접근성 규칙
├── policy/                     # 정책 문서
│   ├── conventions.md          # 코드 컨벤션, Git 규칙
│   └── code-review-guide.md    # PR 리뷰 체크리스트 (P1/P2/P3)
├── architecture.md             # 시스템 아키텍처
├── local-setup.md              # 로컬 환경 설정 (단계별)
├── glossary.md                 # 도메인/기술 용어집
├── env-variables.md            # 환경 변수 가이드
├── troubleshooting.md          # 트러블슈팅
└── README.md                   # 문서 인덱스
```
