# 백엔드 가이드 (NestJS + Prisma)

백엔드 개발 문서 인덱스. 각 규칙은 별도 파일로 분리되어 있다.

## 디렉토리 구조

```
apps/api/src/
├── main.ts                         # 앱 엔트리포인트
├── app.module.ts                   # 루트 모듈
├── prisma/
│   ├── prisma.module.ts            # Prisma 모듈 (Global)
│   └── prisma.service.ts           # Prisma 서비스 (Reader/Writer)
├── restaurants/
│   ├── restaurants.module.ts
│   ├── restaurants.controller.ts
│   ├── restaurants.service.ts
│   └── dto/
├── reviews/
│   ├── reviews.module.ts
│   ├── reviews.controller.ts
│   ├── reviews.service.ts
│   └── dto/
└── users/
    ├── users.module.ts
    ├── users.controller.ts
    └── users.service.ts
```

## 규칙 문서

| 문서 | 설명 |
|------|------|
| [nestjs-rules.md](nestjs-rules.md) | NestJS 모듈/컨트롤러/서비스/에러처리 규칙 |
| [prisma-rules.md](prisma-rules.md) | Prisma ORM, Reader/Writer 분리, 쿼리 작성, 마이그레이션 |
| [api-design.md](api-design.md) | REST API 설계, DTO 패턴, 응답 코드 |
| [security.md](security.md) | 보안 규칙 (SQL Injection, 인증, 민감정보) |
