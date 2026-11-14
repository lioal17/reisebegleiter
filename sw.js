const CACHE_NAME = 'reisebegleiter-v20';

/* Bibliotheken (pdf.js, Texterkennung) liegen in einem eigenen
   Speicher, der einen Versionswechsel der App ueberlebt. Sie sind
   zusammen rund 8 MB gross und aendern sich fast nie. Laegen sie im
   Speicher der App, wuerde jedes Update sie neu herunterladen, im
   Zweifel ueber das Mobilnetz im Ausland.

   Gefuellt wird dieser Speicher nicht bei der Installation, sondern
   wenn die Seite die Dateien zum ersten Mal holt (vendorVorladen in
   index.html). So bleibt die Installation schnell, und es kommt nur
   der Rechenkern aufs Geraet, den es wirklich braucht. */
const VENDOR_CACHE = 'reisebegleiter-vendor-1';

/* Was ueber "Teilen" aus einer anderen App hereinkommt, wartet hier,
   bis die Seite es abholt. Rein lokal. */
const TEILEN_CACHE = 'teilen-eingang';

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
  /* Die 512er Symbole (je rund 300 KB) holt sich der Browser bei der
     Installation selbst. Im Vorrat kosteten sie bei jedem Versionswechsel
     unnoetig Daten. Performance 14.11.2026. */
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
    const bleibt = [CACHE_NAME, VENDOR_CACHE, TEILEN_CACHE];
    await Promise.all(namen.map(n => bleibt.indexOf(n) !== -1 ? null : caches.delete(n)));
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

/* Performance (14.11.2026): Das Programm selbst (index.html, Startseite,
   manifest) kommt jetzt SOFORT aus dem Cache, das Netz aktualisiert im
   Hintergrund. Vorher wartete jeder Start bis zu vier Sekunden aufs Netz,
   in schwachem Hotel-WLAN fuehlte sich die App dadurch langsam an.

   Der Fehler bis v9 ("dauerhaft die alte Fassung") kommt damit nicht
   zurueck: Jeder Start holt im Hintergrund die neue Fassung und legt sie
   in den Cache. Ist sie anders als die angezeigte, bekommt die Seite eine
   Nachricht und zeigt "Neue Version - tippen zum Laden". Daten-Dateien
   (*.json) bleiben bei "Netz zuerst", dort zaehlt Aktualitaet.

   Ohne Cache-Treffer (erster Start) wird wie bisher aufs Netz gewartet. */
async function sofortUndImHintergrund(event) {
  const request = event.request;
  const alt = await ausSpeicher(request);
  /* Kopie JETZT ziehen: alt geht gleich an die Seite, danach ist sein
     Inhalt verbraucht und laesst sich nicht mehr klonen. */
  const altKopie = alt ? alt.clone() : null;
  /* Promise.resolve().then: auch ein sofort geworfener Fehler landet im
     catch unten und nicht ungefangen im Service Worker. */
  const netz = Promise.resolve().then(() => holen(request, 0)).then(async antwort => {
    if (!brauchbar(antwort)) return antwort;
    let anders = false;
    if (altKopie) {
      try {
        const [a, b] = await Promise.all([altKopie.text(), antwort.clone().text()]);
        anders = a !== b;
      } catch(e) {}
    }
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, antwort.clone());
    } catch(e) {}
    if (anders) {
      /* Die Nachricht muss an die NEUE Seite gehen, nicht an die gerade
         schliessende. clients.get(resultingClientId) wartet, bis die neue
         Seite bereit ist. Ohne diese Kennung an alle Fenster. */
      const nachricht = { typ: 'neue-fassung' };
      let neu = null;
      if (event.resultingClientId && self.clients.get) {
        try { neu = await self.clients.get(event.resultingClientId); } catch(e) {}
      }
      if (neu) neu.postMessage(nachricht);
      else {
        const fenster = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        fenster.forEach(f => f.postMessage(nachricht));
      }
    }
    return antwort;
  });
  if (alt) {
    event.waitUntil(netz.catch(() => {}));
    return alt;
  }
  try {
    return await netz;
  } catch(e) {
    return offlineAntwort();
  }
}

function istDaten(url) {
  return new URL(url).pathname.endsWith('.json');
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

/* Bibliotheken: aus dem Speicher, sonst aus dem Netz und dann in den
   eigenen Speicher. */
async function vendorZuerst(request) {
  const treffer = await caches.match(request);
  if (treffer) return treffer;
  try {
    const antwort = await holen(request, 0);
    if (brauchbar(antwort)) {
      const kopie = antwort.clone();
      caches.open(VENDOR_CACHE).then(cache => cache.put(request, kopie)).catch(() => {});
    }
    return antwort;
  } catch(e) {
    return offlineAntwort();
  }
}

/* Teilen-Ziel. Android schickt, was der Nutzer aus einer anderen App
   teilt, als Formular an "./teilen". Diese Anfrage verlaesst das
   Geraet nie: sie wird hier abgefangen, der Inhalt lokal abgelegt und
   die App geoeffnet. Es gibt keinen Server, der sie annehmen koennte.
   Bedingungen in CLAUDE.md, "Praezisierung Teilen aus anderen Apps". */
async function teilenAnnehmen(request) {
  try {
    const form = await request.formData();
    const cache = await caches.open(TEILEN_CACHE);
    const stempel = Date.now();
    const dateien = form.getAll('files').filter(f => f && typeof f === 'object' && f.size > 0).slice(0, 10);
    let i = 0;
    for (const f of dateien) {
      await cache.put('./teilen-datei-' + stempel + '-' + (i++), new Response(f, {
        headers: { 'Content-Type': f.type || 'application/octet-stream', 'X-Dateiname': encodeURIComponent(f.name || 'Geteilte Datei') }
      }));
    }
    const text = {
      titel: String(form.get('title') || '').slice(0, 300),
      text: String(form.get('text') || '').slice(0, 20000),
      url: String(form.get('url') || '').slice(0, 2000)
    };
    if (text.titel || text.text || text.url) {
      await cache.put('./teilen-text-' + stempel, new Response(JSON.stringify(text), { headers: { 'Content-Type': 'application/json' } }));
    }
  } catch(e) { /* nichts abgelegt: die App oeffnet trotzdem */ }
  return Response.redirect(new URL('./index.html?screen=teilen', self.location.href).href, 303);
}

self.addEventListener('fetch', event => {
  const adresse = new URL(event.request.url);
  if (event.request.method === 'POST' && adresse.origin === self.location.origin && adresse.pathname.endsWith('/teilen')) {
    event.respondWith(teilenAnnehmen(event.request));
    return;
  }
  if (event.request.method !== 'GET') return;

  // Fremde Hosts fasst der Service Worker nicht an. Konkret: die
  // Wetterabfrage laeuft am Cache vorbei, sonst wuerde ein einmal
  // geholter Wert fuer immer stehen bleiben. Ihr Zwischenspeicher
  // liegt mit eigenem Zeitstempel in der App.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  if (adresse.pathname.indexOf('/vendor/') !== -1) {
    event.respondWith(vendorZuerst(event.request));
    return;
  }

  if (istDaten(event.request.url)) {
    event.respondWith(netzZuerst(event.request));
    return;
  }
  if (event.request.mode === 'navigate' || istProgrammOderDaten(event.request.url)) {
    event.respondWith(sofortUndImHintergrund(event));
    return;
  }

  event.respondWith(cacheZuerst(event.request));
});
