/**
 * 신규 유저 온보딩 모달 (유저당 1회)
 * - 서비스 컨셉 안내
 * - 방 생성/참여 유도
 * - 알림 권한 요청
 * - 위치 권한 요청
 */
import { completeOnboarding, apiFetch } from './api';
import { registerPushToken } from './firebase';
import { trackEvent } from './analytics';

interface Step {
  id: string;
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  action?: () => Promise<'granted' | 'denied' | 'unsupported' | void>;
}

/** 온보딩 모달 시작 */
export async function startOnboarding(): Promise<void> {
  // 이미 열려있으면 중복 방지
  if (document.getElementById('onboarding-overlay')) return;

  const steps: Step[] = [
    {
      id: 'intro',
      icon: '🍽️',
      title: '함께 쌓아가는 우리만의 맛집 지도',
      description:
        '친구·가족·팀원과 방을 만들어, 다녀온 맛집과 가고 싶은 맛집을 함께 기록해요. 각자의 리뷰가 쌓여 우리만의 작은 맛집 랭킹이 만들어집니다.',
      actionLabel: '다음',
    },
    {
      id: 'room',
      icon: '🏠',
      title: '방을 만들거나 참여하세요',
      description:
        '내 방은 언제든 홈 화면에서 확인할 수 있어요. 초대 코드를 받으셨다면 "방 참여"로 바로 들어올 수 있습니다.',
      actionLabel: '다음',
    },
    {
      id: 'notification',
      icon: '🔔',
      title: '친구 활동을 실시간 알림으로',
      description:
        '방 멤버가 새 맛집을 등록하거나 리뷰를 남기면 바로 알려드려요. 원치 않으면 프로필에서 언제든 끌 수 있습니다.',
      actionLabel: '알림 허용',
      action: requestNotificationPermission,
    },
    {
      id: 'location',
      icon: '📍',
      title: '가까운 맛집을 추천해드려요',
      description:
        '현재 위치를 기준으로 가까운 위시리스트 식당을 추천해요. 위치 정보는 서버에 저장되지 않고, 지도 중심을 맞추는 데만 사용됩니다.',
      actionLabel: '위치 허용',
      action: requestLocationPermission,
    },
  ];

  trackEvent('onboarding_started', { total_steps: steps.length });

  let currentStep = 0;

  const overlay = document.createElement('div');
  overlay.id = 'onboarding-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10002;display:flex;align-items:center;justify-content:center;padding:1rem;opacity:0;transition:opacity 0.2s;';

  const modal = document.createElement('div');
  modal.style.cssText =
    'background:#fff;border-radius:20px;padding:2rem 1.5rem 1.5rem;max-width:380px;width:100%;box-shadow:0 16px 40px rgba(0,0,0,0.25);font-family:inherit;';

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  function render() {
    const s = steps[currentStep];
    const dots = steps
      .map(
        (_, i) =>
          `<span style="width:${i === currentStep ? 24 : 8}px;height:8px;border-radius:4px;background:${
            i === currentStep ? '#111' : '#ddd'
          };transition:all 0.25s;"></span>`,
      )
      .join('');
    modal.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:3.5rem;margin-bottom:1rem;line-height:1;">${s.icon}</div>
        <h2 style="font-size:1.15rem;font-weight:800;color:#111;margin:0 0 0.6rem;line-height:1.4;word-break:keep-all;">${s.title}</h2>
        <p style="font-size:0.88rem;color:#555;line-height:1.7;margin:0 0 1.5rem;word-break:keep-all;">${s.description}</p>
      </div>
      <div style="display:flex;justify-content:center;gap:0.4rem;margin-bottom:1.25rem;">${dots}</div>
      <div style="display:flex;flex-direction:column;gap:0.5rem;">
        <button class="ob-action" style="padding:0.8rem;background:#111;color:#fff;border:none;border-radius:12px;font-size:0.95rem;font-weight:700;cursor:pointer;font-family:inherit;">${s.actionLabel}</button>
        ${
          currentStep < steps.length - 1
            ? `<button class="ob-skip" style="padding:0.6rem;background:transparent;color:#999;border:none;font-size:0.82rem;font-weight:500;cursor:pointer;font-family:inherit;">건너뛰기</button>`
            : ''
        }
      </div>
    `;

    // 스텝 노출 시점 추적
    trackEvent('onboarding_step_viewed', { step_index: currentStep, step_id: s.id });

    modal.querySelector('.ob-action')?.addEventListener('click', async () => {
      const btn = modal.querySelector<HTMLButtonElement>('.ob-action');
      if (btn) { btn.disabled = true; btn.textContent = '처리 중...'; }
      let result: 'granted' | 'denied' | 'unsupported' | void;
      try {
        if (s.action) result = await s.action();
      } catch {
        /* ignore */
      }
      trackEvent('onboarding_step_completed', {
        step_index: currentStep,
        step_id: s.id,
        ...(result ? { permission_result: result } : {}),
      });
      nextStep();
    });

    modal.querySelector('.ob-skip')?.addEventListener('click', () => {
      trackEvent('onboarding_skipped', { at_step: currentStep, step_id: s.id });
      finish('skipped');
    });
  }

  function nextStep() {
    if (currentStep < steps.length - 1) {
      currentStep++;
      render();
    } else {
      finish('completed');
    }
  }

  async function finish(reason: 'completed' | 'skipped') {
    trackEvent('onboarding_finished', { reason, last_step: currentStep });
    try {
      await completeOnboarding();
    } catch {
      /* ignore: 다음 로그인 시 재시도 */
    }
    overlay.style.opacity = '0';
    overlay.addEventListener(
      'transitionend',
      () => {
        overlay.remove();
        document.body.style.overflow = '';
      },
      { once: true },
    );
  }

  render();
}

async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return 'denied';
  }
  // 권한 granted → FCM 토큰 등록 (fire-and-forget)
  registerPushToken(apiFetch).catch(() => {});
  return 'granted';
}

async function requestLocationPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!('geolocation' in navigator)) return 'unsupported';
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      () => resolve('denied'),
      { timeout: 8000 },
    );
  });
}
