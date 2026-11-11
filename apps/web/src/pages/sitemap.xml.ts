export const prerender = false;

import type { APIRoute } from 'astro';
import { SHOW_COMMUNITY } from '@/lib/features';

export const GET: APIRoute = async ({ site, url }) => {
  // SSR 런타임엔 import.meta.env.SITE_URL 미노출 → site(빌드타임)/요청 origin 우선
  const SITE_URL = (site?.href ?? url.origin ?? import.meta.env.SITE_URL ?? 'https://musikga.kr').replace(/\/$/, '');
  const today = new Date().toISOString().split('T')[0];

  // 진입점을 숨긴 기능(커뮤니티)은 페이지가 noindex 라 사이트맵에서도 뺀다 (lib/features.ts)
  const children = [
    'sitemap-0.xml',
    'sitemap-public-rooms.xml',
    ...(SHOW_COMMUNITY ? ['sitemap-community.xml'] : []),
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
