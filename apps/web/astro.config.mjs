import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  trailingSlash: 'never',
  // 디렉터리 형식(about/index.html)으로 내보내면 Cloudflare Pages가 /about → /about/ 로
  // 308 리다이렉트한다. sitemap·canonical은 슬래시 없는 URL을 쓰므로 신호가 어긋나고,
  // Search Console에 "리디렉션이 포함된 페이지"로 잡힌다. 파일 형식(about.html)이면
  // /about 이 그대로 200 이다.
  build: { format: 'file' },
  adapter: cloudflare(),
  integrations: [
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname;
        if (path === '/rooms/public') return true;
        return (
          !path.startsWith('/admin') &&
          !path.startsWith('/login') &&
          !path.startsWith('/room') &&
          !path.startsWith('/rooms') &&
          !path.startsWith('/profile') &&
          !path.startsWith('/join') &&
          !path.startsWith('/404') &&
          !path.startsWith('/map') &&
          !path.startsWith('/privacy') &&
          !path.startsWith('/cs')
        );
      },
      serialize: (item) => {
        const url = item.url;
        if (url.endsWith('/') || url.endsWith('/about')) {
          item.priority = 1.0;
          item.changefreq = 'weekly';
        } else if (url.includes('/use/')) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
        } else if (url.includes('/discover') || url.includes('/rankings')) {
          item.priority = 0.8;
          item.changefreq = 'daily';
        } else {
          item.priority = 0.5;
          item.changefreq = 'monthly';
        }
        return item;
      },
    }),
  ],
});
