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
        !page.includes('/join') &&
        !page.includes('/404') &&
        !page.includes('/map'),
      customPages: [
        'https://fearless-tasting.pages.dev/',
        'https://fearless-tasting.pages.dev/about',
        'https://fearless-tasting.pages.dev/discover',
        'https://fearless-tasting.pages.dev/rankings',
        'https://fearless-tasting.pages.dev/cs',
        'https://fearless-tasting.pages.dev/privacy',
      ],
    }),
  ],
});
