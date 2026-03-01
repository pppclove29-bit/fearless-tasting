# 인증 아키텍처

카카오 OAuth 2.0 + JWT 기반 인증 시스템.

## 전체 흐름

```
1. 사용자가 /login 페이지에서 "카카오로 시작하기" 클릭
2. GET /auth/kakao → 카카오 인가 페이지로 302 리다이렉트
3. 사용자가 카카오에서 로그인 + 동의
4. 카카오가 GET /auth/kakao/callback?code=xxx 로 리다이렉트
5. 서버가 인가 코드로 카카오 토큰 교환 (kauth.kakao.com)
6. 카카오 토큰으로 유저 정보 조회 (kapi.kakao.com)
7. Account 테이블에서 provider='kakao' + providerId로 조회/생성
8. JWT Access Token + Refresh Token 발급
9. httpOnly 쿠키에 토큰 설정
10. 프론트엔드 /login?success=true 로 리다이렉트
```

## DB 모델

```
User (프로필 정보)     Account (OAuth 정보)
┌─────────────┐        ┌──────────────────┐
│ id          │ 1───N  │ id               │
│ email       │◄──────│ provider         │  // 'kakao'
│ nickname    │        │ providerId       │  // 카카오 고유 ID
│ profileImage│        │ refreshToken     │  // bcrypt 해싱된 RT
│ reviews[]   │        │ userId (FK)      │
└─────────────┘        └──────────────────┘
```

- User: 서비스 프로필 정보만 보관
- Account: OAuth 제공자 정보 분리 (다중 소셜 로그인 확장 가능)
- Refresh Token은 bcrypt 해싱 후 Account에 저장

## 토큰 설정

| 토큰 | 만료 시간 | 쿠키 이름 | 저장 위치 |
|------|----------|----------|----------|
| Access Token | 15분 | `access_token` | httpOnly Cookie |
| Refresh Token | 7일 | `refresh_token` | httpOnly Cookie + DB (해싱) |

## 파일 구조

```
apps/api/src/auth/
├── auth.module.ts              # JwtModule 설정, AuthService/JwtAuthGuard export
├── auth.service.ts             # 카카오 OAuth + JWT 토큰 관리
├── auth.controller.ts          # 인증 엔드포인트 5개
├── guards/
│   └── jwt-auth.guard.ts       # 쿠키에서 AT 추출 → 검증 Guard
└── decorators/
    └── current-user.decorator.ts  # @CurrentUser() 파라미터 데코레이터
```

## API 엔드포인트

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| GET | `/auth/kakao` | X | 카카오 인가 페이지로 리다이렉트 |
| GET | `/auth/kakao/callback` | X | 카카오 콜백 → 토큰 발급 → 프론트 리다이렉트 |
| GET | `/auth/me` | O | 현재 로그인 유저 정보 (`{ id, email }`) |
| POST | `/auth/refresh` | X | Refresh Token으로 토큰 갱신 |
| POST | `/auth/logout` | O | 쿠키 삭제 + DB Refresh Token 무효화 |

## Guard 사용법

다른 모듈에서 인증이 필요한 엔드포인트에 Guard를 적용하는 방법:

### 1. 모듈에 AuthModule import

```typescript
// reviews.module.ts
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  ...
})
```

### 2. 컨트롤러에서 Guard + 데코레이터 사용

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Post()
@UseGuards(JwtAuthGuard)
create(
  @CurrentUser() user: { id: string; email: string },
  @Body() dto: CreateReviewDto,
) {
  // user.id로 작성자 지정
  return this.reviewsService.create(dto.restaurantId, user.id, ...);
}
```

## 프론트엔드 연동

- 모든 API 호출에 `credentials: 'include'` 포함 (`apiFetch` 래퍼)
- `fetchCurrentUser()`로 로그인 상태 확인
- 로그인 버튼: `<a href="http://localhost:4000/auth/kakao">`
- 로그아웃: `POST /auth/logout` 호출 후 페이지 이동

## 환경 변수

| 변수 | 설명 |
|------|------|
| `KAKAO_CLIENT_ID` | 카카오 REST API 키 |
| `KAKAO_CLIENT_SECRET` | 카카오 Client Secret |
| `KAKAO_CALLBACK_URL` | OAuth 콜백 URL |
| `JWT_ACCESS_SECRET` | Access Token 서명 시크릿 |
| `JWT_REFRESH_SECRET` | Refresh Token 서명 시크릿 |
| `FRONTEND_URL` | 프론트엔드 URL (CORS + 리다이렉트) |
