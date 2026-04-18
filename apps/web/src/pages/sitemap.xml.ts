export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const SITE_URL = import.meta.env.SITE_URL || 'https://musikga.kr';
  const today = new Date().toISOString().split('T')[0];

  const children = [
    'sitemap-0.xml',
    'sitemap-public-rooms.xml',
    'sitemap-community.xml',
  ];

  const entries = children
    .map((name) => `
  <sitemap>
    <loc>${SITE_URL}/${name}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`)
    .join('');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}
</sitemapindex>`,
    { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' } },
  );
};
