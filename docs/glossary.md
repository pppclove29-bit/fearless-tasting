# 용어집

프로젝트에서 사용하는 도메인 용어와 기술 용어를 정리한다.

---

## 도메인 용어

| 용어 | 설명 |
|------|------|
| **방 (Room)** | 맛집 리뷰를 공유하는 그룹 공간. 초대 코드로 입장. `isPublic: true`이면 비로그인 사용자가 `/rooms/public/:id`로 열람 가능 |
| **공개 방 (isPublic)** | `Room.isPublic` 필드. `true`이면 공개 엔드포인트(`GET /rooms/public/:id`)로 비로그인 열람 가능. 방장/매니저가 `PATCH /:id/public`으로 토글 |
| **방 식당 (RoomRestaurant)** | 방 내에 등록된 음식점. 이름, 주소, 카테고리, 대기시간(waitTime)을 갖는다 |
| **방문 (RoomVisit)** | 방 식당에 대한 방문 기록. 방문일(visitedAt), 메모(memo), 참여자 태그를 포함한다 |
| **방문 참여자 (RoomVisitParticipant)** | 방문에 함께한 멤버 태그. RoomVisit과 User를 연결한다 |
| **리뷰 (RoomReview)** | 방문별 리뷰. 종합 평점(0.5 단위 Float), 세부 평점(맛/가성비/서비스/청결/접근성, 1~5 정수), 재방문 의사(`wouldRevisit`), 추천 메뉴(`favoriteMenu`), 다음에 먹을 메뉴(`tryNextMenu`)를 포함한다 |
| **카테고리 (Category)** | 식당의 음식 종류 (예: 한식, 일식, 중식, 양식, 카페 등) |
| **종합 평점 (rating)** | 0.5~5 Float값. 0.5 단위 반별점 지원. `20260417_half_star_ratings` 마이그레이션부터 적용 |
| **세부 평점** | 맛(tasteRating), 가성비(valueRating), 서비스(serviceRating), 청결(cleanlinessRating), 접근성(accessibilityRating). 1~5 정수값 |
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
