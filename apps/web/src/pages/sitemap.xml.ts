export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ site, url }) => {
  // SSR 런타임엔 import.meta.env.SITE_URL 미노출 → site(빌드타임)/요청 origin 우선
  const SITE_URL = (site?.href ?? url.origin ?? import.meta.env.SITE_URL ?? 'https://musikga.kr').replace(/\/$/, '');
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
