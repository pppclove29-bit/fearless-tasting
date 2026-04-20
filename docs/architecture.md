# 아키텍처

## 시스템 구성도

```
┌──────────────┐   Bearer JWT   ┌──────────────┐     Prisma    ┌─────────────────┐
│              │  ──────────>   │              │  ──────────>  │  MySQL Writer    │
│  Astro Web   │                │  NestJS API  │     Write     │  (TiDB / 3306)   │
│  (포트 4321)  │  <──────────   │  (포트 4000)  │               └─────────────────┘
│              │     JSON       │              │     Read      ┌─────────────────┐
└──────┬───────┘                └──────┬───────┘  ──────────>  │  MySQL Reader    │
       │                               │                       │  (TiDB / 3307)   │
       │ 이미지 업로드                   │ OAuth (Kakao·Naver)    └─────────────────┘
       ▼                               ▼
┌──────────────┐               ┌──────────────┐
│ Cloudflare R2 │               │ 카카오/네이버   │
│  (이미지 스토리지)│               │   Identity    │
└──────────────┘               └──────────────┘
                                      │ FCM 푸시
                                      ▼
                               ┌──────────────┐
                               │  Firebase Messaging │
                               └──────────────┘
```

## 인증 흐름

```
[카카오/네이버 시작하기] → GET /auth/{kakao|naver} → 프로바이더 동의 화면
                                              ↓
Frontend ← 302 /login?access_token=...&refresh_token=... ← GET /auth/{kakao|naver}/callback
                                              ↓
         (프론트에서 localStorage 저장 → login_redirect 경로로 이동)
```

- **토큰 저장**: localStorage (`access_token`, `refresh_token`)
- **전송 방식**: `Authorization: Bearer <token>` 헤더
- **cross-origin**: `credentials: 'omit'` (쿠키 미사용)
- 선제 갱신: AT 만료 1분 전 자동 refresh (JWT exp 디코딩)
- 401 처리: refresh 1회 재시도 → 실패 시 localStorage 클리어 + `/login` 리다이렉트
- refresh mutex: 동시 401 발생 시 refresh 요청 1회만 실행

## 앱 역할

### apps/web (Astro)
- 사용자에게 보여지는 프론트엔드
- SSG + 동적 라우트(`/rooms/public/[id]` 등은 SSR, `prerender = false`)
- 방(Room) 기반 식당/방문/리뷰 관리 UI, 공개 방 열람, 공유 OG 메타
- API 서버와 HTTP 통신 (**Bearer 토큰 + localStorage**, `credentials: 'omit'`)
- View Transitions 적용 (`astro:page-load` 기반 초기화 패턴)

### apps/api (NestJS)
- REST API 제공
- 비즈니스 로직 처리
- MySQL(TiDB) 데이터베이스 연동 (Prisma ORM, Reader/Writer 분리)
- 카카오 · 네이버 OAuth + JWT 인증/인가 처리
- Cloudflare R2 presigned URL 발급 (이미지 업로드)
- FCM 푸시 알림

## 공유 패키지

### @repo/types
- 프론트엔드와 백엔드 간 공유 타입 정의
- `User`, `AuthUser`, `Room`, `RoomMember`, `RoomRestaurant`, `RoomVisit`, `RoomReview`
- `SharedRoomDetail`(summary 포함), `SharedRoomRestaurant`, `SharedRoomSummary`
- `Poll`, `PollOption`, `AppNotification`, `TimelineItem`
- `RankingUser`, `RankingsResponse`, `DiscoverResponse`, `PlatformStats`, `RoomStats`
- `Inquiry`, `Notice`
- 수정 시 양쪽에 자동 반영

### @repo/utils
- 공통 유틸리티 함수
- `formatRating()` - 별점 표시
- `formatDate()` - 날짜 포맷팅

### @repo/typescript-config
- base, astro, nestjs용 tsconfig 프리셋

### @repo/eslint-config
- base, astro, nestjs용 ESLint flat config 프리셋

## 포트 배정

| 서비스 | 포트 |
|--------|------|
| Astro (web) | 4321 |
| NestJS (api) | 4000 |
| MySQL Writer | 3306 |
| MySQL Reader | 3307 |
