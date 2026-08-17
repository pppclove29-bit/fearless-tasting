/**
 * Capacitor 앱용 정적 번들 빌드.
 *
 * 웹(Cloudflare)은 SSR 빌드를 쓰지만, 앱은 웹뷰가 로컬 파일을 직접 여는 구조라
 * 서버 렌더링 페이지를 담을 수 없다. 그래서:
 *   1. src/ 를 .app-src/ 로 복사
 *   2. 앱에 필요 없는 SEO 전용 라우트(공개 방·커뮤니티·가이드·사이트맵)를 제거
 *   3. 남은 페이지의 `export const prerender = false` 를 정적으로 뒤집음
 *   4. astro.config.app.mjs (output: static, srcDir: .app-src) 로 빌드 → dist-app/
 *
 * 제거된 SEO 페이지는 앱에서 외부 브라우저로 musikga.kr 을 열어 처리한다.
 */
import { cp, rm, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSrc = path.join(webRoot, '.app-src');

/** 앱 번들에서 제외할 경로 (src/pages 기준 상대 경로) */
const EXCLUDED_PAGES = [
  'rooms/public.astro',
  'rooms/public',
  'community.astro',
  'community',
  'guide',
  'use',
  // 공유 투표는 링크를 받은 비회원이 브라우저에서 여는 페이지 → 앱 번들에 넣지 않는다
  'vote',
  'sitemap.xml.ts',
  'sitemap-public-rooms.xml.ts',
  'sitemap-community.xml.ts',
];

async function pruneExcludedPages() {
  const pagesDir = path.join(appSrc, 'pages');
  for (const rel of EXCLUDED_PAGES) {
    const target = path.join(pagesDir, rel);
    if (existsSync(target)) {
      await rm(target, { recursive: true, force: true });
    }
  }
}

/** 남은 페이지의 SSR 지시자를 정적으로 전환 */
async function forcePrerender(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await forcePrerender(full);
      continue;
    }
    if (!/\.(astro|ts)$/.test(entry.name)) continue;
    const source = await readFile(full, 'utf8');
    if (!source.includes('prerender = false')) continue;
    await writeFile(
      full,
      source.replace(/export const prerender = false;?/g, 'export const prerender = true;'),
    );
  }
}

async function main() {
  await rm(appSrc, { recursive: true, force: true });
  await rm(path.join(webRoot, 'dist-app'), { recursive: true, force: true });

  await cp(path.join(webRoot, 'src'), appSrc, { recursive: true });
  await pruneExcludedPages();
  await forcePrerender(path.join(appSrc, 'pages'));

  const result = spawnSync(
    'npx',
    ['astro', 'build', '--config', 'astro.config.app.mjs'],
    { cwd: webRoot, stdio: 'inherit', env: { ...process.env, APP_BUILD: '1' } },
  );

  await rm(appSrc, { recursive: true, force: true });

  if (result.status !== 0) process.exit(result.status ?? 1);

  const dist = path.join(webRoot, 'dist-app');
  const info = existsSync(dist) ? await stat(dist) : null;
  if (!info) {
    console.error('[build-app] dist-app 이 생성되지 않았습니다.');
    process.exit(1);
  }
  console.log('[build-app] 앱 번들 생성 완료 → apps/web/dist-app');
}

main();
