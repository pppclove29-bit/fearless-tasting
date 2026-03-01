# Astro 규칙

## 페이지

- 모든 페이지는 `src/pages/`에 위치한다
- 파일 기반 라우팅을 사용한다 (`pages/map.astro` → `/map`)
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
