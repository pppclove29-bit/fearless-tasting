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

### 카카오 / 네이버 OAuth + JWT

- **카카오 OAuth 2.0** 및 **네이버 OAuth 2.0**으로 로그인, **JWT**로 세션 관리
- Access Token (15분): localStorage 저장, 모든 API 요청에 `Authorization: Bearer <AT>` 헤더로 전송
- Refresh Token (7일): localStorage 저장 + DB에 **bcrypt 해시로 저장** (평문 저장 금지)
- 자세한 인증 아키텍처는 [authentication.md](authentication.md) 참고

### Guard 적용

- 인증이 필요한 엔드포인트에 `@UseGuards(JwtAuthGuard)`를 적용한다
- Guard가 `Authorization` 헤더에서 Bearer AT를 추출 → 검증 → `request.user`에 `{ id: string }` 세팅
- `@CurrentUser()` 데코레이터로 컨트롤러에서 유저 정보를 받는다 (`payload.sub` → `user.id`)

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
| `POST /rooms` | O (JwtAuthGuard) |
| `POST /rooms/join` | O (JwtAuthGuard) |
| `POST /rooms/:id/restaurants` | O (RoomMemberGuard) |
| `POST /rooms/:id/restaurants/:rid/visits` | O (RoomMemberGuard) |
| `POST /rooms/:id/visits/:visitId/reviews` | O (RoomMemberGuard) |
| `PATCH /rooms/:id/restaurants/:rid` | O (RoomMemberGuard) |
| `PATCH /rooms/:id/visits/:visitId` | O (RoomMemberGuard) |
| `GET /rooms/:id/stats` | O (RoomMemberGuard) |
| `GET /auth/me` | O (JwtAuthGuard) |
| `POST /auth/logout` | O (JwtAuthGuard) |
| `GET /rooms/public` | X (공개) |
| `GET /rooms/public/:id` | X (공개) |
| `GET /rooms/public/:id/restaurants/:rid` | X (공개) |
| `POST /inquiries` | X (공개) |
| `GET /inquiries` | O (AdminGuard) |

### 역할 기반 접근 제어

- User 모델에 `role` 필드 (`'user'` | `'admin'`, 기본값 `'user'`)
- `JwtAuthGuard`: 로그인 여부만 확인 (JWT AT 검증)
- `AdminGuard`: JwtAuthGuard를 먼저 실행 후 `role === 'admin'` 확인
- 방 내 권한: `RoomMemberGuard`(멤버 여부), `RoomManagerGuard`(owner/manager 여부) 별도 Guard

## 민감 정보 보호

- 응답에 패스워드, 토큰, 내부 키 등을 포함하지 않는다
- 에러 메시지에 DB 쿼리, 스택 트레이스 등 내부 정보를 노출하지 않는다
- `.env` 파일은 절대 Git에 커밋하지 않는다
- 공개 방(`/rooms/public/:id`) 응답에 멤버 정보 및 리뷰 작성자 정보를 포함하지 않는다

## 입력 검증

- 모든 사용자 입력은 DTO + `class-validator`로 검증한다
- 파일 업로드 시 확장자, 크기를 제한한다
- URL 파라미터도 타입 검증한다 (예: `@Param('id') id: string`)
- 정수 검증은 `@IsInt()` 사용 (`@IsNumber()` 금지 — 소수점 허용 방지)
