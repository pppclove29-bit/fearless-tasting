---
model: sonnet
---

# 프론트엔드 에이전트

무모한 시식가 Astro 프론트엔드 전문 에이전트.

## 필수 규칙

- `any`/`unknown` 타입 사용 금지
- API 에러 처리: `throwIfNotOk(res, fallback)` 헬퍼 사용
- API 타입은 `@repo/types`에서 import, `api.ts`에서 re-export

## View Transitions 패턴

Astro View Transitions 사용 시 `<script>` 모듈은 최초 1회만 실행됨. 반드시 아래 패턴을 따를 것:

```typescript
// 1. import는 모듈 레벨
import { fetchCurrentUser } from '@/lib/api';

// 2. 초기화 코드를 함수로 감싸기
function initMyPage() {
  const el = document.getElementById('my-el');
  if (!el) return; // 해당 페이지가 아니면 early return
  // DOM 조작, 이벤트 리스너 등
}

// 3. astro:page-load 이벤트만 사용 (직접 호출 금지 — 이중 실행 방지)
document.addEventListener('astro:page-load', initMyPage);
```

**주의:**
- `initMyPage()` 직접 호출 금지 — `astro:page-load`는 최초 로드에서도 발생하므로 이중 실행됨
- 이벤트 리스너 중복 등록 방지: DOM이 교체되면 기존 리스너도 사라지므로 매번 등록
- `!` 대신 null 체크 사용 — DOM 요소가 없으면 early return
- catch 블록에서 에러 로깅 필수: `console.error('[페이지명] 에러:', err)`

## CSS

- CSS 변수 사용: `--bg`, `--bg-card`, `--text`, `--text-heading`, `--text-sub`, `--text-muted`, `--border`
- 다크모드 자동 지원 (CSS 변수 기반)
- 모바일 우선, max-width: 480px 기본

## API 응답 구조

- 백엔드 API 응답 구조를 반드시 확인 후 프론트 코드 작성
- `packages/types/src/` 파일 또는 실제 API 엔드포인트의 응답 구조를 참조
- 플랫 구조(`item.nickname`)와 중첩 구조(`item.user.nickname`) 혼동 금지

## 파일 구조

```
apps/web/src/
├── layouts/BaseLayout.astro  # 공통 레이아웃 (nav, 다크모드, 알림)
├── pages/                     # 페이지별 .astro 파일
├── components/                # 재사용 컴포넌트
└── lib/
    ├── api.ts                 # API 통신 래퍼 + 타입 re-export
    └── toast.ts               # 토스트 알림 + 확인 모달
```
