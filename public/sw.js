const CACHE_NAME = 'pmfit-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/ocr',
  '/history',
  '/settings',
  '/manifest.webmanifest',
];

// サービスワーカーインストール
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// サービスワーカーアクティベート
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Cache First Strategy for Static Assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Gemini API または Google 関連ドメインへの通信はキャッシュせずそのままネットワークへパス
  if (url.origin.includes('googleapis.com') || url.origin.includes('google.com')) {
    return;
  }

  // GET リクエストのキャッシュコントロール
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // バックグラウンドで静的アセットを更新 (Stale-while-revalidate)
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => {
              /* オフライン時は無視 */
            });
          return cachedResponse;
        }
        return fetch(event.request).catch(() => {
          // オフライン時にフォールバックルートキャッシュを返す
          return caches.match('/');
        });
      })
    );
  }
});
