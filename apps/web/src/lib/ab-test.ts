import { trackEvent } from './analytics';

/**
 * 간단한 클라이언트 A/B 테스트 할당.
 * localStorage로 유저당 1회 할당하여 실험 중 variant 변경 방지.
 * GA4로 실험 노출 이벤트 자동 전송.
 */
export function getVariant<T extends string>(experimentName: string, variants: readonly T[]): T {
  if (variants.length === 0) throw new Error('variants가 비어있습니다');
  const key = `ab_${experimentName}`;

  try {
    const cached = localStorage.getItem(key);
    if (cached && (variants as readonly string[]).includes(cached)) {
      return cached as T;
    }
    const chosen = variants[Math.floor(Math.random() * variants.length)];
    localStorage.setItem(key, chosen);

    trackEvent('ab_exposure', { experiment: experimentName, variant: chosen });

    // GA4 user property로도 전송해 세그먼트 분석에 활용
    const gtag = (window as unknown as { gtag?: (cmd: string, name: string, params?: Record<string, unknown>) => void }).gtag;
    if (typeof gtag === 'function') {
      gtag('set', 'user_properties', { [`ab_${experimentName}`]: chosen });
    }

    return chosen;
  } catch {
    return variants[0];
  }
}

/** 수동 재할당 (디버깅용) */
export function overrideVariant(experimentName: string, variant: string): void {
  try {
    localStorage.setItem(`ab_${experimentName}`, variant);
  } catch {
    /* ignore */
  }
}

/** 실험 참여자 제거 (디버깅용) */
export function clearVariant(experimentName: string): void {
  try {
    localStorage.removeItem(`ab_${experimentName}`);
  } catch {
    /* ignore */
  }
}
