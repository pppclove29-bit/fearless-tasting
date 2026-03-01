# 성능 규칙

## 이미지

- 이미지는 최적화된 포맷(WebP)을 사용한다
- 적절한 `width`, `height` 속성을 명시하여 레이아웃 시프트를 방지한다

## 렌더링 전략

- 가능한 SSG(정적 생성)를 우선 사용한다
- 지도 등 무거운 라이브러리는 클라이언트 사이드로 로드한다

```astro
<!-- 무거운 컴포넌트는 client:only로 로드 -->
<MapComponent client:only="react" />

<!-- 뷰포트에 보일 때 로드 -->
<HeavyWidget client:visible />
```

## 에러/로딩 상태 처리

- 외부 API 호출 결과의 null/에러 상태를 UI에서 처리한다
- 로딩 상태를 사용자에게 보여준다
