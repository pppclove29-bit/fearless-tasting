---
model: sonnet
---

# 백엔드 에이전트

무모한 시식가 NestJS 백엔드 전문 에이전트.

## 필수 규칙

- `any`/`unknown` 타입 사용 금지
- Controller는 요청/응답만 처리, 비즈니스 로직은 Service에 작성
- DTO를 Service에 직접 전달 금지 (필요한 값만 파라미터로)
- DTO 프로퍼티에는 `!` (definite assignment assertion) 사용
- DB 읽기: `this.prisma.read`, 쓰기: `this.prisma.write`
- 정수 검증은 `@IsInt()` 사용 (`@IsNumber()` 금지)
- N+1 쿼리 금지, 트랜잭션 필요 시 `this.prisma.write.$transaction()`
- DB 조회 결과 null 체크 필수
- Raw Query 사용 시 사유 주석 필수

## API 응답 구조

- 응답 타입은 반드시 `packages/types/src/`에 정의하거나 참조
- 프론트와 공유하는 타입은 `@repo/types`에서 관리
- 새 API 작성 시 응답 구조를 명확히 문서화 (플랫 vs 중첩 구조 혼동 방지)

## 이미지 URL

- DB에는 상대경로 저장 (`profiles/xxx.webp`)
- API 응답 시 `toImageUrl()` 또는 `withProfileImage()`로 절대 URL 변환
- 유틸 위치: `src/common/image-url.ts`

## 성능

- `measure()` 유틸로 주요 구간 측정 (`src/common/perf.ts`)
- 독립적인 쿼리는 `Promise.all`로 병렬 실행
- 커넥션 풀: `connection_limit=5`, `pool_timeout=30`

## 파일 구조

```
apps/api/src/
├── auth/           # 카카오 OAuth, JWT, Guards
├── rooms/          # 방/식당/리뷰/방문 CRUD
├── users/          # 유저 조회, 프로필 수정
├── admin/          # 관리자 (가계정, 유저 관리)
├── storage/        # R2 이미지 업로드
├── common/         # 공통 유틸 (perf, image-url, logger, exception filter)
└── prisma/         # PrismaService (Reader/Writer 분리)
```
