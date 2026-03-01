# 아키텍처

## 시스템 구성도

```
┌──────────────┐     HTTP      ┌──────────────┐
│              │  ──────────>  │              │
│  Astro Web   │               │  NestJS API  │
│  (포트 4321)  │  <──────────  │  (포트 4000)  │
│              │     JSON      │              │
└──────────────┘               └──────┬───────┘
                                      │
                                      │ (추후)
                                      ▼
                               ┌──────────────┐
                               │   Database   │
                               └──────────────┘
```

## 앱 역할

### apps/web (Astro)
- 사용자에게 보여지는 프론트엔드
- SSG/SSR 지원
- 지도 표시, 리뷰 목록, 식당 상세 등 UI 담당
- API 서버와 HTTP 통신

### apps/api (NestJS)
- REST API 제공
- 비즈니스 로직 처리
- 데이터베이스 연동 (추후)
- 인증/인가 처리 (추후)

## 공유 패키지

### @repo/types
- 프론트엔드와 백엔드 간 공유 타입 정의
- `Restaurant`, `Review`, `User` 인터페이스
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
