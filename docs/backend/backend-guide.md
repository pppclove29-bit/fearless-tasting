# 백엔드 가이드 (NestJS + Prisma)

백엔드 개발 문서 인덱스. 각 규칙은 별도 파일로 분리되어 있다.

## 디렉토리 구조

```
apps/api/src/
├── main.ts                         # 앱 엔트리포인트 (cookie-parser, CORS 설정)
├── app.module.ts                   # 루트 모듈
├── prisma/
│   ├── prisma.module.ts            # Prisma 모듈 (Global)
│   └── prisma.service.ts           # Prisma 서비스 (Reader/Writer)
├── auth/
│   ├── auth.module.ts              # 인증 모듈 (JwtModule 설정)
│   ├── auth.service.ts             # 카카오/네이버 OAuth, JWT 토큰 관리
│   ├── auth.controller.ts          # 인증 엔드포인트 (/auth/*)
│   ├── guards/
│   │   ├── jwt-auth.guard.ts       # JWT 검증 Guard
│   │   └── admin.guard.ts          # 관리자 역할 검증 Guard
│   └── decorators/
│       └── current-user.decorator.ts # @CurrentUser() 데코레이터
├── rooms/
│   ├── rooms.module.ts
│   ├── rooms.controller.ts
│   ├── rooms.service.ts
│   ├── room-stats.service.ts       # 방 통계 로직 분리
│   ├── guards/                     # RoomMemberGuard
│   └── dto/                        # CreateRoom, JoinRoom, UpdateRoom, CreatePoll 등
├── boards/
│   ├── boards.module.ts
│   ├── boards.controller.ts        # 커뮤니티 게시판/게시글/댓글
│   ├── admin-boards.controller.ts  # 게시판 관리자 API
│   ├── boards.service.ts
│   └── dto/
├── admin/
│   ├── admin.module.ts
│   ├── admin-stats.controller.ts   # 관리자 통계
│   ├── admin-stats.service.ts
│   ├── admin-users.controller.ts   # 관리자 유저 관리
│   ├── admin-users.service.ts
│   ├── demo-accounts.controller.ts # 데모 계정 관리
│   ├── demo-accounts.service.ts
│   ├── feature-requests.controller.ts
│   └── dto/
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
├── inquiries/
│   ├── inquiries.module.ts
│   ├── inquiries.controller.ts
│   ├── inquiries.service.ts        # 문의 등록 + SMTP 이메일 알림
│   └── dto/
├── notices/
│   ├── notices.module.ts           # 공지사항
│   └── dto/
├── places/
│   ├── places.module.ts
│   ├── places.controller.ts        # 카카오/네이버 장소 검색 프록시
│   └── places.service.ts
├── fcm/
│   ├── fcm.module.ts
│   └── fcm.service.ts              # Firebase Cloud Messaging 푸시 알림
├── storage/
│   ├── storage.module.ts
│   ├── storage.controller.ts       # 이미지 업로드
│   └── storage.service.ts
├── health/                         # 헬스체크 엔드포인트
└── common/
    ├── all-exceptions.filter.ts    # 전역 예외 필터
    ├── image-url.ts                # 이미지 URL 유틸
    ├── logger.middleware.ts        # HTTP 요청 로깅 (500ms+ SLOW 경고)
    └── perf.ts                     # measure() 성능 측정 유틸
```

## 규칙 문서

| 문서 | 설명 |
|------|------|
| [nestjs-rules.md](nestjs-rules.md) | NestJS 모듈/컨트롤러/서비스/에러처리 규칙 |
| [prisma-rules.md](prisma-rules.md) | Prisma ORM, Reader/Writer 분리, 쿼리 작성, 마이그레이션 |
| [api-design.md](api-design.md) | REST API 설계, DTO 패턴, 응답 코드 |
| [security.md](security.md) | 보안 규칙 (SQL Injection, 인증, 민감정보) |
| [authentication.md](authentication.md) | 카카오/네이버 OAuth + JWT 인증 아키텍처 |
