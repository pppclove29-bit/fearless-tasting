import type { CapacitorConfig } from '@capacitor/cli';

/**
 * 앱은 dist-app(로컬 정적 번들)을 웹뷰에서 직접 연다.
 * CAP_SERVER_URL 을 주면 그 주소를 원격 로드 — 개발 중 라이브 리로드 용도로만 사용한다.
 * (원격 URL 을 프로덕션으로 쓰면 Play "minimum functionality" 정책에 걸릴 수 있음)
 */
const DEV_SERVER_URL = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'kr.fearlesstasting.app',
  appName: '무모한 시식가',
  webDir: 'dist-app',
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
    ...(DEV_SERVER_URL ? { url: DEV_SERVER_URL, cleartext: false } : {}),
    // OAuth·외부 결제 등으로 웹뷰가 이동할 수 있는 도메인 허용 목록
    allowNavigation: [
      'musikga.kr',
      '*.musikga.kr',
      'api.musikga.kr',
      'kauth.kakao.com',
      'kapi.kakao.com',
      'accounts.kakao.com',
      '*.kakao.com',
      'nid.naver.com',
      'openapi.naver.com',
      '*.naver.com',
      'accounts.google.com',
      '*.google.com',
    ],
  },
};

export default config;
