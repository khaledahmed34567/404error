// ================================================
//   404 Social App — Service Worker
//   PWA Install + Offline Cache
// ================================================

const CACHE_NAME = '404-app-v1.2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/404.html',
  'https://fonts.googleapis.com/css2?family=Harmattan:wght@400;700&family=Mada:wght@300;400;500;600;700;900&family=Baloo+Bhaijaan+2:wght@400;500;600;700;800&family=Noto+Sans+Arabic:wght@300;400;500;600;700;900&family=Rubik:wght@300;400;500;600;700;900&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap',
  'https://files.catbox.moe/t4hxiu.ttf',
  'https://files.catbox.moe/5nhg4t.ttf',
  'https://files.catbox.moe/koigd8.ttf'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS.filter(u => !u.startsWith('http') || u.includes('fonts')))
        .catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase & API calls → always network
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('imgbb') ||
      url.hostname.includes('paypal') ||
      url.hostname.includes('ibb.co')) {
    return;
  }

  // Navigation requests → serve index.html (SPA routing)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html')
      )
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
