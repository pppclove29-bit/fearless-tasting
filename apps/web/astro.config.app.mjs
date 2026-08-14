import { defineConfig } from 'astro/config';

/**
 * Capacitor 앱 번들 전용 설정.
 * scripts/build-app.mjs 가 만든 .app-src(정적 페이지만) 를 dist-app 으로 빌드한다.
 * 웹용 astro.config.mjs 와 달리 어댑터·사이트맵이 없다 — 앱은 SSR도 색인도 필요 없음.
 */
export default defineConfig({
  site: process.env.SITE_URL || 'https://musikga.kr',
  srcDir: '.app-src',
  outDir: 'dist-app',
  trailingSlash: 'never',
  output: 'static',
  build: {
    // 웹뷰가 /room 같은 경로를 열 때 디렉터리 인덱스로 서빙되도록 유지
    format: 'directory',
  },
});
