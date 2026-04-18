/**
 * Firebase Cloud Messaging 초기화 + 토큰 관리.
 * 환경변수 미설정 시 조용히 비활성화.
 */
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import type { Messaging } from 'firebase/messaging';

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.PUBLIC_FIREBASE_VAPID_KEY;

let messaging: Messaging | null = null;

function isConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId && VAPID_KEY);
}

function getMessagingInstance(): Messaging | null {
  if (messaging) return messaging;
  if (!isConfigured()) return null;

  try {
    const app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    return messaging;
  } catch {
    return null;
  }
}

const FCM_TOKEN_KEY = 'fcm_token';
const FCM_REGISTERED_KEY = 'fcm_token_registered';

/** 서버에 토큰 등록 (idempotent). 성공 시 localStorage에 플래그 저장. */
async function registerTokenWithServer(
  apiFetch: (input: string, init?: RequestInit) => Promise<Response>,
  token: string,
): Promise<boolean> {
  const device = `${navigator.platform} ${navigator.userAgent.split(' ').pop()}`;
  try {
    const res = await apiFetch(`${API_BASE}/users/me/fcm-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, device }),
    });
    if (res.ok) {
      localStorage.setItem(FCM_REGISTERED_KEY, token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * 알림 권한 요청 → FCM 토큰 발급 → 서버에 등록.
 * localStorage에 캐싱하여 매번 Firebase 토큰 요청을 방지.
 * 토큰은 캐시됐지만 서버 등록이 실패한 경우엔 재등록 시도.
 */
export async function registerPushToken(apiFetch: (input: string, init?: RequestInit) => Promise<Response>): Promise<string | null> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return null;

  // 캐시된 토큰이 있는데 서버 등록이 아직 안 됐으면 재등록 시도
  const cached = localStorage.getItem(FCM_TOKEN_KEY);
  const registered = localStorage.getItem(FCM_REGISTERED_KEY);
  if (cached) {
    if (registered !== cached) {
      await registerTokenWithServer(apiFetch, cached);
    }
    return cached;
  }

  const msg = getMessagingInstance();
  if (!msg) return null;

  // 이미 granted면 바로 진행, 아니면 요청
  if (Notification.permission === 'denied') return null;
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
  }

  try {
    const sw = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!sw) return null;

    const token = await getToken(msg, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: sw,
    });

    if (!token) return null;

    // 서버에 토큰 등록
    await registerTokenWithServer(apiFetch, token);

    // 캐싱
    localStorage.setItem(FCM_TOKEN_KEY, token);

    // 포그라운드 메시지 수신 시 알림 뱃지 갱신
    onMessage(msg, () => {
      const badge = document.querySelector('.notif-badge') as HTMLElement | null;
      if (badge) badge.hidden = false;
    });

    return token;
  } catch {
    return null;
  }
}

/**
 * 로그아웃 시 서버에서 토큰 삭제 + localStorage 정리
 */
export async function unregisterPushToken(
  apiFetch: (input: string, init?: RequestInit) => Promise<Response>,
) {
  const token = localStorage.getItem(FCM_TOKEN_KEY);
  if (!token) return;

  localStorage.removeItem(FCM_TOKEN_KEY);
  localStorage.removeItem(FCM_REGISTERED_KEY);
  try {
    await apiFetch(`${API_BASE}/users/me/fcm-token`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  } catch {
    // 조용히 실패
  }
}
