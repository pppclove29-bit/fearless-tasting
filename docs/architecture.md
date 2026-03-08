# 아키텍처

## 시스템 구성도

```
┌──────────────┐     HTTP      ┌──────────────┐     Prisma    ┌─────────────────┐
│              │  ──────────>  │              │  ──────────>  │  MySQL Writer    │
│  Astro Web   │  (쿠키 포함)   │  NestJS API  │     Write     │  (포트 3306)      │
│  (포트 4321)  │  <──────────  │  (포트 4000)  │               └─────────────────┘
│              │     JSON      │              │     Read      ┌─────────────────┐
└──────────────┘               └──────┬───────┘  ──────────>  │  MySQL Reader    │
                                      │                       │  (포트 3307)      │
                                      │ OAuth                 └─────────────────┘
                                      ▼
                               ┌──────────────┐
                               │  카카오 API    │
                               └──────────────┘
```

## 인증 흐름

```
[카카오 로그인 버튼] → GET /auth/kakao → 카카오 동의 화면
                                              ↓
Frontend ← 302 /login?success ← GET /auth/kakao/callback ← 카카오 redirect
(httpOnly 쿠키에 Access Token / Refresh Token 설정)
```

## 앱 역할

### apps/web (Astro)
- 사용자에게 보여지는 프론트엔드
- SSG/SSR 지원
- 방(Room) 기반 식당/방문/리뷰 관리 UI, 공유 링크 열람
- API 서버와 HTTP 통신 (쿠키 기반 인증, `credentials: 'include'`)

### apps/api (NestJS)
- REST API 제공
- 비즈니스 로직 처리
- MySQL 데이터베이스 연동 (Prisma ORM, Reader/Writer 분리)
- 카카오 OAuth + JWT 인증/인가 처리

## 공유 패키지

### @repo/types
- 프론트엔드와 백엔드 간 공유 타입 정의
- `User`, `Room`, `RoomMember`, `RoomRestaurant`, `RoomVisit`, `RoomReview`, `SharedRoom*` 인터페이스
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
