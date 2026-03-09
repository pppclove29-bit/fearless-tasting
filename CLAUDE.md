# 무모한 시식가 - Claude Code 가이드

방(Room) 기반 맛집 리뷰 공유 플랫폼 모노레포 프로젝트. 초대 코드로 방 입장, 공유 링크로 비로그인 열람, 방 전용 식당/리뷰 리스트 운영.

## 프로젝트 구조

- `apps/web/` - Astro 프론트엔드 (포트 4321)
- `apps/api/` - NestJS 백엔드 API (포트 4000, Prisma ORM, MySQL)
- `packages/types/` - 공유 타입 (`User`, `Room`, `RoomMember`, `RoomRestaurant`, `RoomVisit`, `RoomReview`, `SharedRoom*` 등)
- `packages/utils/` - 공유 유틸 (`formatRating`, `formatDate`)
- `packages/typescript-config/` - 공유 tsconfig (base, astro, nestjs)
- `packages/eslint-config/` - 공유 ESLint flat config (base, astro, nestjs)

## 기술 스택

- **모노레포**: Turborepo + pnpm
- **프론트엔드**: Astro 5, TypeScript, 카카오맵 SDK, @astrojs/sitemap
- **백엔드**: NestJS 11, Prisma, TypeScript
- **DB**: MySQL 8.0 (Reader/Writer 분리)
- **컨테이너**: Docker, docker-compose
- **인증**: 카카오 OAuth + JWT (Bearer 토큰 + localStorage, payload: `{ sub }` userId만)
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

## API 모듈 구조

```
apps/api/src/
├── auth/           # 카카오 OAuth, JWT 인증, Guards (JwtAuth, Admin)
├── rooms/          # 방 기능 (초대 코드, 공유 링크, 멤버/식당/리뷰 관리)
│   ├── guards/     # RoomMemberGuard, RoomManagerGuard
│   └── dto/        # 방 관련 DTO (CreateRoom, JoinRoom, ToggleShareCode 등)
├── users/          # 유저 조회, 닉네임 수정, 찜 목록
├── inquiries/      # 문의 CRUD
└── prisma/         # PrismaService (Reader/Writer 분리)
```

## DB 모델

| 모델                 | 설명                             | 주요 관계                                |
| -------------------- | -------------------------------- | ---------------------------------------- |
| User                 | 서비스 사용자                    | Account, Room, RoomMember, RoomKick      |
| Account              | OAuth 계정 (카카오)              | User                                     |
| Room                 | 공유 방 (inviteCode + shareCode) | RoomMember, RoomRestaurant, RoomKick     |
| RoomMember           | 방 멤버십 (owner/manager/member) | Room, User                               |
| RoomRestaurant       | 방 내 식당                       | Room, User, RoomVisit                    |
| RoomVisit            | 방문 기록 (visitedAt, memo, waitTime) | RoomRestaurant, User, RoomVisitParticipant, RoomReview |
| RoomVisitParticipant | 방문 참여자 태그                 | RoomVisit, User                          |
| RoomReview           | 방문별 리뷰 (세부 평점, 메뉴)    | RoomVisit, User                          |
| RoomKick             | 방 강퇴 기록 (재입장 차단)       | Room, User                               |
| RoomWishlist         | 식당 찜 (유저별)                 | RoomRestaurant, User                     |
| Inquiry              | 고객 문의                        | -                                        |

## 방(Room) 권한 체계

| 역할               | 방 삭제 | 멤버 강퇴/역할 변경 | 방장 위임 | 초대 코드 재생성 | 공유 링크 관리 | 타인 식당·리뷰 삭제 | 등록 | 본인 수정·삭제 | 열람 |
| ------------------ | :-----: | :-----------------: | :-------: | :--------------: | :------------: | :-----------------: | :--: | :------------: | :--: |
| owner (방장)       |    O    |          O          |     O     |        O         |       O        |          O          |  O   |       O        |  O   |
| manager (매니저)   |    X    |          X          |     X     |        X         |       O        |          O          |  O   |       O        |  O   |
| member (멤버)      |    X    |          X          |     X     |        X         |       X        |          X          |  O   |       O        |  O   |
| viewer (공유 링크) |    X    |          X          |     X     |        X         |       X        |          X          |  X   |       X        |  O   |

> viewer는 DB에 저장되지 않는 비로그인 읽기 전용 접근자. 공유 코드(`shareCode`)로 `/share?code=xxx` 페이지를 통해 열람.

## 초대 코드 보안

- `crypto.randomBytes(4).toString('hex')` → 8자 hex 코드
- 생성 시 만료 시간 24시간 설정 (`inviteCodeExpiresAt`)
- 만료 후 입장 시도 → 403 거부
- 강퇴당한 유저 재입장 → `RoomKick` 테이블 확인 → 403 거부
- 방장이 초대 코드 재생성 가능 (새 코드 + 만료 시간 갱신)

## 공유 링크 (비로그인 열람)

블로그·SNS에 방 공유 링크를 게시하여 비로그인 사용자가 식당/리뷰를 읽기 전용으로 열람 가능.

- `shareCode`: 8자 hex, nullable + unique. null = 한 번도 생성 안 한 상태
- `shareCodeEnabled`: boolean. 비활성화 시 코드 보존, 재활성화 가능
- 만료 없음 (무기한), 방장/매니저가 직접 비활성화·재생성
- 공유 엔드포인트 응답에 **멤버 정보(닉네임, 프로필) 미포함** — `select`로 제한
- 리뷰 작성자 정보 미노출 (rating, content, createdAt만 반환)
- Guard 없는 공개 엔드포인트 (`GET /rooms/shared/:shareCode`)
- 전역 Rate Limit(60req/60s)으로 브루트포스 방지 (8자 hex = 43억 조합)

### 공유 링크 API

| Method  | Path                                        | Guard            | 설명                                    |
| ------- | ------------------------------------------- | ---------------- | --------------------------------------- |
| `GET`   | `/rooms/shared/:shareCode`                  | 없음 (공개)      | 공유 방 조회 (방 이름 + 식당 목록)      |
| `GET`   | `/rooms/shared/:shareCode/restaurants/:rid` | 없음 (공개)      | 공유 식당 상세 (리뷰 포함, user 미노출) |
| `PATCH` | `/rooms/:id/share-code`                     | RoomManagerGuard | 공유 코드 활성화/비활성화/재생성        |

### 공유 링크 프론트엔드

- `/share?code=xxx` — 비로그인 공유 전용 페이지 (`share.astro`)
- 방 상세(`room.astro`)에서 owner/manager에게 공유 링크 관리 UI 표시

## Rate Limit (어뷰저 정책)

`@nestjs/throttler`로 전역 + 엔드포인트별 제한 적용.

| 범위      | TTL  | 제한 | 대상                                                                                                         |
| --------- | ---- | ---- | ------------------------------------------------------------------------------------------------------------ |
| 전역 기본 | 60초 | 60회 | 모든 엔드포인트                                                                                              |
| 인증      | 60초 | 5회  | `GET /auth/kakao/callback`, `POST /auth/refresh`                                                             |
| 생성      | 60초 | 10회 | `POST /rooms`, `POST /rooms/join`, `POST /rooms/:id/restaurants`, `POST /rooms/:id/restaurants/:rid/visits`, `POST /rooms/:id/visits/:visitId/reviews` |

- 초과 시 HTTP 429 (Too Many Requests) 응답
- IP 기반 추적 (ThrottlerGuard 기본)
- 전역 Guard로 `APP_GUARD`에 `ThrottlerGuard` 등록
- 개별 엔드포인트는 `@Throttle({ default: { ttl, limit } })` 데코레이터로 오버라이드

## 프론트엔드 페이지

| 경로              | 설명                                                |
| ----------------- | --------------------------------------------------- |
| `/`               | 홈 — 랜딩 페이지 + 로그인 시 내 방 대시보드         |
| `/rooms`          | 내 방 — 방 목록, 검색, 정렬, 방 생성                |
| `/room?id=xxx`    | 방 상세 — 식당/리뷰 CRUD, 찜, 멤버 관리, 공유 링크 |
| `/share?code=xxx` | 공유 열람 — 비로그인, 읽기 전용 (식당/리뷰 열람)    |
| `/join?code=xxx`  | 초대 링크 자동 입장 (미로그인 시 로그인 후 리다이렉트) |
| `/login`          | 카카오 로그인                                       |
| `/discover`       | 맛집 추천 — 고평점/재방문/관심 맛집 공개 랭킹       |
| `/rankings`       | 유저 랭킹 — 리뷰 수/평균 평점/방문 수 기준          |
| `/about`          | 서비스 소개 — 기능, 업적, 사용 흐름                 |
| `/cs`             | 문의 등록                                           |
| `/profile`        | 프로필 — 닉네임 수정, 업적, 활동 통계, 찜 목록, 화면 설정 (테마) |
| `/admin`          | 관리자 — 문의 관리                                  |

## 방 인원 제한

- `MAX_ROOM_MEMBERS = 4` (rooms.service.ts)
- `MAX_ROOMS_PER_USER = 30` — 유저당 참여 가능한 방 수 제한
- 초대 코드 입장 및 방 생성 시 멤버 수/방 수 체크, 초과 시 403

## 식당/방문 수정

- `PATCH /rooms/:id/restaurants/:rid` — 식당 이름, 카테고리 수정 (본인 또는 매니저+)
- `PATCH /rooms/:id/visits/:visitId` — 방문 날짜, 메모, 웨이팅 수정 (생성자 또는 매니저+)

## 방 통계

- `GET /rooms/:id/stats` — 방 종합 통계 (RoomMemberGuard)
- 요약 (식당·방문·리뷰 수, 평균 평점), 멤버별 활동 분석
- 카테고리·지역 분포, 요일·월별 방문 패턴
- 세부 평점 레이더 차트 (맛/가성비/서비스/청결/접근성)
- 대기시간 분포, 인기 메뉴 (또 먹고 싶은 / 다음에 시켜볼)
- TOP/BOTTOM 평점 식당, 재방문률 TOP 식당
- 미리뷰 방문 알림, 랜덤 식당 추천

## SEO

- `@astrojs/sitemap` — 빌드 시 sitemap.xml 자동 생성 (공개 페이지만)
- `robots.txt` — sitemap 참조, /share Allow, /admin·/login·/room Disallow
- Open Graph + Twitter Card 메타 태그 (BaseLayout.astro)
- JSON-LD 구조화 데이터 (WebSite)
- `SITE_URL` 환경변수로 sitemap 도메인 설정

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
- `SITE_URL` — 사이트 도메인 (sitemap 생성용, 예: `https://fearless-tasting.pages.dev`)

## 프론트엔드 인증 흐름

- 토큰 저장: `localStorage` (`access_token`, `refresh_token`)
- API 호출: `apiFetch()` — Bearer 토큰 자동 첨부, `credentials: 'omit'`
- **선제 갱신**: access token 만료 1분 전에 자동 refresh (JWT `exp` 디코딩)
- **401 처리**: refresh token으로 재시도 → 실패 시 `clearTokens()` + `/login` 리다이렉트
- **refresh mutex**: 동시 401 발생 시 refresh 요청 1회만 실행
- **fetchCurrentUser 캐싱**: 같은 페이지 내 중복 호출 방지 (BaseLayout + 페이지 스크립트)
- **로그아웃**: 즉시 localStorage/쿠키 삭제, 서버 DB 무효화는 fire-and-forget
- Access Token 만료: 15분, Refresh Token 만료: 7일

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
