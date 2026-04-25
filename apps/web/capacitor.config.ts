import type { CapacitorConfig } from '@capacitor/cli';

const SERVER_URL = process.env.CAP_SERVER_URL || 'https://musikga.kr';

const config: CapacitorConfig = {
  appId: 'kr.fearlesstasting.app',
  appName: '무모한 시식가',
  webDir: 'dist',
  server: {
    url: SERVER_URL,
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: [
      'musikga.kr',
      '*.musikga.kr',
      'api.musikga.kr',
      'fearless-tasting.pages.dev',
      '*.pages.dev',
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
  android: {
    allowMixedContent: false,
  },
};

export default config;
