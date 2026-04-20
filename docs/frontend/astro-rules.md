# Astro 규칙

## 페이지

- 모든 페이지는 `src/pages/`에 위치한다
- 파일 기반 라우팅을 사용한다 (`pages/about.astro` → `/about`)
- 동적 라우트는 `[param].astro` 형식을 사용한다

## 컴포넌트

- 재사용 가능한 컴포넌트는 `src/components/`에 위치한다
- 컴포넌트 파일명은 PascalCase를 사용한다
- Props는 `interface Props`로 타입을 명시한다

```astro
---
interface Props {
  name: string;
  rating: number;
  imageUrl?: string;
}

const { name, rating, imageUrl } = Astro.props;
---

<div class="restaurant-card">
  <h3>{name}</h3>
  <!-- ... -->
</div>
```

## 레이아웃

- 공통 레이아웃은 `src/layouts/`에 위치한다
- `<slot />`으로 페이지 콘텐츠를 삽입한다
- `<head>` 태그, 네비게이션, 푸터는 레이아웃에서 관리한다

## 스타일

- 컴포넌트 스코프 스타일을 기본으로 사용한다 (`<style>` 태그)
- 글로벌 스타일은 `src/styles/`에 위치한다
- CSS 변수를 활용하여 테마를 관리한다

## path alias

- `@/`를 사용한다: `@/components/...`, `@/layouts/...`

## View Transitions 패턴

Astro View Transitions 사용 시 `<script>` 모듈은 최초 1회만 실행된다. 페이지별 초기화가 필요한 스크립트는 반드시 아래 패턴을 따라야 한다.

### 기본 패턴

```typescript
// 1. import는 모듈 레벨 (함수 바깥)
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

### 주의사항

- `initMyPage()` 직접 호출 금지 — `astro:page-load`는 최초 로드에서도 발생하므로 이중 실행된다
- 이벤트 리스너 중복 등록 방지: `cloneNode(true)` + `replaceWith`로 기존 리스너를 제거한 후 재등록한다
- `fetchCurrentUser` 캐시는 `astro:before-swap` 이벤트에서 `resetUserCache()`를 호출하여 초기화한다

### 다크모드 패턴

다크모드 `data-theme` 재적용은 `astro:after-swap` 이벤트에서 처리한다. View Transitions 이후 `<html>` 속성이 교체되므로 반드시 `is:inline` 스크립트로 처리해야 한다.

```astro
<script is:inline>
  document.addEventListener('astro:after-swap', () => {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  });
</script>
```

### 이벤트 순서 요약

| 이벤트 | 시점 | 용도 |
|--------|------|------|
| `astro:before-swap` | DOM 교체 직전 | `resetUserCache()` 등 캐시 초기화 |
| `astro:after-swap` | DOM 교체 직후 | 다크모드 `data-theme` 재적용 |
| `astro:page-load` | 페이지 완전 로드 후 | 페이지별 초기화 로직 실행 |
