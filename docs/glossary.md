# 용어집

프로젝트에서 사용하는 도메인 용어와 기술 용어를 정리한다.

---

## 도메인 용어

| 용어 | 설명 |
|------|------|
| **식당 (Restaurant)** | 리뷰 대상이 되는 음식점. 이름, 주소, 지역(시도/시군구/동), 카테고리를 갖는다 |
| **리뷰 (Review)** | 사용자가 식당에 남기는 평가. 1~5점 평점과 텍스트, 이미지를 포함한다 |
| **동네 (Neighborhood)** | 식당이 위치한 행정구역 단위 (예: 강남구, 마포구). 지도 필터링 기준 |
| **카테고리 (Category)** | 식당의 음식 종류 (예: 한식, 일식, 중식, 양식, 카페 등) |
| **평점 (Rating)** | 1~5 정수값. 5가 최고점 |
| **문의 (Inquiry)** | 고객이 보내는 문의/피드백. 지역 추가 요청, 버그 신고, 피드백, 기타로 분류된다 |

## 기술 용어

| 용어 | 설명 |
|------|------|
| **모노레포 (Monorepo)** | 여러 프로젝트(앱, 패키지)를 하나의 Git 저장소에서 관리하는 방식 |
| **워크스페이스 (Workspace)** | 모노레포 내 개별 패키지. `apps/web`, `apps/api`, `packages/types` 등이 각각 하나의 워크스페이스 |
| **Turborepo** | 모노레포의 빌드/실행을 병렬로 관리해주는 도구. `turbo.json`에서 태스크 파이프라인 정의 |
| **pnpm** | 패키지 매니저. npm보다 빠르고 디스크 효율적. `workspace:*`로 내부 패키지 참조 |
| **SSG** | Static Site Generation. 빌드 시점에 HTML을 미리 생성 |
| **SSR** | Server Side Rendering. 요청 시점에 서버에서 HTML을 생성 |
| **DTO** | Data Transfer Object. 요청/응답 데이터의 형태를 정의하고 유효성을 검증하는 클래스 |
| **Guard** | NestJS에서 요청의 인증/인가를 처리하는 미들웨어 |
| **Reader/Writer 분리** | DB 읽기(SELECT)와 쓰기(INSERT/UPDATE/DELETE)를 별도 인스턴스로 분리하는 패턴. 읽기 부하를 분산하기 위함 |
| **마이그레이션 (Migration)** | DB 스키마 변경을 코드로 관리하는 방식. Prisma에서 자동 생성 |
| **path alias** | `@/components/...`처럼 긴 상대경로 대신 짧은 별칭을 사용하는 기능 |

## 패키지 이름 규칙

| 패키지명 | 역할 |
|----------|------|
| `@repo/web` | Astro 프론트엔드 앱 |
| `@repo/api` | NestJS 백엔드 앱 |
| `@repo/types` | 프론트/백 공유 TypeScript 인터페이스 |
| `@repo/utils` | 프론트/백 공유 유틸리티 함수 |
| `@repo/typescript-config` | 공유 tsconfig 프리셋 |
| `@repo/eslint-config` | 공유 ESLint 설정 프리셋 |
