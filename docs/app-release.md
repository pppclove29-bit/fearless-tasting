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

**🔴 내부 테스트 업로드 전에 반드시 끝내야 할 것**

클로즈드 테스트는 테스터 12명이 **14일 연속** 참여해야 하고 중간에 끊기면
처음부터 다시 센다. 깨진 빌드로 시작하면 2주가 날아가므로 아래는 타협하지 않는다.

- [x] 릴리스 keystore 생성 + `keystore.properties` (§5) — 2026-08-18
- [ ] ⚠️ **keystore 백업 확인** — `apps/web/android/app/fearless-release.jks` 와 비밀번호.
      분실하면 같은 앱으로 **영구히 업데이트 불가**. 다른 무엇보다 먼저.
- [x] 서명된 릴리스 AAB 빌드 검증 (versionCode 1 / 1.0.0, 5.0MB)
- [x] Play Console 개발자 계정 등록 ($25) — 2026-09-21, **계정 유형 개인**
- [x] API CORS 허용 목록 수정 (§9) — 2026-09-21 커밋 완료
- [x] **API 재배포** — 2026-09-21 배포·검증 완료. 기존 웹 무영향 확인 (§9)
- [ ] 배포 후 앱 실검증: 카카오 로그인 왕복 + 방 생성 (§8.1) — **다음 차례**
- [ ] 심사용 테스트 카카오 계정 + 샘플 데이터 (§10) — 심사자가 로그인 못 하면 거부된다
- [ ] 스토어 등록정보 (스크린샷·아이콘·설명) — 업로드 폼의 필수 입력

**🟡 클로즈드 테스트 도중에 해도 되는 것**

테스터가 14일을 채우는 동안 병렬로 진행하면 된다.

- [ ] `assetlinks.json` 지문 등록 (§4) — 첫 업로드 후에야 지문을 받을 수 있다.
      없어도 앱은 정상 동작하고 초대 링크만 브라우저로 열린다
- [ ] 데이터 안전 양식 · 콘텐츠 등급 설문(IARC) 등 콘텐츠 설정 (§7)
- [ ] 네이버 로그인 왕복 검증 — **심사 범위 아님**. 기능은 살아 있으니 여유 있을 때만
- [ ] 푸시 실수신 검증 (실기기 필요, §8.2)
- [ ] 스토어 설명 문구 다듬기 · 스크린샷 교체

**최종 단계**

- [ ] 내부 테스트 트랙 업로드
- [ ] 클로즈드 테스트 (테스터 12명 · 14일 연속)
- [ ] 프로덕션 액세스 신청 → 심사

> 제품 방향과 우선순위는 [product-direction.md](product-direction.md) 참고.
> Play 계정은 세 앱 공용이라 테스터 12명도 세 앱에 함께 쓴다.
> 세 앱을 비슷한 시점에 내부 테스트까지 올려 클로즈드 테스트를 **동시에** 시작한다
> (순차 6주 → 동시 2주).

### 검증 회차 기록

| 회차 | 환경 | 결과 |
| --- | --- | --- |
| 2026-08-18 | 에뮬레이터 | 로그인 차단 버그 3종 발견·수정 (`ca98b3c`) |
| 2026-09-21 | 에뮬레이터 `fearless_test` (Pixel 6 · Android 15 · arm64) | 빌드·설치·기동 OK. **API CORS 차단으로 전 기능 블로킹** 발견 (§9) |
| 2026-09-21 | 운영 API (배포 후) | CORS 수정 배포·검증 통과. 기존 웹 무영향. **앱 실검증은 다음 차례** (§9) |

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

### 이 앱의 키스토어 (2026-09-21 확인)

| 항목 | 값 |
| --- | --- |
| 경로 | `apps/web/android/app/fearless-release.jks` |
| 생성일 | 2026-08-18 |
| 크기 | 2764 bytes |
| 설정 파일 | `apps/web/android/keystore.properties` |
| git 추적 | **안 됨** — `.gitignore` 56행(`*.jks`) · 58행(`keystore.properties`)에서 제외 확인 |
| 업로드 키 SHA-256 | **미확인** (아래 참고) |
| 백업 여부 | **미확인 — 사람 확인 필요** |

지문은 스토어 비밀번호가 있어야 읽을 수 있어 확인하지 않았다. 필요하면 직접:

```bash
cd apps/web/android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  "$JAVA_HOME/bin/keytool" -list -v -keystore app/fearless-release.jks | grep -A1 SHA256
```

> ⚠️ **`assetlinks.json`에 넣을 지문은 이 업로드 키가 아니다.**
> Play 앱 서명을 쓰면 Google이 별도의 앱 서명 키로 재서명하므로,
> App Links 검증에 필요한 건 **Play Console → 설정 → 앱 서명**에 표시되는
> 앱 서명 키 SHA-256이다 (§4). 업로드 키 지문을 넣으면 링크가 열리지 않는다.

## 6. 릴리스 빌드

```bash
cd apps/web
APP_VERSION_CODE=2 APP_VERSION_NAME=1.0.1 pnpm android:release
# → android/app/build/outputs/bundle/release/app-release.aab
```

`versionCode`는 업로드마다 **증가 필수** (gradle 프로퍼티 `-PappVersionCode=` 또는 환경변수).

## 7. Play Console 체크리스트

### 계정
- [x] 개발자 계정 등록 ($25, 1회) — 2026-09-21
- [x] 계정 유형: **개인**으로 확정 (2026-09-21)
  - 프로덕션 출시 전 **클로즈드 테스트 12명 이상이 14일 연속 참여** 필요.
    중간에 끊기면 처음부터 다시 센다
  - 요구 인원은 정책이 바뀌어 왔으니 콘솔의 "프로덕션 액세스 신청" 화면에
    표시되는 현재 숫자를 기준으로 볼 것
  - 세 앱(무모한 시식가 · TypeRight · 운전 노동 정산기)이 같은 계정을 쓰므로
    **테스터 12명도 세 앱에 함께 쓴다**

### 앱 액세스 권한 ⚠️ 이 앱에서 가장 막히기 쉬운 항목
로그인이 카카오·네이버 OAuth뿐이라 심사자가 자력으로 로그인할 수 없다.
계정 조건·샘플 데이터·기입 문구는 **[§10](#10-심사용-테스트-계정-준비-사람-작업)** 참고.

### 스토어 등록정보
- [ ] 앱 이름 / 짧은 설명(80자) / 자세한 설명(4000자)
- [ ] 스크린샷 폰 최소 2장 (16:9 또는 9:16, 최소 320px)
- [ ] 512×512 앱 아이콘, 1024×500 그래픽 이미지

### 콘텐츠 설정
- [ ] 개인정보처리방침 URL: `https://musikga.kr/privacy` — 운영 중, 별도 수정 불필요
- [x] 연락처 이메일을 세 앱 공용 `musikga1116@gmail.com`으로 통일 — 2026-09-21
      웹 푸터(`BaseLayout.astro`)와 고객센터 JSON-LD(`cs.astro`) 두 곳 교체 완료
- [ ] ⚠️ **사람 작업: Render 환경변수 `ADMIN_EMAIL`을 `musikga1116@gmail.com`으로 변경**
      문의 알림 **수신자는 코드가 아니라 이 환경변수**다 (`inquiries.service.ts`).
      여기를 안 바꾸면 화면에는 새 주소가 보이는데 알림은 계속 옛 주소로 간다.
      Render 대시보드 → 서비스 → Environment 에서 변경.
- [ ] gmail 수신함을 실제로 보는지 확인 — 안 보면 문의가 그냥 사라진다
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
| 네이버 로그인 왕복 | 미확인 — 심사 범위 아님 (§10) |
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

## 9. API CORS — 앱의 임계 경로

### 증상 (2026-09-21 에뮬 검증에서 발견)

앱은 로컬 번들이라 웹뷰 origin이 **`https://localhost`**인데, API 허용 출처가
`FRONTEND_URL` 하나뿐이었다. 앱에서 나가는 **모든 API 요청이 실패**한다 —
로그인·방 목록·리뷰 전부.

```
Access to fetch at 'https://api.musikga.kr/notices' from origin 'https://localhost'
has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value
'https://musikga.kr' that is not equal to the supplied origin.
```

빌드는 통과하고 웹은 멀쩡하므로 **실행 전에는 드러나지 않는다** (`ca98b3c`와 같은 부류).

### 수정 (코드 완료, 배포 대기)

허용 목록 계산을 [cors-origins.ts](../apps/api/src/common/cors-origins.ts)
`buildAllowedOrigins` 순수 함수로 분리하고 테스트로 덮었다.

- 와일드카드·부분 일치를 쓰지 않는다. `cors`가 배열과 정확 일치로 비교하므로
  서브도메인(`https://evil.musikga.kr`)·접미 공격(`https://musikga.kr.evil.com`)·
  스킴 불일치(`http://musikga.kr`)가 자동으로 걸러진다
- 임의 출처 반사(`origin: true`)는 `credentials: true`와 조합되면 위험하므로 **금지**
- `FRONTEND_URL` 끝 슬래시를 정규화한다. `Origin` 헤더에는 끝 슬래시가 붙지 않아
  그대로 두면 **운영 웹이 통째로 막힌다**
- 추가 출처가 필요하면 `CORS_EXTRA_ORIGINS`에 쉼표로 나열한다 (코드 수정 불필요)

**`credentials: true`는 유지한다.** `POST /auth/logout`이 `credentials: 'include'`로
호출하고 있어(`apps/web/src/lib/api.ts`) 끄면 로그아웃이 CORS로 막히는데,
fire-and-forget이라 **조용히 실패**한다.

### 배포 — main push = 운영 배포

⚠️ 이 레포는 **`main`에 머지되면 Render가 자동 배포**한다. `main` push가 곧 운영 반영이다.
운영 중인 서비스이므로 **사용자가 화면을 보고 있을 때** push한다.

**2026-09-21 실측: push부터 새 응답이 나올 때까지 약 2분 30초.**
(15초 간격으로 확인해 11번째에 바뀜.) 롤백을 판단할 때 이 값을 기준으로 삼는다 —
3분이 지나도 안 바뀌면 배포가 실패한 것으로 보고 Render 로그를 본다.

### 배포 후 검증 (이 순서대로, 1분 안에 판정된다)

1. **기존 웹 먼저** — `https://musikga.kr` 로그인 상태에서 방 목록이 뜨는지.
   깨지면 즉시 롤백하고 앱 검증은 중단한다 (영향받는 사람이 제일 많다)
2. 출처별 `Access-Control-Allow-Origin` 확인

```bash
for o in "https://musikga.kr" "https://localhost" "https://evil.example"; do
  printf "%-24s " "$o"
  curl -si -X OPTIONS https://api.musikga.kr/notices \
    -H "Origin: $o" -H "Access-Control-Request-Method: GET" \
    | grep -i "^access-control-allow-origin" || echo "(헤더 없음)"
done
```

3. 앱에서 실확인 — 홈에서 CORS 에러 없이 데이터 렌더링 → 카카오 로그인 왕복

#### 2026-09-21 배포 검증 결과 — 전부 통과

| Origin | 결과 | 기대 |
| --- | --- | --- |
| `https://musikga.kr` | `access-control-allow-origin: https://musikga.kr` | ✅ 기존 웹 생존 |
| `https://localhost` | `access-control-allow-origin: https://localhost` | ✅ 앱 출처 허용 |
| `capacitor://localhost` | `access-control-allow-origin: capacitor://localhost` | ✅ iOS 대비 |
| `https://evil.example` | 헤더 없음 | ✅ 차단 |
| `https://evil.musikga.kr` | 헤더 없음 | ✅ 서브도메인 차단 |
| `http://musikga.kr` | 헤더 없음 | ✅ 스킴 불일치 차단 |

`access-control-allow-credentials: true`, `max-age: 86400`, `expose-headers` 모두 유지됨을 확인.
`https://musikga.kr` 200, `api.musikga.kr/notices` 200. **기존 웹 무영향.**

단위 테스트가 예측한 차단 3종(서브도메인·접미·스킴)이 운영에서도 그대로 동작했다.

### 되돌리기

| 경로 | 소요 | 비고 |
| --- | --- | --- |
| **A. Render 대시보드에서 이전 배포로 롤백** | 재빌드 없음 | 1순위. 단 `main`에는 수정 커밋이 남아 Git과 배포 상태가 어긋난다 |
| **B. revert 커밋을 `main`에 push** | **약 2분 30초** (실측) | 정석. A로 급한 불을 끈 뒤 반드시 B로 정리한다 |

이번 변경은 CORS 설정 범위이고 **DB 스키마·데이터 변경이 없어** 롤백에 정합성 위험이 없다.

> 미확인: 이 요금제에서 Render 대시보드 롤백(A)을 쓸 수 있는지.
> A를 쓸 수 없어도 B가 2분 30초라 복구 자체는 빠르다.

## 10. 심사용 테스트 계정 준비 (사람 작업)

**이 앱에서 가장 막히기 쉬운 항목.** 로그인이 카카오·네이버 OAuth뿐이라 심사자가
자력으로 계정을 만들 수 없다. 계정을 안 적거나 로그인이 막히면 그대로 거부된다.

### 계정 조건

- [ ] **신규 전용 카카오 계정** — 개인 계정 금지 (ID/비밀번호를 콘솔에 평문으로 적는다)
- [ ] **2단계 인증·기기 인증 해제** — 해외 IP의 심사자가 본인 인증에 막히면 그대로 거부된다.
      이 앱 심사에서 가장 흔한 탈락 지점
- [x] ~~네이버 계정~~ — **이번 심사 범위 아님** (2026-09-21 결정).
      카카오 하나만 제공해도 심사는 통과한다. 네이버 계정은 만들지 않는다

### 채울 샘플 데이터

심사자가 빈 화면을 보면 minimum functionality 정책에 걸린다.
**웹(`musikga.kr`)에서 미리 채울 수 있다** — 같은 DB라 앱에 그대로 보인다.

| 항목 | 최소 | 비고 |
| --- | --- | --- |
| 방 | 2개 | 최소 1개는 해당 계정이 **방장** — 방 설정·초대 코드까지 눌러볼 수 있어야 함 |
| 식당 | 방당 5개+ | 카테고리·지역을 서로 다르게 (지역 탭·통계가 의미 있게 보인다) |
| 방문 기록 | 식당당 1개+ | |
| 리뷰 | 5개+ | 2~3개는 세부 평점 5항목·메뉴까지 채울 것 (통계 레이더 차트가 빈다) |
| 투표 | 1개 | **진행 중** 상태로. 회식 훅이 이 앱의 차별점이라 보이는 게 유리 |

- [ ] 방장인 방의 **통계 탭·투표 탭을 켤 것** — 기본값이 둘 다 off라 안 켜면 심사자에게 안 보인다

### Play Console '앱 액세스 권한' 기입 문구

계정 ID/비밀번호와 함께 아래를 안내사항에 넣는다. 시스템 브라우저로 나갔다가
딥링크로 돌아오는 구조라, 설명이 없으면 심사자가 브라우저에서 이탈해
"로그인 불가"로 판정할 수 있다.

```
이 앱은 카카오/네이버 소셜 로그인만 지원하며 자체 회원가입이 없습니다.

1. 앱 실행 후 '로그인' 버튼을 누릅니다.
2. '카카오로 시작하기'를 누르면 기기의 기본 브라우저가 열립니다.
   (앱 내 웹뷰가 아니라 시스템 브라우저가 열리는 것이 정상 동작입니다.)
3. 아래 계정으로 카카오 로그인을 완료합니다.
4. 로그인이 완료되면 브라우저가 닫히며 앱으로 자동 복귀합니다.
   자동 복귀가 되지 않을 경우 앱을 다시 실행해 주십시오. 로그인 상태는 유지됩니다.
5. 복귀 후 '내 방' 목록에 샘플 방이 표시됩니다. 방을 선택하면
   식당 목록, 방문 기록, 리뷰, 통계, 투표 기능을 모두 확인할 수 있습니다.

본 계정은 심사 전용 계정으로 2단계 인증이 해제되어 있습니다.
```

4번 문장이 핵심이다. 딥링크 복귀가 실패해도 재실행하면 된다는 안내가 있어야
심사자가 거기서 포기하지 않는다.
