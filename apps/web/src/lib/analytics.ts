/**
 * Google Analytics 4 이벤트 헬퍼.
 * PUBLIC_GA_ID 미설정 또는 광고 차단 등으로 gtag가 없어도 조용히 무시.
 */

type GtagFn = (command: 'event' | 'config' | 'set', name: string, params?: Record<string, unknown>) => void;

/** 커스텀 이벤트 전송 */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  try {
    const gtag = (window as unknown as { gtag?: GtagFn }).gtag;
    if (typeof gtag === 'function') {
      gtag('event', name, params);
    }
  } catch {
    /* 조용히 실패 */
  }
}
