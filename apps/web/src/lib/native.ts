/**
 * Capacitor 네이티브 앱 전용 동작 모음.
 * 웹에서는 전부 no-op 이므로 BaseLayout 에서 조건 없이 호출해도 안전하다.
 *
 * - OAuth: 시스템 브라우저로 로그인 → 커스텀 스킴 딥링크로 토큰 복귀
 * - 딥링크: musikga.kr 초대/공유 링크를 앱 내부 경로로 변환
 * - 하드웨어 뒤로가기: 히스토리 있으면 뒤로, 없으면 종료 확인
 */

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';
const DEEP_LINK_SCHEME = 'kr.fearlesstasting.app';
const WEB_ORIGIN = 'https://musikga.kr';

/** 앱에 번들되지 않은(웹 전용) 경로 — 시스템 브라우저로 연다 */
const WEB_ONLY_PREFIXES = ['/rooms/public', '/community', '/guide', '/use', '/vote'];

export function isNativeApp(): boolean {
  const cap = (window as Record<string, unknown>).Capacitor as
    | { isNativePlatform?: () => boolean }
    | undefined;
  return cap?.isNativePlatform?.() ?? false;
}

/** 시스템 브라우저로 외부 URL 열기 (웹에서는 새 탭) */
export async function openExternal(url: string): Promise<void> {
  if (!isNativeApp()) {
    window.open(url, '_blank', 'noopener');
    return;
  }
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url });
}

/** OAuth 로그인 시작. 앱이면 시스템 브라우저에서 열고 딥링크로 복귀한다. */
export async function startLogin(provider: 'kakao' | 'naver'): Promise<void> {
  const url = `${API_BASE}/auth/${provider}${isNativeApp() ? '?client=app' : ''}`;
  if (!isNativeApp()) {
    window.location.href = url;
    return;
  }
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url, presentationStyle: 'popover' });
}

/**
 * 딥링크 URL을 앱 내부 경로로 변환.
 * - kr.fearlesstasting.app://login?access_token=... → /login?access_token=...
 * - https://musikga.kr/join?code=... → /join?code=...
 * 앱에 없는 웹 전용 경로면 null (호출부에서 외부 브라우저로 넘김)
 */
export function toInternalPath(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol === `${DEEP_LINK_SCHEME}:`) {
    // 커스텀 스킴은 host가 경로 첫 조각으로 들어온다 (scheme://login?x → host=login)
    const path = `/${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`;
    return `${path}${parsed.search}`;
  }

  if (parsed.origin === WEB_ORIGIN) {
    if (WEB_ONLY_PREFIXES.some((p) => parsed.pathname.startsWith(p))) return null;
    return `${parsed.pathname}${parsed.search}`;
  }

  return null;
}

let listenersBound = false;

/** 앱 전역 네이티브 리스너 등록 (딥링크 수신 + 하드웨어 뒤로가기) */
export async function initNativeApp(): Promise<void> {
  if (!isNativeApp() || listenersBound) return;
  listenersBound = true;

  const { App } = await import('@capacitor/app');
  const { Browser } = await import('@capacitor/browser');

  App.addListener('appUrlOpen', async ({ url }) => {
    const internal = toInternalPath(url);
    if (!internal) {
      if (url.startsWith('http')) await Browser.open({ url });
      return;
    }
    // OAuth 복귀면 브라우저 창을 닫고 앱 화면으로 이동
    await Browser.close().catch(() => {});
    window.location.href = internal;
  });

  // 앱 번들에 없는 웹 전용 경로(/rooms/public, /community, /guide, /use) 링크는
  // 로컬 404 대신 시스템 브라우저로 musikga.kr 을 연다.
  document.addEventListener('click', (e) => {
    const anchor = (e.target as HTMLElement | null)?.closest?.('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith('/')) return;
    if (!WEB_ONLY_PREFIXES.some((p) => href.startsWith(p))) return;
    e.preventDefault();
    Browser.open({ url: `${WEB_ORIGIN}${href}` });
  });

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && window.location.pathname !== '/') {
      window.history.back();
      return;
    }
    App.exitApp();
  });
}
