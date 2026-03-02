# 무모한 시식가 - Claude Code 가이드

방(Room) 기반 맛집 리뷰 공유 플랫폼 모노레포 프로젝트. 초대 코드로 방 입장, 방 전용 식당/리뷰 리스트 운영.

## 프로젝트 구조

- `apps/web/` - Astro 프론트엔드 (포트 4321)
- `apps/api/` - NestJS 백엔드 API (포트 4000, Prisma ORM, MySQL)
- `packages/types/` - 공유 타입 (`Restaurant`, `Review`, `User`, `Room`, `RoomMember` 등)
- `packages/utils/` - 공유 유틸 (`formatRating`, `formatDate`)
- `packages/typescript-config/` - 공유 tsconfig (base, astro, nestjs)
- `packages/eslint-config/` - 공유 ESLint flat config (base, astro, nestjs)

## 기술 스택

- **모노레포**: Turborepo + pnpm
- **프론트엔드**: Astro 5, TypeScript, 카카오맵 SDK
- **백엔드**: NestJS 11, Prisma, TypeScript
- **DB**: MySQL 8.0 (Reader/Writer 분리)
- **컨테이너**: Docker, docker-compose
- **인증**: 카카오 OAuth + JWT (httpOnly 쿠키)
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
├── restaurants/    # 공개 식당 CRUD, 지역별 조회 (레거시, 방 전용 전환 예정)
├── reviews/        # 공개 리뷰 CRUD (레거시, 방 전용 전환 예정)
├── rooms/          # 방 기능 (초대 코드, 멤버/식당/리뷰 관리)
│   ├── guards/     # RoomMemberGuard, RoomManagerGuard
│   └── dto/        # 방 관련 DTO
├── users/          # 유저 조회
├── inquiries/      # 문의 CRUD
└── prisma/         # PrismaService (Reader/Writer 분리)
```

## DB 모델

| 모델 | 설명 | 주요 관계 |
|------|------|-----------|
| User | 서비스 사용자 | Account, Room, RoomMember, RoomKick |
| Account | OAuth 계정 (카카오) | User |
| Room | 공유 방 | RoomMember, RoomRestaurant, RoomKick |
| RoomMember | 방 멤버십 (owner/manager/member) | Room, User |
| RoomRestaurant | 방 내 식당 | Room, User, RoomReview |
| RoomReview | 방 내 리뷰 | RoomRestaurant, User |
| RoomKick | 방 강퇴 기록 (재입장 차단) | Room, User |
| Restaurant | 공개 식당 (레거시) | Review |
| Review | 공개 리뷰 (레거시) | Restaurant, User |
| Inquiry | 고객 문의 | - |

## 방(Room) 권한 체계

| 역할 | 방 삭제 | 멤버 강퇴/역할 변경 | 방장 위임 | 초대 코드 재생성 | 타인 식당·리뷰 삭제 | 등록 | 본인 수정·삭제 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| owner (방장) | O | O | O | O | O | O | O |
| manager (매니저) | X | X | X | X | O | O | O |
| member (멤버) | X | X | X | X | X | O | O |

## 초대 코드 보안

- `crypto.randomBytes(4).toString('hex')` → 8자 hex 코드
- 생성 시 만료 시간 24시간 설정 (`inviteCodeExpiresAt`)
- 만료 후 입장 시도 → 403 거부
- 강퇴당한 유저 재입장 → `RoomKick` 테이블 확인 → 403 거부
- 방장이 초대 코드 재생성 가능 (새 코드 + 만료 시간 갱신)

## Rate Limit (어뷰저 정책)

`@nestjs/throttler`로 전역 + 엔드포인트별 제한 적용.

| 범위 | TTL | 제한 | 대상 |
|------|-----|------|------|
| 전역 기본 | 60초 | 60회 | 모든 엔드포인트 |
| 인증 | 60초 | 5회 | `GET /auth/kakao/callback`, `POST /auth/refresh` |
| 생성 | 60초 | 10회 | `POST /rooms`, `POST /rooms/join`, `POST /rooms/:id/restaurants`, `POST /rooms/:id/restaurants/:rid/reviews` |

- 초과 시 HTTP 429 (Too Many Requests) 응답
- IP 기반 추적 (ThrottlerGuard 기본)
- 전역 Guard로 `APP_GUARD`에 `ThrottlerGuard` 등록
- 개별 엔드포인트는 `@Throttle({ default: { ttl, limit } })` 데코레이터로 오버라이드

## 프론트엔드 페이지

| 경로 | 설명 |
|------|------|
| `/` | 홈 — 내 방 목록 + 방 만들기 + 초대 코드 입장 |
| `/room?id=xxx` | 방 상세 — 카카오맵 지도, 식당/리뷰 CRUD, 멤버 관리, 통계 |
| `/login` | 카카오 로그인 |
| `/cs` | 문의 등록 |
| `/admin` | 관리자 — 문의/식당/리뷰 관리 (탭) |
| `/map` | 지도 탐색 |

## 환경 변수

### 백엔드 (`apps/api/.env`)
- `DATABASE_URL` — MySQL Writer 연결
- `DATABASE_READER_URL` — MySQL Reader 연결
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `KAKAO_CLIENT_ID`, `KAKAO_REDIRECT_URI`
- `FRONTEND_URL`

### 프론트엔드 (`apps/web/.env`)
- `PUBLIC_API_URL` — API 서버 주소
- `PUBLIC_KAKAO_MAP_KEY` — 카카오맵 JavaScript 키 (빈 값이면 지도 숨김)

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
