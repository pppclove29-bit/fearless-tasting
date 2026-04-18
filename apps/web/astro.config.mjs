import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  trailingSlash: 'never',
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
          !path.startsWith('/map')
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
