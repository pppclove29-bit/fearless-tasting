# 코드 컨벤션

## 프로젝트 구조 규칙

### 모노레포 구조

- `apps/` - 배포 가능한 애플리케이션
- `packages/` - 내부 공유 패키지
- 패키지 이름은 `@repo/` 스코프를 사용한다

### 워크스페이스 의존성

- 내부 패키지 참조 시 `workspace:*`를 사용한다
- `@repo/types`, `@repo/utils`는 raw TypeScript로 내보낸다 (빌드 불필요)

## 공통 TypeScript 규칙

- `strict` 모드를 사용한다
- `any`, `unknown` 타입 사용 절대 금지. 명확한 타입 정의 필수
- `type`과 `interface` 구분: 데이터 형태는 `interface`, 유니온/유틸리티는 `type`
- `import type`을 사용하여 타입과 값 import를 구분한다
- 사용하지 않는 변수는 `_` 접두사를 붙인다
- NaN, nullable, undefined 참조 및 falsy 값(`0`, `''`, `false`) 비교 시 명시적 검증 필수

### 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일 (컴포넌트) | PascalCase | `BaseLayout.astro` |
| 파일 (모듈) | kebab-case | `restaurants.controller.ts` |
| 클래스 | PascalCase | `RestaurantsService` |
| 함수/변수 | camelCase | `formatRating` |
| 상수 | UPPER_SNAKE_CASE | `MAX_RATING` |
| 타입/인터페이스 | PascalCase | `Restaurant` |

### 함수 작성 규칙

- 모든 함수에 목적/파라미터/반환값 설명 주석을 추가한다
- 함수는 50줄을 초과하지 않는다
- 하나의 함수는 하나의 책임만 갖는다
- util 함수는 `@repo/utils`에 두고, 새로 만들기 전에 기존 함수 재사용 가능 여부를 먼저 확인한다

## Git 규칙

### 브랜치 전략

- `main` - 프로덕션 배포 브랜치
- `develop` - 개발 통합 브랜치
- `feature/<기능명>` - 기능 개발
- `fix/<버그명>` - 버그 수정
- `hotfix/<긴급수정>` - 긴급 수정

### 커밋 메시지

Conventional Commits를 따른다:

```
<type>(<scope>): <description>

[body]
```

**type:**
- `feat` - 새로운 기능
- `fix` - 버그 수정
- `docs` - 문서 변경
- `style` - 코드 포맷팅 (기능 변경 없음)
- `refactor` - 리팩토링
- `test` - 테스트 추가/수정
- `chore` - 빌드, 설정 변경

**scope:** `web`, `api`, `types`, `utils`, `config`

**예시:**
```
feat(api): 식당 목록 조회 API 구현
fix(web): 지도 마커 클릭 이벤트 수정
docs: README 업데이트
chore(config): ESLint 규칙 추가
```
