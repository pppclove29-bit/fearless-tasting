# 프론트엔드 가이드 (Astro)

프론트엔드 개발 문서 인덱스. 각 규칙은 별도 파일로 분리되어 있다.

## 디렉토리 구조

```
apps/web/src/
├── pages/                          # 라우팅 페이지
│   ├── index.astro                 # 홈 (랜딩 + 로그인 시 내 방 대시보드)
│   ├── rooms.astro                 # 내 방 목록, 방 생성
│   ├── room.astro                  # 방 상세 (식당/방문/리뷰 CRUD, 멤버 관리)
│   ├── room/
│   │   ├── add.astro               # 식당 등록 위저드 (3단계)
│   │   └── restaurant.astro        # 식당 상세 (방문/리뷰 CRUD)
│   ├── rooms/
│   │   ├── public.astro            # 공개 방 목록 (비로그인 열람)
│   │   └── public/
│   │       └── [id].astro          # 공개 방 상세 (비로그인 열람)
│   ├── community.astro             # 커뮤니티 게시판 목록
│   ├── community/
│   │   └── [slug]/
│   │       ├── [postId].astro      # 게시글 상세
│   │       └── write.astro         # 게시글 작성
│   ├── discover.astro              # 맛집 추천 (고평점/재방문 공개 랭킹)
│   ├── rankings.astro              # 유저 랭킹
│   ├── about.astro                 # 서비스 소개
│   ├── profile.astro               # 프로필 (닉네임 수정, 테마)
│   ├── profile/
│   │   └── account.astro           # 계정 관리 (탈퇴 등)
│   ├── use/
│   │   ├── friends.astro           # 사용 사례 - 친구
│   │   ├── couples.astro           # 사용 사례 - 커플
│   │   └── team.astro              # 사용 사례 - 팀
│   ├── join.astro                  # 초대 링크 자동 입장
│   ├── login.astro                 # 카카오/네이버 로그인
│   ├── cs.astro                    # 문의 등록
│   ├── admin.astro                 # 관리자 (문의 관리)
│   ├── privacy.astro               # 개인정보처리방침
│   └── 404.astro                   # 404 페이지
├── layouts/                        # 페이지 레이아웃
│   └── BaseLayout.astro
├── components/                     # 재사용 UI 컴포넌트
│   └── AdSlot.astro                # 광고 슬롯 (PUBLIC_AD_CLIENT 미설정 시 비활성)
├── styles/                         # 글로벌/공통 스타일
│   └── global.css
└── lib/                            # 유틸리티, API 클라이언트
    ├── api.ts                      # API 통신 래퍼 (apiFetch, throwIfNotOk)
    ├── toast.ts                    # 토스트 알림 + 확인 모달
    └── ads.ts                      # 광고 스크립트 지연 로더
```

## 규칙 문서

| 문서 | 설명 |
|------|------|
| [astro-rules.md](astro-rules.md) | Astro 페이지/컴포넌트/레이아웃/스타일/path alias/View Transitions 규칙 |
| [api-communication.md](api-communication.md) | API 클라이언트, 환경 변수 규칙 |
| [performance.md](performance.md) | 이미지 최적화, SSG, 클라이언트 로딩 규칙 |
| [accessibility.md](accessibility.md) | 접근성 (alt, 시맨틱 HTML, 키보드, 색상 대비) |
