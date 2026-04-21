import { trackEvent } from './analytics';

const VISIT_COUNT_KEY = 'pwa_visit_count';
const LAST_VISIT_KEY = 'pwa_last_visit';
const DISMISS_UNTIL_KEY = 'pwa_dismiss_until';
const MIN_VISITS = 2;
const MIN_DAYS_BETWEEN = 1;
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

function bumpVisitCount(): number {
  const now = Date.now();
  const lastVisit = Number(localStorage.getItem(LAST_VISIT_KEY) || '0');
  const count = Number(localStorage.getItem(VISIT_COUNT_KEY) || '0');
  if (now - lastVisit > MIN_DAYS_BETWEEN * 24 * 60 * 60 * 1000) {
    const next = count + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(next));
    localStorage.setItem(LAST_VISIT_KEY, String(now));
    return next;
  }
  return count;
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function isDismissed(): boolean {
  const until = Number(localStorage.getItem(DISMISS_UNTIL_KEY) || '0');
  return until > Date.now();
}

function dismissForDays(days: number): void {
  localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
}

function detectOS(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export function initPwaInstall(): void {
  if (isStandalone()) return;

  const visitCount = bumpVisitCount();
  const os = detectOS();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    trackEvent('pwa_installed', { os });
    const banner = document.getElementById('pwa-banner');
    if (banner) banner.hidden = true;
  });

  if (visitCount < MIN_VISITS) return;
  if (isDismissed()) return;

  const banner = document.getElementById('pwa-banner');
  const desc = document.getElementById('pwa-desc');
  const closeBtn = document.getElementById('pwa-close');
  const installBtn = document.getElementById('pwa-install') as HTMLButtonElement | null;
  if (!banner || !desc || !closeBtn) return;

  if (os === 'ios') {
    desc.innerHTML = '하단 <strong>공유 버튼(□↑)</strong>을 누른 뒤 <strong>"홈 화면에 추가"</strong>를 선택하세요.';
    if (installBtn) installBtn.hidden = true;
  } else if (os === 'android' || os === 'desktop') {
    // beforeinstallprompt를 잡을 시간을 주기 위해 살짝 지연
    setTimeout(() => {
      if (deferredPrompt && installBtn) {
        desc.textContent = '앱처럼 쓰려면 아래 "설치" 버튼을 눌러주세요.';
        installBtn.hidden = false;
        installBtn.addEventListener('click', async () => {
          if (!deferredPrompt) return;
          installBtn.disabled = true;
          trackEvent('pwa_install_clicked', { os });
          await deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          trackEvent(choice.outcome === 'accepted' ? 'pwa_install_accepted' : 'pwa_install_dismissed', { os });
          deferredPrompt = null;
          if (choice.outcome === 'accepted') {
            banner.hidden = true;
          } else {
            dismissForDays(DISMISS_DAYS);
            banner.hidden = true;
          }
        });
      } else if (os === 'android') {
        desc.innerHTML = '브라우저 메뉴(<strong>⋮</strong>)에서 <strong>"홈 화면에 추가"</strong> 또는 <strong>"앱 설치"</strong>를 선택하세요.';
        if (installBtn) installBtn.hidden = true;
      } else {
        // 데스크톱에서 beforeinstallprompt 없으면 노출 자체 생략
        banner.hidden = true;
      }
    }, 1500);
  }

  banner.hidden = false;
  trackEvent('pwa_prompt_shown', { os, visit_count: visitCount });

  closeBtn.addEventListener('click', () => {
    banner.hidden = true;
    dismissForDays(DISMISS_DAYS);
    trackEvent('pwa_prompt_dismissed', { os });
  });
}
