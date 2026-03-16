/**
 * 광고 스크립트 로더 및 초기화 유틸리티.
 *
 * - AdSense 스크립트를 지연 로딩 (IntersectionObserver 기반)
 * - 페이지 내 모든 AdSlot을 자동 감지 후 뷰포트 진입 시 push
 * - PUBLIC_AD_CLIENT 미설정 시 아무 동작 안 함
 */

declare global {
  interface Window {
    adsbygoogle: Record<string, unknown>[];
  }
}

let scriptLoaded = false;
let scriptLoading = false;

/** AdSense 스크립트 한 번만 로드 */
function loadAdScript(adClient: string): Promise<void> {
  if (scriptLoaded || scriptLoading) return Promise.resolve();
  scriptLoading = true;

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      resolve();
    };
    script.onerror = () => {
      scriptLoading = false;
      resolve(); // 광고 차단 등으로 실패해도 앱 동작에 영향 없음
    };
    document.head.appendChild(script);
  });
}

/** 개별 광고 슬롯 활성화 */
function activateSlot(container: Element): void {
  if (container.getAttribute('data-ad-activated') === 'true') return;
  container.setAttribute('data-ad-activated', 'true');

  const ins = container.querySelector('ins.adsbygoogle');
  if (!ins) return;

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    // 광고 로드 실패 시 조용히 무시
  }
}

/**
 * 광고 시스템 초기화.
 * BaseLayout에서 한 번 호출. IntersectionObserver로 뷰포트 진입 시 광고 로드.
 */
export function initAds(adClient: string): void {
  if (!adClient) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          loadAdScript(adClient).then(() => activateSlot(entry.target));
        }
      }
    },
    { rootMargin: '200px' }, // 뷰포트 200px 전에 미리 로드
  );

  // 현재 페이지의 모든 광고 컨테이너 감지
  document.querySelectorAll('.ad-container[data-ad-slot]').forEach((el) => {
    observer.observe(el);
  });
}
