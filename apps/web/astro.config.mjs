import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  adapter: cloudflare(),
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/login') &&
        !page.includes('/room') &&
        !page.includes('/rooms') &&
        !page.includes('/profile') &&
        !page.includes('/join'),
    }),
  ],
});
