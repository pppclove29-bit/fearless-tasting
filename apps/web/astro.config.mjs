import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  trailingSlash: 'never',
  adapter: cloudflare(),
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/login') &&
        !page.includes('/room') &&
        !page.includes('/rooms') &&
        !page.includes('/profile') &&
        !page.includes('/join') &&
        !page.includes('/404') &&
        !page.includes('/map') &&
        !page.includes('/share'),
      serialize: (item) => {
        const path = new URL(item.url).pathname;
        // 홈 페이지: 최우선, 자주 변경
        if (path === '/' || path === '') {
          return { ...item, changefreq: 'daily', priority: 1.0 };
        }
        // 맛집 추천/랭킹: 동적 데이터, 자주 변경
        if (item.url.includes('/discover') || item.url.includes('/rankings')) {
          return { ...item, changefreq: 'daily', priority: 0.9 };
        }
        // 소개 페이지: 주요 랜딩
        if (item.url.includes('/about')) {
          return { ...item, changefreq: 'weekly', priority: 0.8 };
        }
        // 문의/개인정보: 낮은 우선순위
        if (item.url.includes('/cs') || item.url.includes('/privacy')) {
          return { ...item, changefreq: 'monthly', priority: 0.3 };
        }
        return { ...item, changefreq: 'weekly', priority: 0.5 };
      },
    }),
  ],
});
