import { apiFetch, showPermissionExplainer, showPermissionDeniedGuide } from './api';
import { registerPushToken } from './firebase';
import { trackEvent } from './analytics';

const EXPLAINER_KEY = 'push_explainer_shown';

/**
 * 첫 리뷰/방문 등록 등 "커밋된" 순간에 자연스럽게 푸시 권한 요청.
 * - 이미 결정된 상태(granted/denied)면 스킵
 * - 한 번 노출 후 재노출 안 함 (거부했어도 프로필에서 다시 켤 수 있음)
 */
export async function maybeRequestPushAfterCommit(context: string): Promise<void> {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'default') return;
  if (localStorage.getItem(EXPLAINER_KEY)) return;

  localStorage.setItem(EXPLAINER_KEY, '1');

  // 성공 UI가 settle되도록 약간 지연
  await new Promise((r) => setTimeout(r, 800));

  trackEvent('push_explainer_shown', { context });

  const ok = await showPermissionExplainer({
    title: '친구 활동을 알림으로 받아볼까요?',
    description: '방에 새 맛집, 방문, 리뷰가 등록되면 바로 알려드려요. 원치 않으면 프로필에서 언제든 끌 수 있습니다.',
    icon: '🔔',
    allowText: '알림 허용하기',
  });

  if (!ok) {
    trackEvent('push_explainer_declined', { context });
    return;
  }

  const perm = await Notification.requestPermission();
  trackEvent('push_permission_result', { context, result: perm });
  if (perm === 'denied') {
    showPermissionDeniedGuide('notification');
    return;
  }
  if (perm !== 'granted') return;

  const token = await registerPushToken(apiFetch);
  if (token) {
    trackEvent('push_token_registered', { context });
  }
}
