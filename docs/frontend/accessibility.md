# 접근성 규칙

## 필수 사항

- 모든 이미지에 `alt` 속성을 추가한다
- 시맨틱 HTML 태그를 사용한다 (`<nav>`, `<main>`, `<article>` 등)
- 키보드 네비게이션을 지원한다
- 색상 대비를 WCAG AA 기준 이상으로 유지한다

## 예시

```html
<!-- 올바른 예 - 시맨틱 태그 사용 -->
<nav>...</nav>
<main>
  <article>
    <h2>식당 이름</h2>
    <img src="photo.webp" alt="식당 외관 사진" />
  </article>
</main>

<!-- 잘못된 예 - div만 사용 -->
<div class="nav">...</div>
<div class="content">
  <div class="card">
    <img src="photo.webp" />  <!-- alt 속성 누락 -->
  </div>
</div>
```
