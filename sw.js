const CACHE_NAME = 'reisebegleiter-v11';
const urlsToCache = [
  './',
  './index.html',
  './manifest.webmanifest',
  // Echte Reisedaten zuerst. Fehlt die Datei, faengt cache.add den
  // Fehlschlag ab und die Demo-Reise bleibt der Rueckfall.
  './reisedaten-thailand.json',
  './demo-daten.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/hero.jpg',
  './assets/bg-mobile.jpg',
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

/* Programm und Daten holt der Service Worker zuerst aus dem Netz,
   Bilder und Symbole zuerst aus dem Cache.

   Warum diese Unterscheidung noetig wurde: Bis v9 galt fuer alles
   "Cache zuerst". Damit lieferte ein Browser, der die App schon
   einmal geoeffnet hatte, **dauerhaft die alte Fassung** aus. Eine
   korrigierte index.html oder eine neue Datendatei waren auf dem
   Geraet unsichtbar, ohne Fehlermeldung, ohne Hinweis. Am 27.09.2026
   hat genau das dazu gefuehrt, dass die Demo-Reise vom 20.12. auf
   dem Bildschirm stehen blieb, obwohl die echten Daten vom 12.12.
   im Ordner lagen und der Server sie auslieferte.

   Der Offline-Betrieb leidet nicht darunter: schlaegt das Netz fehl,
   wird weiterhin aus dem Cache bedient. Ohne Netz ist das der
   Normalfall und das Verhalten identisch zu vorher. */
function istProgrammOderDaten(url) {
  const p = new URL(url).pathname;
  return p === '/' || p.endsWith('/') || p.endsWith('.html') || p.endsWith('.json') || p.endsWith('.webmanifest');
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Fremde Hosts fasst der Service Worker nicht an. Konkret: die
  // Wetterabfrage laeuft am Cache vorbei, sonst wuerde ein einmal
  // geholter Wert fuer immer stehen bleiben. Ihr Zwischenspeicher
  // liegt mit eigenem Zeitstempel in der App.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  if (event.request.mode === 'navigate' || istProgrammOderDaten(event.request.url)) {
    event.respondWith(
      fetch(event.request).then(antwort => {
        if (antwort && antwort.status === 200 && antwort.type !== 'error') {
          const kopie = antwort.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, kopie));
        }
        return antwort;
      }).catch(() =>
        caches.match(event.request).then(alt => alt || new Response('Offline – bitte später versuchen', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }))
      )
    );
    return;
  }

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
