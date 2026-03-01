# 보안 규칙

## SQL Injection 방지

- Prisma ORM을 통해 자동 방어된다
- Raw Query 사용 시 반드시 **파라미터 바인딩**을 사용한다

```typescript
// 올바른 예 - 파라미터 바인딩
const result = await this.prisma.write.$queryRaw`
  SELECT * FROM Restaurant WHERE name = ${name}
`;

// 잘못된 예 - 문자열 연결 (절대 금지)
const result = await this.prisma.write.$queryRawUnsafe(
  `SELECT * FROM Restaurant WHERE name = '${name}'`  // X
);
```

## 인증/인가

### 카카오 OAuth + JWT

- **카카오 OAuth 2.0**으로 로그인, **JWT**로 세션 관리
- Access Token (15분) + Refresh Token (7일), **httpOnly Cookie**에 저장
- Refresh Token은 **bcrypt 해싱** 후 Account 테이블에 저장
- 자세한 인증 아키텍처는 [authentication.md](authentication.md) 참고

### 쿠키 보안 설정

```typescript
{
  httpOnly: true,                              // JS에서 접근 불가 (XSS 방어)
  secure: process.env.NODE_ENV === 'production', // 프로덕션에서 HTTPS만 허용
  sameSite: 'lax',                             // CSRF 기본 방어
  path: '/',
}
```

### Guard 적용

- 인증이 필요한 엔드포인트에 `@UseGuards(JwtAuthGuard)`를 적용한다
- Guard가 쿠키에서 AT를 추출 → 검증 → `request.user`에 payload 세팅
- `@CurrentUser()` 데코레이터로 컨트롤러에서 유저 정보를 받는다

```typescript
@Post()
@UseGuards(JwtAuthGuard)
create(@CurrentUser() user: { id: string }, @Body() dto: CreateReviewDto) {
  return this.reviewsService.create(dto.restaurantId, user.id, ...);
}
```

### 보호 대상 엔드포인트

| 엔드포인트 | 인증 필요 |
|-----------|----------|
| `POST /restaurants` | O |
| `POST /reviews` | O |
| `GET /auth/me` | O |
| `POST /auth/logout` | O |
| `GET /restaurants`, `GET /areas/counts` | X (공개) |
| `GET /reviews` | X (공개) |

## 민감 정보 보호

- 응답에 패스워드, 토큰, 내부 키 등을 포함하지 않는다
- 에러 메시지에 DB 쿼리, 스택 트레이스 등 내부 정보를 노출하지 않는다
- `.env` 파일은 절대 Git에 커밋하지 않는다

## 입력 검증

- 모든 사용자 입력은 DTO + `class-validator`로 검증한다
- 파일 업로드 시 확장자, 크기를 제한한다
- URL 파라미터도 타입 검증한다 (예: `@Param('id') id: string`)
