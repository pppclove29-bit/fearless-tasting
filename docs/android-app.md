# Android 앱 (Capacitor APK) 빌드 가이드

무모한 시식가 안드로이드 앱은 **Capacitor 기반 WebView 래퍼**입니다. 운영 사이트(`https://musikga.kr`)를 그대로 로드하고, FCM 푸시만 네이티브로 받는 구조입니다.

> 참고: `fearless-tasting.pages.dev`는 `musikga.kr`로 301 리다이렉트되므로 Capacitor `server.url`은 반드시 최종 도메인(`musikga.kr`)을 직접 가리켜야 합니다. 리다이렉트 도메인을 쓰면 WebView가 외부 브라우저로 빠집니다.

## 아키텍처

```
[ APK ] ── WebView ──▶ https://fearless-tasting.pages.dev (Astro/Cloudflare Pages)
   │                          │
   ├─ @capacitor-firebase/messaging  (네이티브 FCM 토큰)
   │   → POST /users/me/fcm-token  (백엔드 등록)
   └─ FCM 푸시 수신 → 알림 클릭 시 data.link로 웹뷰 내비게이션
```

웹과 앱은 **같은 JS 번들을 공유**합니다. `Capacitor.isNativePlatform()` 검사로 네이티브 분기:
- 네이티브: `@capacitor-firebase/messaging` 플러그인 (시스템 알림)
- 웹: 기존 `firebase/messaging` Web SDK (Service Worker)

## 사전 준비물

| 항목 | 버전/메모 |
|------|-----------|
| Node.js | **22 이상** (Capacitor CLI 8 요구) |
| Android Studio | Hedgehog 이상 권장 (SDK + AVD 포함) |
| JDK | 17 이상 (Android Studio 내장 JBR 사용 권장) |
| Firebase 프로젝트 | Android 앱 등록 → `google-services.json` 발급 |
| Firebase 서비스 계정 키 | 백엔드 `FIREBASE_SERVICE_ACCOUNT` 환경변수용 (이미 구성됨) |

## Firebase 콘솔 작업

1. https://console.firebase.google.com 에서 프로젝트 선택 (없으면 생성)
2. **프로젝트 설정 → 일반 탭**에서 "앱 추가" → Android
   - **패키지 이름**: `kr.fearlesstasting.app` (capacitor.config.ts와 일치)
   - SHA-1 키는 선택 (필요 시 keystore에서 추출)
3. `google-services.json` 다운로드 → **`apps/web/android/app/google-services.json`** 위치에 둠
4. **Cloud Messaging 탭**에서 푸시 활성화 확인
5. 백엔드 `FIREBASE_SERVICE_ACCOUNT` 환경변수에 서비스 계정 JSON 전체를 문자열로 설정 (이미 사용 중)

> ⚠️ `google-services.json`은 **`.gitignore`에 등록**되어 있습니다. 안전 보관소(1Password 등)에 별도 백업하세요.

## 첫 빌드 (개발자 머신 1회 셋업)

```bash
# Node 22로 전환
nvm use 22

# 1. 의존성 설치 (이미 했다면 생략)
pnpm install

# 2. 운영 사이트가 다음 헤더를 응답하는지 확인 (Capacitor WebView 호환):
#    Content-Security-Policy: frame-ancestors 'self' https://*.pages.dev
#    (Cloudflare Pages 기본값으로 OK — 별도 CSP 미설정이면 그대로)

# 3. (선택) 빌드 결과 동기화 — server.url을 사용하므로 필수는 아니지만 fallback 용도
pnpm --filter @repo/web build
pnpm --filter @repo/web cap:sync

# 4. Android Studio로 열기
pnpm --filter @repo/web cap:open:android
```

## APK 빌드 (디버그)

Android Studio에서:

1. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. 완료되면 `apps/web/android/app/build/outputs/apk/debug/app-debug.apk` 경로에 산출

CLI:

```bash
cd apps/web/android
./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

## APK 빌드 (릴리즈 / Play Store 업로드)

### 1. 키스토어 생성 (최초 1회)

```bash
keytool -genkey -v \
  -keystore ~/keys/fearless-tasting-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias fearless-tasting
```

비밀번호와 키스토어 파일은 **절대 분실하면 안 됩니다** (재서명 불가 → 앱 업데이트 영구 차단).

### 2. 서명 설정

`apps/web/android/key.properties` 생성 (gitignore됨):

```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=fearless-tasting
storeFile=/Users/you/keys/fearless-tasting-release.jks
```

`apps/web/android/app/build.gradle`에 signingConfigs 추가 — 표준 안드로이드 가이드 참조.

### 3. 릴리즈 빌드

```bash
cd apps/web/android
./gradlew assembleRelease       # APK
./gradlew bundleRelease         # AAB (Play Store 업로드용)
```

산출:
- `app/build/outputs/apk/release/app-release.apk`
- `app/build/outputs/bundle/release/app-release.aab` (Play Store는 AAB 권장)

## 설정 변경 시 동기화

| 변경 사항 | 명령 |
|-----------|------|
| `capacitor.config.ts` 변경 | `pnpm --filter @repo/web cap:sync` |
| 플러그인 추가 | `pnpm install` 후 `cap:sync` |
| 웹 코드 변경 (server.url 모드) | **재빌드 불필요** — 사용자가 앱 재실행하면 최신 사이트 자동 반영 |
| 앱 아이콘/스플래시 | `apps/web/android/app/src/main/res/` 직접 수정 |

## 운영 도메인 변경

`capacitor.config.ts`의 `SERVER_URL`은 환경변수 `CAP_SERVER_URL`로 오버라이드 가능:

```bash
CAP_SERVER_URL=https://staging.fearless-tasting.com pnpm --filter @repo/web cap:sync
```

## 트러블슈팅

| 증상 | 원인/해결 |
|------|-----------|
| `Capacitor CLI requires NodeJS >=22` | `nvm use 22` |
| 빌드 시 `google-services.json missing` | Firebase 콘솔에서 받아 `apps/web/android/app/`에 배치 |
| 푸시가 안 옴 | (1) Firebase 콘솔에서 테스트 메시지 발송 확인 (2) 백엔드 `FIREBASE_SERVICE_ACCOUNT` 설정 (3) 앱에서 알림 권한 허용 |
| 알림 클릭 시 딥링크 안 됨 | 백엔드 푸시 페이로드 `data.link`에 절대 경로 넣기 (예: `/room?id=xxx`) |
| 앱 실행 시 흰 화면 | 운영 도메인 인증서/CORS 확인. `cleartext: false`라 https 필수 |

## Play Store 등록

1. Google Play Console (https://play.google.com/console) 개발자 계정 (US$25 1회)
2. 앱 만들기 → 패키지명 `kr.fearlesstasting.app`
3. **내부 테스트 트랙**부터 시작 (테스터 이메일 등록 → 클로즈드 베타)
4. AAB 업로드, 스크린샷·설명 입력
5. 콘텐츠 등급, 개인정보 처리방침 URL(`https://fearless-tasting.pages.dev/privacy`) 입력
6. 검토 후 출시

## 참고 링크

- Capacitor 공식: https://capacitorjs.com/docs
- Capacitor Firebase Messaging: https://github.com/capawesome-team/capacitor-firebase
- Play Console: https://play.google.com/console
