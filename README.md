# 무모한 시식가

지도 기반 맛집 리뷰 플랫폼. 각 동네 식당을 방문하고 리스트로 관리하며, 평점과 리뷰를 남기고 다른 유저와 공유할 수 있습니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Astro 5 |
| 백엔드 | NestJS 11 |
| 모노레포 | Turborepo + pnpm |
| 언어 | TypeScript 5 |
| 컨테이너 | Docker |

## 프로젝트 구조

```
├── apps/
│   ├── web/                    # Astro 프론트엔드 (포트 4321)
│   └── api/                    # NestJS 백엔드 API (포트 4000)
├── packages/
│   ├── typescript-config/      # 공유 tsconfig
│   ├── eslint-config/          # 공유 ESLint 설정
│   ├── types/                  # 공유 타입 (Restaurant, Review, User)
│   └── utils/                  # 공유 유틸리티 함수
├── docs/                       # 프로젝트 문서 및 규칙
├── docker-compose.yml
├── Dockerfile
├── turbo.json
└── pnpm-workspace.yaml
```

## 시작하기

### Docker 사용 (권장)

```bash
# 전체 개발 서버 실행
docker compose up

# 빌드 후 실행
docker compose up --build
```

### 로컬 실행

```bash
# 의존성 설치
pnpm install

# 전체 개발 서버 실행 (프론트 + 백엔드 동시)
pnpm dev

# 개별 실행
pnpm --filter @repo/web dev    # 프론트엔드만
pnpm --filter @repo/api dev    # 백엔드만

# 빌드
pnpm build

# 린트
pnpm lint
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/restaurants` | 식당 목록 조회 |
| POST | `/restaurants` | 식당 등록 |
| GET | `/reviews` | 리뷰 목록 조회 |
| POST | `/reviews` | 리뷰 작성 |
| GET | `/users` | 사용자 목록 조회 |

## 문서

프로젝트 규칙 및 컨벤션은 [docs/](docs/) 폴더를 참고하세요.
