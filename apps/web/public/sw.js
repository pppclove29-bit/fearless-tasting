const CACHE_NAME = 'fearless-tasting-v5';
const PRECACHE_URLS = [
  '/',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // API 요청은 캐시하지 않음 (외부 origin 또는 /api/ 경로)
  if (request.url.includes('/api/') || request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // 네비게이션(HTML) 요청: network-first + 캐시 업데이트
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // favicon, manifest, icons: network-first (변경 시 즉시 반영)
  if (request.url.includes('favicon') || request.url.includes('manifest') || request.url.includes('/icons/')) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // 정적 자산: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
      return cached || fetched;
    })
  );
});

// ─── FCM 푸시 알림 ───

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: '무모한 시식가', body: event.data.text() } };
  }

  const { title, body } = payload.notification || {};
  const data = payload.data || {};

  event.waitUntil(
    self.registration.showNotification(title || '무모한 시식가', {
      body: body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'fearless-' + (data.roomId || 'general'),
      data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.link || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 탭이 있으면 포커스
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // 없으면 새 탭
      return self.clients.openWindow(url);
    })
  );
});
