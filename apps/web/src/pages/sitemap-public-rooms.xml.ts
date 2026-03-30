export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';
  const SITE_URL = import.meta.env.SITE_URL || 'http://localhost:4321';

  let ids: string[] = [];
  try {
    const res = await fetch(`${API_BASE}/rooms/public/sitemap-ids`);
    if (res.ok) ids = await res.json();
  } catch {
    // API 실패 시 빈 사이트맵 반환
  }

  const today = new Date().toISOString().split('T')[0];
  const urls = ids.map(id => `
  <url>
    <loc>${SITE_URL}/rooms/public/${id}</loc>
    <lastmod>${today}</lastmod>
  </url>`).join('');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`,
    { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=86400' } },
  );
};
