# 안드로이드 앱 빌드 · 출시 가이드

Capacitor 기반 안드로이드 앱(`kr.fearlesstasting.app`)의 빌드 구조와 Play 스토어 출시 절차.

## 1. 구조

앱은 **웹을 원격으로 띄우는 껍데기가 아니라 로컬 정적 번들**을 웹뷰에서 연다.
(원격 URL 로딩은 Play "minimum functionality" 정책 리스크 + 서버 장애 시 앱 백지)

```
apps/web/src/            ← 웹·앱 공통 소스
  ↓ scripts/build-app.mjs
apps/web/.app-src/       ← 임시 복사본 (SEO 전용 라우트 제거, prerender 강제)
  ↓ astro build --config astro.config.app.mjs
apps/web/dist-app/       ← 앱 번들 (정적)
  ↓ cap sync android
apps/web/android/        ← Android Studio 프로젝트
```

| 빌드 | 명령 | 출력 | 용도 |
| --- | --- | --- | --- |
| 웹 | `pnpm --filter @repo/web build` | `dist/` | Cloudflare Pages (SSR) |
| 앱 | `pnpm --filter @repo/web build:app` | `dist-app/` | Capacitor 번들 (정적) |

### 앱 번들에서 제외되는 라우트

`scripts/build-app.mjs`의 `EXCLUDED_PAGES` — SEO 전용이라 앱에 넣을 이유가 없고, 동적 SSR이라 정적 빌드도 불가:

- `/rooms/public`, `/rooms/public/**` (공개 방)
- `/community`, `/community/**`
- `/guide/**`, `/use/**`
- `sitemap*.xml`

앱 안에서 이 경로 링크를 누르면 `lib/native.ts`가 가로채 **시스템 브라우저로 musikga.kr**을 연다.

## 2. 개발 흐름

```bash
# 앱 번들 빌드 + 네이티브 프로젝트 동기화
pnpm --filter @repo/web cap:sync

# Android Studio 열기
pnpm --filter @repo/web cap:open:android

# CLI 디버그 APK
pnpm --filter @repo/web android:debug
```

> Capacitor CLI는 **Node 22+** 필요. nvm 사용 시 `nvm use 22` 선행.
> Gradle은 Android Studio 번들 JDK 사용 권장:
> `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`

라이브 리로드로 개발하려면 `CAP_SERVER_URL=http://<로컬IP>:4321 npx cap sync android` — **개발 전용**. 릴리스 빌드에선 절대 설정하지 말 것.

## 3. 로그인(OAuth) 동작 방식

로컬 번들이라 웹뷰 origin이 `https://localhost` — 웹(`musikga.kr`)과 localStorage가 분리된다. 그래서 앱 로그인은 딥링크로 처리한다.

```
앱 로그인 버튼
  → 시스템 브라우저로 GET {API}/auth/kakao?client=app
  → API가 state="app.<random>" 으로 카카오 인가 요청
  → 콜백에서 state가 app.* 이면
     kr.fearlesstasting.app://login?access_token=...&refresh_token=... 로 302
  → Manifest 커스텀 스킴 intent-filter → 앱 기동
  → lib/native.ts appUrlOpen → /login?access_token=... 으로 이동 → 기존 토큰 저장 로직 재사용
```

관련 코드: [auth.controller.ts](../apps/api/src/auth/auth.controller.ts) `buildLoginRedirect`, [native.ts](../apps/web/src/lib/native.ts), [login.astro](../apps/web/src/pages/login.astro)

- 카카오·네이버 콘솔 설정 변경 **불필요** (리다이렉트 URI는 여전히 API 콜백)
- 스킴 변경이 필요하면 API 환경변수 `APP_DEEP_LINK_SCHEME` + AndroidManifest 동시 수정

## 4. 딥링크 (App Links)

`AndroidManifest.xml`이 `https://musikga.kr/join`, `/room` 을 claim한다. 실제 검증(앱 자동 오픈)에는 아래 파일이 필요하다.

`apps/web/public/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "kr.fearlesstasting.app",
    "sha256_cert_fingerprints": ["<Play 앱 서명 SHA-256>"]
  }
}]
```

지문은 **Play Console → 설정 → 앱 서명**에서 확인 (앱 서명 키 인증서 SHA-256). 첫 AAB 업로드 후에 확인 가능하므로, 업로드 → 지문 확인 → 이 파일 커밋·배포 순서.

파일이 없으면 링크는 그냥 브라우저로 열린다(앱은 정상 동작).

## 5. 릴리스 서명 키

`apps/web/android/keystore.properties`(gitignore됨)가 있으면 release 서명이 활성화된다.

```bash
cd apps/web/android
keytool -genkey -v -keystore app/fearless-release.jks \
  -alias fearless -keyalg RSA -keysize 2048 -validity 10000
```

```properties
# keystore.properties
storeFile=app/fearless-release.jks
storePassword=<비밀번호>
keyAlias=fearless
keyPassword=<비밀번호>
```

> ⚠️ `.jks` 파일과 비밀번호는 분실하면 **같은 앱으로 업데이트 불가**. 안전한 곳에 백업.

## 6. 릴리스 빌드

```bash
cd apps/web
APP_VERSION_CODE=2 APP_VERSION_NAME=1.0.1 pnpm android:release
# → android/app/build/outputs/bundle/release/app-release.aab
```

`versionCode`는 업로드마다 **증가 필수** (gradle 프로퍼티 `-PappVersionCode=` 또는 환경변수).

## 7. Play Console 체크리스트

- [ ] 개발자 계정 등록 ($25, 1회)
- [ ] **개인 계정이면 클로즈드 테스트 20명 이상 · 14일 연속** 후에야 프로덕션 신청 가능 (Google 정책) — 일정에 반드시 반영
- [ ] 앱 이름 / 짧은 설명 / 자세한 설명
- [ ] 스크린샷 (폰 최소 2장), 512×512 아이콘, 1024×500 피처 그래픽
- [ ] 개인정보처리방침 URL: `https://musikga.kr/privacy`
- [ ] 데이터 안전 양식: 수집 항목 = 이메일·닉네임·프로필 이미지(OAuth), 사용자 생성 콘텐츠(리뷰·사진), 기기 ID(FCM 토큰)
- [ ] 광고 포함 여부 (`PUBLIC_AD_CLIENT` 설정 시 "예")
- [ ] 콘텐츠 등급 설문
- [ ] 대상 연령층
- [ ] 앱 서명: Play 앱 서명 사용(권장) → 이후 assetlinks.json 지문 등록

## 8. 출시 전 실기기 확인 항목

- [ ] 카카오 로그인 → 앱으로 복귀 → 토큰 저장 → 방 목록 진입
- [ ] 네이버 로그인 동일
- [ ] 하드웨어 뒤로가기: 화면 이동 후 뒤로 → 홈에서 뒤로 → 종료
- [ ] 푸시 권한 요청 + FCM 수신
- [ ] 공개 방/커뮤니티 링크 클릭 → 외부 브라우저 오픈
- [ ] 초대 링크(`musikga.kr/join?code=...`) 클릭 → 앱 오픈 (assetlinks 배포 후)
- [ ] 오프라인 상태에서 앱 실행 → 껍데기 UI는 뜨고 데이터 영역만 에러
