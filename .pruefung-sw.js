/* Pruefung des Service Workers gegen die Faelle, die am Pier zaehlen.
   Laeuft ausserhalb des Browsers: node .pruefung-sw.js

   Der echte sw.js wird unveraendert eingelesen und mit nachgebauten
   Browser-Bausteinen ausgefuehrt. Geprueft wird also der Code, der
   auch ausgeliefert wird, nicht eine Nachbildung davon. */

const fs = require('fs');
const path = require('path');
const QUELLE = path.join(__dirname, 'sw.js');
const ORIGIN = 'https://beispiel.github.io';
const BASE = ORIGIN + '/reisebegleiter/';
const ECHTES_SET_TIMEOUT = setTimeout;
/* Cache-Name aus sw.js lesen, nicht fest verdrahten. Sonst scheitert
   die Pruefung bei jedem Versionssprung, und zwar aus dem falschen
   Grund. */
const AKTUELLER_CACHE = (fs.readFileSync(QUELLE, 'utf8').match(/CACHE_NAME = '([^']+)'/) || [])[1];
const ALTER_CACHE = 'reisebegleiter-alt';

function umgebung(gecacht, netz, sofortAbbrechen) {
  class Resp {
    constructor(body, init) {
      init = init || {};
      this.body = body;
      this.status = init.status === undefined ? 200 : init.status;
      this.ok = this.status >= 200 && this.status < 300;
      this.type = init.type || 'basic';
      this.url = init.url || '';
      this.headers = init.headers || {};
    }
    clone() {
      return new Resp(this.body, { status: this.status, type: this.type, url: this.url });
    }
  }

  class Req {
    constructor(input, init) {
      init = init || {};
      if (input instanceof Req) {
        this.url = input.url;
        this.method = input.method;
        /* Wie im Browser: Wird ein Request mit einem init neu gebaut,
           faellt mode 'navigate' auf 'same-origin' zurueck. */
        const hatInit = Object.keys(init).length > 0;
        this.mode = hatInit && input.mode === 'navigate' ? 'same-origin' : input.mode;
        this.signal = init.signal || input.signal;
      } else {
        this.url = new URL(input, BASE).href;
        this.method = init.method || 'GET';
        this.mode = init.mode || 'no-cors';
        this.signal = init.signal;
      }
    }
  }

  const schluessel = r => (r instanceof Req ? r.url : new URL(String(r), BASE).href);

  function treffer(map, r, opts) {
    const href = schluessel(r);
    if (map.has(href)) return map.get(href);
    if (opts && opts.ignoreSearch) {
      const ohne = href.split('?')[0];
      for (const [k, v] of map) if (k.split('?')[0] === ohne) return v;
    }
    return undefined;
  }

  const speicher = new Map();
  const v13 = new Map();
  Object.keys(gecacht).forEach(u => {
    v13.set(new URL(u, BASE).href, new Resp(gecacht[u], { url: new URL(u, BASE).href }));
  });
  speicher.set(AKTUELLER_CACHE, v13);

  const caches = {
    open: async name => {
      if (!speicher.has(name)) speicher.set(name, new Map());
      const m = speicher.get(name);
      return {
        put: async (r, resp) => { m.set(schluessel(r), resp); },
        match: async (r, o) => treffer(m, r, o)
      };
    },
    match: async (r, o) => {
      for (const m of speicher.values()) {
        const t = treffer(m, r, o);
        if (t) return t;
      }
      return undefined;
    },
    keys: async () => [...speicher.keys()],
    delete: async n => speicher.delete(n)
  };

  const horcher = {};
  const self = {
    addEventListener: (art, fn) => { horcher[art] = fn; },
    location: { origin: ORIGIN },
    skipWaiting: async () => {},
    clients: { claim: async () => {} }
  };

  const fakeSetTimeout = sofortAbbrechen
    ? (fn => ECHTES_SET_TIMEOUT(fn, 0))
    : ECHTES_SET_TIMEOUT;

  const src = fs.readFileSync(QUELLE, 'utf8') +
    '\nreturn { netzZuerst, cacheZuerst, ausSpeicher, brauchbar, istProgrammOderDaten, CACHE_NAME };';

  const bauen = new Function(
    'self', 'caches', 'fetch', 'Response', 'Request', 'AbortController', 'URL',
    'setTimeout', 'clearTimeout', src
  );

  const api = bauen(
    self, caches, (r, init) => netz(r, init, Resp), Resp, Req, AbortController, URL,
    fakeSetTimeout, clearTimeout
  );

  /* Ein Ereignis nachbauen und abwarten, was waitUntil zugesagt hat.
     Genau daran entscheidet der Browser, ob eine Installation als
     gelungen gilt. */
  async function ereignis(art) {
    const zusagen = [];
    horcher[art]({ waitUntil: p => zusagen.push(p) });
    await Promise.all(zusagen);
  }

  return { api: api, Req: Req, Resp: Resp, v13: v13, speicher: speicher, ereignis: ereignis };
}

/* ---------- Netz-Verhalten der einzelnen Faelle ---------- */

const keinNetz = () => { throw new TypeError('Failed to fetch'); };

const portal = (r, init, Resp) =>
  Promise.resolve(new Resp('<html>Hotel WLAN Anmeldung</html>', {
    status: 200, url: 'http://portal.wlan.local/login'
  }));

const serverFehler = (r, init, Resp) =>
  Promise.resolve(new Resp('Service Unavailable', { status: 503, url: BASE + 'index.html' }));

const gutesNetz = (r, init, Resp) =>
  Promise.resolve(new Resp('NEUE FASSUNG', { status: 200, url: BASE + 'index.html' }));

function haengendesNetz(r, init, Resp) {
  const signal = (init && init.signal) || r.signal;
  return new Promise((ok, fehler) => {
    const t = ECHTES_SET_TIMEOUT(() => ok(new Resp('SPAET', { status: 200, url: BASE + 'index.html' })), 50);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(t);
        const e = new Error('The user aborted a request.');
        e.name = 'AbortError';
        fehler(e);
      });
    }
  });
}

/* ---------- Faelle ---------- */

const APP = { './index.html': 'APP' };

const faelle = [
  {
    name: '1. Flugmodus, App liegt im Speicher',
    gecacht: APP, netz: keinNetz,
    anfrage: ['./index.html', { mode: 'navigate' }],
    erwartet: r => r.body === 'APP',
    beschreibt: 'liefert die abgelegte App'
  },
  {
    name: '2. Schnellzugriff Dokumente im Flugmodus, erstmals',
    gecacht: APP, netz: keinNetz,
    anfrage: ['./index.html?screen=tickets', { mode: 'navigate' }],
    erwartet: r => r.body === 'APP',
    beschreibt: 'findet die App trotz Anhang in der Adresse'
  },
  {
    name: '3. Hotel-WLAN mit Anmeldeseite, Status 200',
    gecacht: APP, netz: portal,
    anfrage: ['./index.html', { mode: 'navigate' }],
    erwartet: (r, u) => r.body === 'APP' &&
      u.v13.get(BASE + 'index.html').body === 'APP',
    beschreibt: 'zeigt die App, nicht das Portal, und ueberschreibt den Speicher nicht'
  },
  {
    name: '4. Server antwortet 503',
    gecacht: APP, netz: serverFehler,
    anfrage: ['./index.html', { mode: 'navigate' }],
    erwartet: r => r.body === 'APP',
    beschreibt: 'faellt auf den Speicher zurueck'
  },
  {
    name: '5. Netz haengt, Zeitlimit greift',
    gecacht: APP, netz: haengendesNetz, sofortAbbrechen: true,
    anfrage: ['./index.html', { mode: 'navigate' }],
    erwartet: r => r.body === 'APP',
    beschreibt: 'wartet nicht, sondern nimmt den Speicher'
  },
  {
    name: '6. Netz langsam, aber nichts im Speicher',
    gecacht: {}, netz: haengendesNetz, sofortAbbrechen: true,
    anfrage: ['./index.html', { mode: 'navigate' }],
    erwartet: r => r.body === 'SPAET',
    beschreibt: 'wartet, weil Warten die einzige Chance ist'
  },
  {
    name: '7. Nichts im Speicher, kein Netz',
    gecacht: {}, netz: keinNetz,
    anfrage: ['./index.html', { mode: 'navigate' }],
    erwartet: r => r.status === 503,
    beschreibt: 'sagt ehrlich, dass nichts da ist'
  },
  {
    name: '8. Gutes Netz',
    gecacht: APP, netz: gutesNetz,
    anfrage: ['./index.html', { mode: 'navigate' }],
    erwartet: (r, u) => r.body === 'NEUE FASSUNG' &&
      u.v13.get(BASE + 'index.html').body === 'NEUE FASSUNG',
    beschreibt: 'liefert die neue Fassung und legt sie ab'
  },
  {
    name: '9. Reisedaten im Flugmodus',
    gecacht: { './reisedaten-thailand.json': '{"tage":[]}' }, netz: keinNetz,
    anfrage: ['./reisedaten-thailand.json', {}],
    erwartet: r => r.body === '{"tage":[]}',
    beschreibt: 'Daten kommen aus dem Speicher'
  }
];

(async () => {
  let gut = 0, schlecht = 0;
  for (const f of faelle) {
    const u = umgebung(f.gecacht, f.netz, f.sofortAbbrechen);
    const req = new u.Req(f.anfrage[0], f.anfrage[1]);
    let ergebnis;
    try {
      ergebnis = await u.api.netzZuerst(req);
    } catch(e) {
      console.log('FEHLER  ' + f.name + ' -> Ausnahme: ' + e.message);
      schlecht++;
      continue;
    }
    let ok = false;
    try { ok = !!f.erwartet(ergebnis, u); } catch(e) { ok = false; }
    if (ok) {
      console.log('bestanden  ' + f.name + ' -> ' + f.beschreibt);
      gut++;
    } else {
      console.log('FEHLER     ' + f.name + ' -> erwartet: ' + f.beschreibt +
        ', erhalten: Status ' + ergebnis.status + ', Inhalt ' + JSON.stringify(String(ergebnis.body).slice(0, 40)));
      schlecht++;
    }
  }
  /* ---------- Installieren ---------- */

  /* Netz, bei dem die Pflichtdatei fehlt, das Beiwerk aber kommt.
     Das ist der Fall "Update im schwachen WLAN abgebrochen". */
  const pflichtFehlt = (r, init, Resp) => {
    const u = String(r.url || r);
    if (u.endsWith('index.html')) return Promise.resolve(new Resp('', { status: 404, url: u }));
    return Promise.resolve(new Resp('BEIWERK', { status: 200, url: u }));
  };
  const allesDa = (r, init, Resp) =>
    Promise.resolve(new Resp('NEU', { status: 200, url: String(r.url || r) }));

  async function installPruefung(name, netz, pruefen) {
    const u = umgebung({}, netz);
    /* Ein alter, vollstaendiger Cache aus der Vorgaengerfassung. */
    const alt = new Map();
    alt.set(BASE + 'index.html', new u.Resp('ALTE APP', { url: BASE + 'index.html' }));
    u.speicher.set(ALTER_CACHE, alt);

    let gescheitert = false;
    try { await u.ereignis('install'); } catch(e) { gescheitert = true; }
    if (!gescheitert) await u.ereignis('activate');

    const ok = pruefen(u, gescheitert);
    console.log((ok ? 'bestanden  ' : 'FEHLER     ') + name);
    if (ok) gut++; else schlecht++;
  }

  await installPruefung(
    '10. Update bricht ab: alter Speicher bleibt unversehrt',
    pflichtFehlt,
    (u, gescheitert) => gescheitert &&
      !u.speicher.has(AKTUELLER_CACHE) &&
      u.speicher.has(ALTER_CACHE) &&
      u.speicher.get(ALTER_CACHE).get(BASE + 'index.html').body === 'ALTE APP'
  );

  await installPruefung(
    '11. Update gelingt: neuer Speicher aktiv, alter geraeumt',
    allesDa,
    (u, gescheitert) => !gescheitert &&
      u.speicher.has(AKTUELLER_CACHE) &&
      !u.speicher.has(ALTER_CACHE) &&
      u.speicher.get(AKTUELLER_CACHE).get(BASE + 'index.html').body === 'NEU'
  );

  console.log('\n' + gut + ' bestanden, ' + schlecht + ' gescheitert.');
  process.exit(schlecht ? 1 : 0);
})();
