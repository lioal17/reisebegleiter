const CACHE_NAME = 'reisebegleiter-v14';

/* PFLICHT ist das Programm selbst. Schlaegt eine dieser Dateien beim
   Installieren fehl, bricht die Installation ab und der bisherige,
   vollstaendige Cache bleibt unberuehrt stehen.

   Bis v12 stand hier ein einziges urlsToCache mit
   cache.add(url).catch(() => {}). Das fing jeden Fehlschlag ab, der
   neue Cache wurde trotzdem aktiv, und das activate-Ereignis loeschte
   danach den alten. Ein abgebrochenes Update in einem schwachen WLAN
   konnte die App damit offline unbrauchbar machen: halb gefuellter
   neuer Cache, vollstaendiger alter Cache geloescht.

   KANN ist Beiwerk. Dazu gehoeren ausdruecklich die Reisedaten:
   reisedaten-thailand.json steht in .gitignore und liegt nur lokal,
   auf dem veroeffentlichten Stand gibt es sie nicht. Waere sie
   Pflicht, wuerde sich die App dort nie mehr installieren. */
const PFLICHT = [
  './index.html'
];

const KANN = [
  './',
  './manifest.webmanifest',
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

/* cache: 'reload' umgeht den HTTP-Zwischenspeicher des Browsers. Ohne
   das kann sich eine alte Fassung aus dem Browser-Cache in den neuen
   Service-Worker-Cache hinein retten, und dann liefert eine frisch
   installierte Fassung wieder den alten Stand aus. */
async function frischHolen(cache, url) {
  const antwort = await fetch(new Request(url, { cache: 'reload' }));
  if (!brauchbar(antwort)) throw new Error('Nicht brauchbar: ' + url);
  await cache.put(url, antwort);
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await Promise.all(PFLICHT.map(url => frischHolen(cache, url)));
    } catch(e) {
      /* Den halb gefuellten Cache wieder wegnehmen, damit kein
         unvollstaendiger Stand herumliegt. Danach weiterwerfen: eine
         gescheiterte Installation darf nicht aktiv werden. */
      await caches.delete(CACHE_NAME);
      throw e;
    }
    await Promise.all(KANN.map(url => frischHolen(cache, url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const namen = await caches.keys();
    await Promise.all(namen.map(n => n === CACHE_NAME ? null : caches.delete(n)));
    await self.clients.claim();
  })());
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

/* Flughafen- und Hotel-WLAN leiten auf eine Anmeldeseite um und
   antworten mit Status 200. Fuer den Service Worker sah das aus wie
   die App: er lieferte die Portalseite aus und schrieb sie sogar in
   den Cache, also ueber die funktionierende index.html. Verbundenes
   WLAN ohne Anmeldung war damit schlimmer als Flugmodus.

   Eine Antwort gilt nur als echt, wenn sie erfolgreich ist und ihre
   Endadresse noch von dieser Herkunft kommt. */
function brauchbar(antwort) {
  if (!antwort || !antwort.ok) return false;
  if (antwort.type === 'error' || antwort.type === 'opaque') return false;
  if (!antwort.url) return true;
  try {
    return new URL(antwort.url).origin === self.location.origin;
  } catch(e) {
    return false;
  }
}

/* Vier Sekunden. Ohne eigenes Limit wartet die Seite auf das Zeitlimit
   des Browsers, und das sind je nach Netz zwanzig Sekunden und mehr.
   Um sechs Uhr morgens am Pier ist das dasselbe wie "kaputt".

   Das Limit gilt nur, wenn es etwas zum Zurueckfallen gibt. Liegt
   nichts im Cache, ist Warten die einzige Chance, und dann wird
   gewartet. */
const NETZ_LIMIT_MS = 4000;

function holen(request, limitMs) {
  if (!limitMs) return fetch(request);
  const abbruch = new AbortController();
  const wecker = setTimeout(() => abbruch.abort(), limitMs);
  return fetch(request, { signal: abbruch.signal })
    .finally(() => clearTimeout(wecker));
}

/* Der Schnellzugriff "Dokumente" aus dem manifest ruft
   index.html?screen=tickets auf. caches.match vergleicht die Adresse
   samt Anhang und fand die abgelegte index.html nicht: wer den
   Schnellzugriff im Flugmodus zum ersten Mal benutzte, landete in der
   503-Seite, obwohl die App vollstaendig im Cache lag. ignoreSearch
   vergleicht ohne den Anhang, und fuer Navigationen bleibt die
   Startseite als letzter Rueckfall. */
async function ausSpeicher(request) {
  const genau = await caches.match(request);
  if (genau) return genau;
  const ohneAnhang = await caches.match(request, { ignoreSearch: true });
  if (ohneAnhang) return ohneAnhang;
  if (request.mode === 'navigate') {
    return (await caches.match('./index.html')) || null;
  }
  return null;
}

function offlineAntwort() {
  return new Response('Offline, und im Speicher liegt nichts. Bitte die App einmal mit Netz oeffnen.', {
    status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

async function netzZuerst(request) {
  const alt = await ausSpeicher(request);
  try {
    const antwort = await holen(request, alt ? NETZ_LIMIT_MS : 0);
    if (brauchbar(antwort)) {
      const kopie = antwort.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, kopie)).catch(() => {});
      return antwort;
    }
    /* Kein Netzfehler, aber auch keine echte Antwort: Portalseite,
       503 vom Server, Umleitung nach auswaerts. Bis v12 wurde genau
       diese Antwort durchgelassen, obwohl eine funktionierende
       Fassung im Cache lag. */
    if (alt) return alt;
    return antwort;
  } catch(e) {
    if (alt) return alt;
    return offlineAntwort();
  }
}

async function cacheZuerst(request) {
  const treffer = await caches.match(request);
  if (treffer) return treffer;
  try {
    const antwort = await holen(request, 0);
    if (brauchbar(antwort)) {
      const kopie = antwort.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, kopie)).catch(() => {});
    }
    return antwort;
  } catch(e) {
    return offlineAntwort();
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Fremde Hosts fasst der Service Worker nicht an. Konkret: die
  // Wetterabfrage laeuft am Cache vorbei, sonst wuerde ein einmal
  // geholter Wert fuer immer stehen bleiben. Ihr Zwischenspeicher
  // liegt mit eigenem Zeitstempel in der App.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  if (event.request.mode === 'navigate' || istProgrammOderDaten(event.request.url)) {
    event.respondWith(netzZuerst(event.request));
    return;
  }

  event.respondWith(cacheZuerst(event.request));
});
