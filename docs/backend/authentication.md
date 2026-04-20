# 인증 아키텍처

카카오 / 네이버 OAuth 2.0 + JWT 기반 인증 시스템.  
토큰은 **localStorage**에 저장하며, 모든 API 요청에 `Authorization: Bearer <AT>` 헤더를 첨부한다.

## 전체 흐름

```
1. 사용자가 /login 페이지에서 "카카오로 시작하기" 또는 "네이버로 시작하기" 클릭
2. GET /auth/kakao  또는  GET /auth/naver → 각 OAuth 인가 페이지로 302 리다이렉트
3. 사용자가 해당 서비스에서 로그인 + 동의
4. 서비스가 GET /auth/kakao/callback?code=xxx  또는  GET /auth/naver/callback?code=xxx&state=xxx 로 리다이렉트
5. 서버가 인가 코드로 OAuth 토큰 교환
6. OAuth 토큰으로 유저 정보 조회
7. Account 테이블에서 provider + providerId로 조회/생성
8. JWT Access Token + Refresh Token 발급
9. 프론트엔드 /login?access_token=...&refresh_token=... 으로 리다이렉트
10. 프론트엔드가 쿼리스트링에서 토큰을 읽어 localStorage에 저장
```

## DB 모델

```
User (프로필 정보)     Account (OAuth 정보)
┌─────────────┐        ┌──────────────────┐
│ id          │ 1───N  │ id               │
│ nickname    │◄──────│ provider         │  // 'kakao' | 'naver'
│ profileImage│        │ providerId       │  // OAuth 제공자 고유 ID
│ reviews[]   │        │ refreshToken     │  // bcrypt 해싱된 RT
└─────────────┘        └──────────────────┘
```

- User: 서비스 프로필 정보만 보관
- Account: OAuth 제공자 정보 분리 (다중 소셜 로그인 확장 가능)
- Refresh Token은 bcrypt 해싱 후 Account에 저장 (평문 저장 금지)

## 토큰 정책

| 토큰 | 만료 시간 | 저장 위치 |
|------|----------|----------|
| Access Token | 15분 | localStorage (`access_token`) |
| Refresh Token | 7일 | localStorage (`refresh_token`) + DB (bcrypt 해시) |

## JWT Payload

```json
{ "sub": "<userId (UUID 문자열)>" }
```

- payload에는 `sub`(userId)만 포함. email 등 민감 정보는 포함하지 않는다.
- `JwtAuthGuard`가 `payload.sub`를 `request.user.id`로 매핑한다.

## 파일 구조

```
apps/api/src/auth/
├── auth.module.ts              # JwtModule 설정, AuthService/JwtAuthGuard export
├── auth.service.ts             # 카카오/네이버 OAuth + JWT 토큰 관리
├── auth.controller.ts          # 인증 엔드포인트 (카카오/네이버 각각 2개 + me/refresh/logout)
├── guards/
│   └── jwt-auth.guard.ts       # Authorization 헤더에서 Bearer AT 추출 → 검증 Guard
└── decorators/
    └── current-user.decorator.ts  # @CurrentUser() 파라미터 데코레이터 (payload.sub → id)
```

## API 엔드포인트

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| GET | `/auth/kakao` | X | 카카오 인가 페이지로 리다이렉트 |
| GET | `/auth/kakao/callback` | X | 카카오 콜백 → JWT 발급 → `/login?access_token=...&refresh_token=...` |
| GET | `/auth/naver` | X | 네이버 인가 페이지로 리다이렉트 |
| GET | `/auth/naver/callback` | X | 네이버 콜백 → JWT 발급 → `/login?access_token=...&refresh_token=...` |
| GET | `/auth/me` | O | 현재 로그인 유저 정보 (`{ id, ... }`) |
| POST | `/auth/refresh` | X | body의 refreshToken으로 AT/RT 재발급 |
| POST | `/auth/logout` | O | DB Refresh Token 무효화 (fire-and-forget) |

## 카카오 OAuth 상세

1. `GET /auth/kakao` → `kauth.kakao.com` 인가 페이지로 302
2. `GET /auth/kakao/callback?code=xxx` → 인가 코드로 카카오 토큰 교환 (`kauth.kakao.com`)
3. 카카오 토큰으로 유저 정보 조회 (`kapi.kakao.com`)
4. Account(`provider='kakao'`) 조회/생성 → JWT 발급 → 프론트 리다이렉트

## 네이버 OAuth 상세

1. `GET /auth/naver` → `nid.naver.com` 인가 페이지로 302 (state 파라미터 포함)
2. `GET /auth/naver/callback?code=xxx&state=xxx` → 인가 코드로 네이버 토큰 교환
3. 네이버 토큰으로 유저 정보 조회
4. Account(`provider='naver'`) 조회/생성 → JWT 발급 → 프론트 리다이렉트

## Guard 사용법

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
  @CurrentUser() user: { id: string },
  @Body() dto: CreateReviewDto,
) {
  // user.id 는 JWT payload.sub 에서 매핑된 userId
  return this.reviewsService.create(dto.restaurantId, user.id, ...);
}
```

## 프론트엔드 연동

- 로그인 버튼: `/login` 페이지에서 카카오/네이버 프로바이더 선택 UI 제공
- 콜백 처리: `/login?access_token=...&refresh_token=...` 쿼리스트링을 읽어 localStorage에 저장
- 모든 API 호출: `apiFetch()` 래퍼가 `Authorization: Bearer <AT>` 헤더 자동 첨부 (`credentials: 'omit'`)
- 선제 갱신: AT 만료 1분 전 자동 refresh (JWT `exp` 디코딩)
- 401 처리: RT로 1회 재시도 → 실패 시 `clearTokens()` + `/login` 이동
- 로그아웃: `POST /auth/logout` (fire-and-forget) + 즉시 localStorage/쿠키 클리어

## 환경 변수

| 변수 | 설명 |
|------|------|
| `KAKAO_CLIENT_ID` | 카카오 REST API 키 |
| `KAKAO_REDIRECT_URI` | 카카오 OAuth 콜백 URL |
| `NAVER_CLIENT_ID` | 네이버 OAuth 클라이언트 ID |
| `NAVER_CLIENT_SECRET` | 네이버 OAuth 클라이언트 시크릿 |
| `NAVER_REDIRECT_URI` | 네이버 OAuth 콜백 URL |
| `JWT_ACCESS_SECRET` | Access Token 서명 시크릿 |
| `JWT_REFRESH_SECRET` | Refresh Token 서명 시크릿 |
| `FRONTEND_URL` | 프론트엔드 URL (CORS + 리다이렉트) |
