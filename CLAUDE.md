# 무모한 시식가 - Claude Code 가이드

지도 기반 맛집 리뷰 플랫폼 모노레포 프로젝트.

## 프로젝트 구조

- `apps/web/` - Astro 프론트엔드 (포트 4321)
- `apps/api/` - NestJS 백엔드 API (포트 4000, Prisma ORM, MySQL)
- `packages/types/` - 공유 타입 (`Restaurant`, `Review`, `User`)
- `packages/utils/` - 공유 유틸 (`formatRating`, `formatDate`)
- `packages/typescript-config/` - 공유 tsconfig (base, astro, nestjs)
- `packages/eslint-config/` - 공유 ESLint flat config (base, astro, nestjs)

## 기술 스택

- **모노레포**: Turborepo + pnpm
- **프론트엔드**: Astro 5, TypeScript
- **백엔드**: NestJS 11, Prisma, TypeScript
- **DB**: MySQL 8.0 (Reader/Writer 분리)
- **컨테이너**: Docker, docker-compose

## 핵심 규칙

- `any`/`unknown` 타입 사용 금지
- Controller는 요청/응답만 처리, 비즈니스 로직은 Service에 작성
- DTO를 Service에 직접 전달 금지 (필요한 값만 파라미터로)
- DB 읽기: `this.prisma.read`, 쓰기: `this.prisma.write`
- DB 쿼리는 Prisma ORM 사용 (Raw Query 시 사유 주석 필수)
- N+1 쿼리 금지, 트랜잭션 필요 시 `this.prisma.write.$transaction()`
- DB 조회 결과 null 체크 필수

## 문서 구조

```
docs/
├── backend/                    # 백엔드 개발 문서
│   ├── backend-guide.md        # 백엔드 가이드 인덱스
│   ├── nestjs-rules.md         # NestJS 모듈/컨트롤러/서비스 규칙
│   ├── prisma-rules.md         # Prisma ORM, Reader/Writer 분리
│   ├── api-design.md           # REST API 설계, DTO 패턴
│   └── security.md             # 보안 규칙
├── frontend/                   # 프론트엔드 개발 문서
│   ├── frontend-guide.md       # 프론트엔드 가이드 인덱스
│   ├── astro-rules.md          # Astro 페이지/컴포넌트/스타일 규칙
│   ├── api-communication.md    # API 통신, 환경 변수
│   ├── performance.md          # 성능 규칙
│   └── accessibility.md        # 접근성 규칙
├── policy/                     # 정책 문서
│   ├── conventions.md          # 코드 컨벤션, Git 규칙
│   └── code-review-guide.md    # PR 리뷰 체크리스트 (P1/P2/P3)
├── architecture.md             # 시스템 아키텍처
├── local-setup.md              # 로컬 환경 설정 (단계별)
├── glossary.md                 # 도메인/기술 용어집
├── env-variables.md            # 환경 변수 가이드
├── troubleshooting.md          # 트러블슈팅
└── README.md                   # 문서 인덱스
```

## 명령어

```bash
pnpm dev                          # 전체 개발 서버
pnpm --filter @repo/web dev       # 프론트엔드만
pnpm --filter @repo/api dev       # 백엔드만
pnpm build                        # 전체 빌드
pnpm lint                         # 전체 린트
docker compose up                 # Docker 개발 서버
```
