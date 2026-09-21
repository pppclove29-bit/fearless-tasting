# 안드로이드 앱 빌드 · 출시 가이드

Capacitor 기반 안드로이드 앱(`kr.fearlesstasting.app`)의 빌드 구조와 Play 스토어 출시 절차.

## 진행 상황 (마지막 갱신: 2026-09-21)

작업하면서 이 체크박스를 갱신해 커밋한다. 다음 세션은 이걸 보고 이어받는다.

**코드 준비 — 완료**
- [x] 로컬 정적 번들 전환 (`build:app` → `dist-app`, 원격 URL 로딩 폐기)
- [x] OAuth 딥링크 (`client=app` → `kr.fearlesstasting.app://login`)
- [x] `POST_NOTIFICATIONS` 권한 + App Links intent-filter
- [x] 하드웨어 뒤로가기 · 외부 링크 시스템 브라우저 오픈 · 네이티브 SW 미등록
- [x] versionCode/Name 주입, 맥용 gradlew 스크립트
- [x] 디버그 APK 빌드 검증 (6.8MB)

**출시 준비 — 남음**
- [x] 릴리스 keystore 생성 + `keystore.properties` (§5) — 2026-08-18
      ⚠️ `apps/web/android/app/fearless-release.jks` 와 비밀번호를 **백업했는지 확인할 것**
- [x] 서명된 릴리스 AAB 빌드 검증 (versionCode 1 / 1.0.0, 5.0MB)
- [ ] 실기기·에뮬 테스트: 카카오·네이버 로그인 왕복 (§8)
      🚨 **2026-09-21 에뮬 검증에서 API CORS 차단 확인 — 앱이 데이터를 전혀 못 받는다 (§9)**
- [ ] Play Console 개발자 계정 등록 ($25)
- [ ] 심사용 테스트 카카오 계정 생성 + 샘플 데이터 (§7 앱 액세스 권한)
- [ ] 스토어 등록정보 (스크린샷·아이콘·설명)
- [ ] 내부 테스트 트랙 업로드
- [ ] 클로즈드 테스트 (테스터 12명 · 14일)
- [ ] 프로덕션 액세스 신청 → 심사
- [ ] `assetlinks.json` 지문 등록 (첫 업로드 후)

> 제품 방향과 우선순위는 [product-direction.md](product-direction.md) 참고.

### 검증 회차 기록

| 회차 | 환경 | 결과 |
| --- | --- | --- |
| 2026-08-18 | 에뮬레이터 | 로그인 차단 버그 3종 발견·수정 (`ca98b3c`) |
| 2026-09-21 | 에뮬레이터 `fearless_test` (Pixel 6 · Android 15 · arm64) | 빌드·설치·기동 OK. **API CORS 차단으로 전 기능 블로킹** (§9) |

#### 2026-09-21 회차 상세

재현에 쓴 명령 (Node 22 · Android Studio 번들 JDK 21 필요):

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

pnpm --filter @repo/web cap:sync       # 앱 번들 + 네이티브 동기화
pnpm --filter @repo/web android:debug  # 디버그 APK

adb install -r apps/web/android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n kr.fearlesstasting.app/.MainActivity
```

- APK: `apps/web/android/app/build/outputs/apk/debug/app-debug.apk` (6.6MB, versionCode 1 / 1.0.0)
- `adb`는 PATH에 없을 수 있다 → `~/Library/Android/sdk/platform-tools/adb`
- 시스템 JDK가 25면 AGP가 거부한다. 위 `JAVA_HOME` 필수.

확인된 것:
- 웹뷰가 로컬 번들(`https://localhost`)을 정상 로드, 스플래시 → 홈 렌더링
- `appUrlOpen`·`backButton` 리스너 등록됨
- OAuth 복귀 딥링크 동작: `kr.fearlesstasting.app://login?access_token=...` 주입 시
  `https://localhost/login?access_token=...` 로 이동 확인 (intent-filter + `native.ts` 정상)
- 하드웨어 뒤로가기: 루트에서 `canGoBack:false` → 앱 종료 (의도대로)

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

### ⚠️ 앱 빌드 전 `apps/web/.env` 필수

앱 번들은 **빌드 시점에 환경변수가 코드에 박힌다.** 웹은 Cloudflare Pages가
대시보드 값을 주입하지만 앱은 로컬에서 빌드되므로, `.env` 가 없으면
`PUBLIC_API_URL` 이 `localhost:4000` 으로 굳은 앱이 만들어진다(실제로 발생했다).

`build:app` 이 필수값을 검사해 빌드를 중단시키지만, 값 자체는 직접 채워야 한다.
출처: Cloudflare 대시보드 → Workers & Pages → 프로젝트 → Settings → Environment variables.

```
PUBLIC_API_URL, SITE_URL
PUBLIC_KAKAO_MAP_KEY, PUBLIC_GA_ID
PUBLIC_FIREBASE_{API_KEY,AUTH_DOMAIN,PROJECT_ID,MESSAGING_SENDER_ID,APP_ID,VAPID_KEY}
```

값이 비면 조용히 기능만 죽는다 — 지도 미표시, 푸시 등록 실패, **GA 퍼널 계측 누락**.

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

### 계정
- [ ] 개발자 계정 등록 ($25, 1회)
- [ ] 계정 유형 선택
  - **개인**: 프로덕션 출시 전 **클로즈드 테스트 12명 이상이 14일 연속 참여** 필요
    (2023-11 이후 생성된 개인 계정 대상. 요구 인원은 정책이 바뀌어 왔으니 콘솔의
    "프로덕션 액세스 신청" 화면에 표시되는 현재 숫자를 기준으로 볼 것)
  - **조직/사업자**: 위 테스트 요구사항 면제. 대신 D-U-N-S 번호 필요

### 앱 액세스 권한 ⚠️ 이 앱에서 가장 막히기 쉬운 항목
로그인이 카카오·네이버 OAuth뿐이라 심사자가 자력으로 로그인할 수 없다.
"앱 액세스 권한" 섹션에 **테스트용 카카오 계정의 ID/비밀번호를 반드시 기입**한다.
(전용 카카오 계정을 하나 만들어 방·식당·리뷰 샘플 데이터를 미리 채워둘 것)

### 스토어 등록정보
- [ ] 앱 이름 / 짧은 설명(80자) / 자세한 설명(4000자)
- [ ] 스크린샷 폰 최소 2장 (16:9 또는 9:16, 최소 320px)
- [ ] 512×512 앱 아이콘, 1024×500 그래픽 이미지

### 콘텐츠 설정
- [ ] 개인정보처리방침 URL: `https://musikga.kr/privacy`
- [ ] 데이터 안전: 이메일·닉네임·프로필 이미지(OAuth), 사용자 생성 콘텐츠(리뷰·사진), 기기 ID(FCM 토큰)
- [ ] 계정 삭제 URL: `https://musikga.kr/profile/account` (앱 내 탈퇴도 제공 중)
- [ ] 광고 포함 여부 (`PUBLIC_AD_CLIENT` 설정 시 "예")
- [ ] 콘텐츠 등급 설문 (IARC)
- [ ] 대상 연령층 / 뉴스 앱 아님 / 금융·정부 앱 아님
- [ ] 앱 서명: Play 앱 서명 사용(권장) → 이후 assetlinks.json 지문 등록

### 출시 순서
1. **내부 테스트** 트랙에 AAB 업로드 → 본인·지인 기기에서 설치 확인 (심사 거의 없음)
2. **클로즈드 테스트** 트랙으로 승격 → 테스터 12명 이상 옵트인 → 14일 연속 유지
3. **프로덕션 액세스 신청** (설문 작성) → 승인
4. 프로덕션 출시 → 심사 (첫 앱은 보통 며칠, 길면 1주 이상)

> 참고: 카카오 로그인을 **시스템 브라우저**로 처리하므로 카카오 개발자 콘솔에
> Android 플랫폼/키 해시를 등록할 필요가 없다 (네이티브 SDK 미사용).

## 8. 출시 전 확인 항목

"확인 환경" 기준으로 나눠 둔다. 에뮬로 되는 건 굳이 실기기를 기다리지 말 것.
**결과** 칸은 실제로 눌러 본 사람이 채운다 (`OK` / `NG + 증상` / `미확인`).

### 8.1 에뮬레이터로 확인 가능

| 항목 | 결과 (2026-09-21) |
| --- | --- |
| 앱 설치 → 기동 → 홈 렌더링 | OK |
| 하드웨어 뒤로가기: 화면 이동 후 뒤로 → 홈에서 뒤로 → 종료 | OK (루트에서 `canGoBack:false` → 종료) |
| OAuth 복귀 딥링크 (`kr.fearlesstasting.app://login?...`) → 토큰 저장 페이지 진입 | OK (adb 주입으로 확인) |
| 카카오 로그인 왕복 (브라우저 → 앱 복귀 → 방 목록) | 미확인 — §9 CORS로 블로킹 |
| 네이버 로그인 왕복 | 미확인 — §9 CORS로 블로킹 |
| 방 생성 → 식당 등록 → 리뷰 작성 | 미확인 — §9 CORS로 블로킹 |
| 푸시 권한 요청 팝업 + FCM 토큰 등록 | 미확인 (에뮬에 Play services 있음 → 확인 가능) |
| 공개 방/커뮤니티 링크 클릭 → 시스템 브라우저 오픈 | 미확인 |
| 오프라인(비행기 모드)에서 실행 → 껍데기 UI는 뜨고 데이터 영역만 에러 | 미확인 |

> 에뮬레이터에서 카카오·네이버 로그인을 끝까지 보려면 **실제 계정 로그인이 필요**하다.
> 심사용 테스트 계정(§7)을 만들어 두면 이 검증과 Play Console 제출에 같이 쓸 수 있다.

### 8.2 실기기가 필요한 항목

| 항목 | 이유 | 결과 |
| --- | --- | --- |
| 초대 링크(`musikga.kr/join?code=...`) 클릭 → 앱 자동 오픈 | App Links 검증에 `assetlinks.json` + **Play 앱 서명 지문**이 필요. 첫 AAB 업로드 전엔 불가 (§4) | 미확인 |
| FCM 푸시 **실수신** (백그라운드/종료 상태 포함) | 에뮬에서 토큰 등록까지는 되지만 도즈·백그라운드 제한 동작이 실기기와 다름 | 미확인 |
| 실제 네트워크 전환 (LTE ↔ WiFi ↔ 음영지역) | 에뮬 네트워크는 호스트 경유라 재현 안 됨 | 미확인 |
| 저사양 기기 체감 성능 · 스크롤 프레임 | arm64 에뮬은 호스트 성능을 따라감 | 미확인 |
| 카카오맵 SDK 실제 렌더링 · GPS 현재 위치 | 에뮬 GPS는 모킹 값 | 미확인 |

## 9. 알려진 블로킹 이슈

### API CORS가 앱 웹뷰 origin을 막는다 (2026-09-21 발견, 미해결)

앱은 로컬 번들이라 웹뷰 origin이 **`https://localhost`**인데, API는 `FRONTEND_URL`
하나만 허용한다 ([main.ts](../apps/api/src/main.ts) `enableCors`).

```
Access to fetch at 'https://api.musikga.kr/notices' from origin 'https://localhost'
has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value
'https://musikga.kr' that is not equal to the supplied origin.
```

앱에서 나가는 **모든 API 요청이 실패**한다 — 로그인·방 목록·리뷰 전부. 빌드는 통과하고
웹은 멀쩡하므로 실행 전에는 드러나지 않는다(`ca98b3c`와 같은 부류의 버그).

고치려면 `enableCors`의 `origin`을 배열/콜백으로 바꿔 Capacitor origin을 함께 허용해야 한다.
프론트는 `credentials: 'omit'`로 호출하므로 쿠키 의존은 없다.

```ts
// 허용 대상: 웹(FRONTEND_URL) + Capacitor 웹뷰
// Android: https://localhost, iOS: capacitor://localhost
origin: [process.env.FRONTEND_URL ?? 'http://localhost:4321', 'https://localhost'],
```

> ⚠️ 코드만 고쳐선 안 되고 **API 재배포까지 해야** 앱 검증을 이어갈 수 있다.
