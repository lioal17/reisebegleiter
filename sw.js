const CACHE_NAME = 'reisebegleiter-v4';
const urlsToCache = [
  './',
  './index.html',
  './manifest.webmanifest',
  './demo-daten.json',
  './assets/hero.jpg',
  './assets/tile-flug.jpg',
  './assets/tile-boot.jpg',
  './assets/tile-hotel.jpg',
  './assets/tile-pass.jpg',
  './assets/tile-schutz.jpg',
  './assets/tile-visa.jpg',
  './assets/tile-default.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        urlsToCache.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// HTML/App-Shell: immer zuerst aus dem Netz laden (damit Updates ankommen),
// nur offline aus dem Cache. Bilder & Co.: zuerst Cache (schnell/offline).
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isShell = event.request.mode === 'navigate' ||
                  url.pathname.endsWith('/') ||
                  url.pathname.endsWith('index.html') ||
                  url.pathname.endsWith('sw.js') ||
                  url.pathname.endsWith('manifest.webmanifest');

  if (isShell) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'error') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() =>
        caches.match(event.request).then(r => r || caches.match('./index.html'))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        return response;
      }).catch(() => caches.match(event.request) || new Response('Offline'));
    })
  );
});
