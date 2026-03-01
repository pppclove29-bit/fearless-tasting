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

- NestJS Guard를 통한 인증/인가 처리
- JWT 또는 세션 기반 인증 (추후 결정)
- 인증이 필요한 엔드포인트에는 Guard를 적용한다

## 민감 정보 보호

- 응답에 패스워드, 토큰, 내부 키 등을 포함하지 않는다
- 에러 메시지에 DB 쿼리, 스택 트레이스 등 내부 정보를 노출하지 않는다
- `.env` 파일은 절대 Git에 커밋하지 않는다

## 입력 검증

- 모든 사용자 입력은 DTO + `class-validator`로 검증한다
- 파일 업로드 시 확장자, 크기를 제한한다
- URL 파라미터도 타입 검증한다 (예: `@Param('id') id: string`)
