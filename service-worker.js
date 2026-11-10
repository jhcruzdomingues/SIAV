// The build embeds only public static URLs. No runtime responses are added to this cache.
const STATIC_CONFIG = self.__SIAV_STATIC_CONFIG__ || {
  version: 'development',
  assets: [
    '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png',
    '/data/quiz-fallback.json', '/sounds/library/shocks/shock-1.mp3',
    '/sounds/library/alerts/alert-1.mp3', '/sounds/library/drugs/drug-1.mp3'
  ]
};
const CACHE_PREFIX = 'siav-static-';
const CACHE_NAME = CACHE_PREFIX + STATIC_CONFIG.version;
const PUBLIC_ASSETS = new Set(STATIC_CONFIG.assets);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const path of PUBLIC_ASSETS) {
      const request = new Request(new URL(path, self.location.origin), { credentials: 'omit', cache: 'no-store' });
      const response = await fetch(request);
      if (!response.ok || response.type === 'opaque' || response.redirected ||
          /(?:private|no-store)/i.test(response.headers.get('Cache-Control') || '') ||
          /(?:authorization|cookie)/i.test(response.headers.get('Vary') || '')) {
        throw new Error(`Recurso estático indisponível ou não público: ${path}`);
      }
      await cache.put(path, response);
    }
    // Do not force a new worker onto an open encounter or reload the application.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Delete only previous caches created by this static-only policy.
    // Legacy siav-v13 and user/other application storage require a separate retention decision.
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search ||
      request.headers.has('Authorization')) return;
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  if (!PUBLIC_ASSETS.has(path)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(path) || fetch(request);
  })());
});

// Notification payloads and user data are never persisted in the static cache.
self.addEventListener('push', event => {
  event.waitUntil(self.registration.showNotification('SIAV', {
    body: event.data ? event.data.text() : 'Nova notificação SIAV',
    icon: '/icon-192.png', badge: '/icon-192.png', vibrate: [200, 100, 200]
  }));
});
