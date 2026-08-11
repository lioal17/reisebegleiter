const CACHE_NAME = 'reisebegleiter-v6';
const urlsToCache = [
  './',
  './index.html',
  './manifest.webmanifest',
  './demo-daten.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/hero.jpg',
  './assets/tile-flug.jpg',
  './assets/tile-boot.jpg',
  './assets/tile-hotel.jpg',
  './assets/tile-pass.jpg',
  './assets/tile-schutz.jpg',
  './assets/tile-visa.jpg'
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

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Fremde Hosts fasst der Service Worker nicht an. Konkret: die
  // Wetterabfrage laeuft am Cache vorbei, sonst wuerde ein einmal
  // geholter Wert fuer immer stehen bleiben. Ihr Zwischenspeicher
  // liegt mit eigenem Zeitstempel in der App.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(treffer => {
      if (treffer) return treffer;
      return fetch(event.request).then(antwort => {
        if (!antwort || antwort.status !== 200 || antwort.type === 'error') return antwort;
        const kopie = antwort.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, kopie));
        return antwort;
      }).catch(() =>
        caches.match(event.request).then(alt => alt || new Response('Offline – bitte später versuchen', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }))
      );
    })
  );
});
