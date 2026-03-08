# 프론트엔드 가이드 (Astro)

프론트엔드 개발 문서 인덱스. 각 규칙은 별도 파일로 분리되어 있다.

## 디렉토리 구조

```
apps/web/src/
├── pages/              # 라우팅 페이지
│   ├── index.astro     # 홈 (내 방 목록)
│   ├── room.astro      # 방 상세 (식당/방문/리뷰 CRUD)
│   ├── share.astro     # 공유 열람 (비로그인)
│   ├── login.astro
│   └── cs.astro
├── layouts/            # 페이지 레이아웃
│   └── BaseLayout.astro
├── components/         # 재사용 UI 컴포넌트
│   ├── StarRating.astro
│   └── ...
├── styles/             # 글로벌/공통 스타일
│   └── global.css
└── lib/                # 유틸리티, API 클라이언트
    └── api.ts
```

## 규칙 문서

| 문서 | 설명 |
|------|------|
| [astro-rules.md](astro-rules.md) | Astro 페이지/컴포넌트/레이아웃/스타일/path alias 규칙 |
| [api-communication.md](api-communication.md) | API 클라이언트, 환경 변수 규칙 |
| [performance.md](performance.md) | 이미지 최적화, SSG, 클라이언트 로딩 규칙 |
| [accessibility.md](accessibility.md) | 접근성 (alt, 시맨틱 HTML, 키보드, 색상 대비) |
