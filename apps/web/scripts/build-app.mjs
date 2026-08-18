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

/**
 * 앱 번들은 빌드 시점에 환경변수가 코드에 박힌다. 웹은 Cloudflare Pages가
 * 대시보드 값을 주입하지만 앱은 이 머신에서 빌드되므로, .env 가 없으면
 * PUBLIC_API_URL 이 localhost 로 굳은 앱이 그대로 스토어에 올라간다(실제로 발생).
 * 그래서 필수값은 빌드를 중단시키고, 권장값은 경고한다.
 */
const REQUIRED_ENV = ['PUBLIC_API_URL'];
const RECOMMENDED_ENV = [
  'PUBLIC_KAKAO_MAP_KEY',
  'PUBLIC_GA_ID',
  'PUBLIC_FIREBASE_API_KEY',
  'PUBLIC_FIREBASE_PROJECT_ID',
  'PUBLIC_FIREBASE_APP_ID',
  'PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'PUBLIC_FIREBASE_VAPID_KEY',
];

async function loadEnvFile() {
  const envPath = path.join(webRoot, '.env');
  if (!existsSync(envPath)) return {};
  const parsed = {};
  for (const line of (await readFile(envPath, 'utf8')).split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) parsed[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return parsed;
}

async function checkEnv() {
  const env = { ...(await loadEnvFile()), ...process.env };

  const missing = REQUIRED_ENV.filter((k) => !env[k]);
  const localhost = REQUIRED_ENV.filter((k) => env[k]?.includes('localhost'));
  if (missing.length || localhost.length) {
    console.error('\n[build-app] 앱 빌드 중단 — 환경변수가 비어 있거나 localhost 입니다.');
    if (missing.length) console.error(`  누락: ${missing.join(', ')}`);
    if (localhost.length) console.error(`  localhost: ${localhost.join(', ')}`);
    console.error('  apps/web/.env 를 만들어 운영 값을 넣으세요 (Cloudflare Pages 환경변수와 동일).');
    console.error('  예: PUBLIC_API_URL=https://api.musikga.kr\n');
    process.exit(1);
  }

  const weak = RECOMMENDED_ENV.filter((k) => !env[k]);
  if (weak.length) {
    console.warn(`[build-app] 경고 — 다음 값이 비어 앱에서 해당 기능이 동작하지 않습니다: ${weak.join(', ')}`);
  }
  return env;
}

async function main() {
  const env = await checkEnv();
  await rm(appSrc, { recursive: true, force: true });
  await rm(path.join(webRoot, 'dist-app'), { recursive: true, force: true });

  await cp(path.join(webRoot, 'src'), appSrc, { recursive: true });
  await pruneExcludedPages();
  await forcePrerender(path.join(appSrc, 'pages'));

  const result = spawnSync(
    'npx',
    ['astro', 'build', '--config', 'astro.config.app.mjs'],
    { cwd: webRoot, stdio: 'inherit', env: { ...env, APP_BUILD: '1' } },
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
