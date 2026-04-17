export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';
  const SITE_URL = import.meta.env.SITE_URL || 'https://musikga.kr';

  let boards: string[] = [];
  let posts: { id: string; slug: string; updatedAt: string }[] = [];

  try {
    const res = await fetch(`${API_BASE}/boards/sitemap-data`);
    if (res.ok) {
      const data = await res.json();
      boards = data.boards ?? [];
      posts = data.posts ?? [];
    }
  } catch {
    // API 실패 시 빈 사이트맵
  }

  const urls: string[] = [];

  // 커뮤니티 메인
  urls.push(`
  <url>
    <loc>${SITE_URL}/community</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`);

  // 게시판 페이지
  for (const slug of boards) {
    urls.push(`
  <url>
    <loc>${SITE_URL}/community/${slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>`);
  }

  // 게시글 페이지
  for (const post of posts) {
    const lastmod = new Date(post.updatedAt).toISOString().split('T')[0];
    urls.push(`
  <url>
    <loc>${SITE_URL}/community/${post.slug}/${post.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`);
  }

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}
</urlset>`,
    { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' } },
  );
};
