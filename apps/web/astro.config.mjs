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
        !page.includes('/map'),
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
