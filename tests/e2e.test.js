/* Prueft die App im Browser, so wie sie auf dem Handy laeuft.
   Aufruf: node tests/e2e.test.js

   Braucht Playwright samt Chromium, global installiert. Im Repo
   liegt absichtlich kein node_modules. Der Test startet einen eigenen
   kleinen Server auf einem freien Port und beendet ihn wieder.

   Was jeden Lauf scheitern laesst, auch ohne eigene Pruefung:
   - ein Fehler in der Konsole oder ein Skriptfehler
   - eine Verletzung der Sicherheitsregel (CSP)
   - eine Anfrage an einen anderen Host als die zwei erlaubten

   Alle Angaben sind erfunden. Keine echten Reisedaten. Wetter und
   Kursdienst werden im Test durch feste Antworten ersetzt, es geht
   nichts ins Netz. */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let chromium;
try { chromium = require('playwright').chromium; }
catch (e) {
  try { chromium = require(path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'playwright')).chromium; }
  catch (e2) { console.error('Playwright ist nicht installiert. Global installieren: npm i -g playwright'); process.exit(2); }
}

const ROOT = path.join(__dirname, '..');
const TYP = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
const ERLAUBT = ['api.open-meteo.com', 'api.frankfurter.dev'];

let ok = 0, fehler = 0;
function gleich(name, ist, soll) {
  const a = JSON.stringify(ist), b = JSON.stringify(soll);
  if (a === b) { ok++; return; }
  fehler++; console.error('FEHLER  ' + name + '\n   ist:  ' + a + '\n   soll: ' + b);
}
function wahr(name, v) { gleich(name, !!v, true); }
const warte = ms => new Promise(r => setTimeout(r, ms));

function server() {
  return new Promise(fertig => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const datei = path.join(ROOT, p);
      if (!datei.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      fs.readFile(datei, (err, buf) => {
        if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('nicht gefunden'); }
        res.writeHead(200, { 'Content-Type': TYP[path.extname(datei).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(buf);
      });
    }).listen(0, '127.0.0.1', () => fertig(s));
  });
}

/* Ein Browserfenster in Handygroesse mit Aufsicht: Konsole, Netz,
   Dialoge. Die Uhr steht auf einem Reisetag der erfundenen Demo-Reise. */
async function fenster(browser, basis, opt) {
  opt = opt || {};
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: 'de-CH', timezoneId: 'Europe/Zurich',
    acceptDownloads: true, serviceWorkers: opt.sw ? 'allow' : 'block'
  });
  const log = { fehler: [], fremd: [], dialoge: [], kursAbfragen: [], wetterAbfragen: [] };
  await ctx.route(url => !/^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(url.toString()) && !/^(blob|data):/.test(url.toString()), route => {
    const u = new URL(route.request().url());
    log.fremd.push(u.host);
    if (u.host === 'api.frankfurter.dev') {
      log.kursAbfragen.push(u.pathname + u.search);
      if (opt.kursAus) return route.abort();
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ amount: 1, base: 'CHF', date: '2026-12-23', rates: { THB: 41.5, JPY: 172, EUR: 1.06, 'x<script>': 5, BAD: -1 } }) });
    }
    if (u.host === 'api.open-meteo.com') {
      log.wetterAbfragen.push(u.search);
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ current: { temperature_2m: 30.4, weather_code: 1 }, daily: { temperature_2m_max: [32], temperature_2m_min: [24] } }) });
    }
    return route.abort();
  });
  if (opt.vorher) await ctx.addInitScript(opt.vorher);
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(opt.zeit || '2026-12-24T09:00:00') });
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const wo = (m.location() && m.location().url) || '';
    /* Die echte Datendatei gibt es im Repo absichtlich nicht. Ihr 404
       beim Start ist der vorgesehene Weg zur Demo-Reise. */
    if (/reisedaten-thailand\.json/.test(wo)) return;
    if (opt.erwarteteFehler && opt.erwarteteFehler.test(m.text())) return;
    log.fehler.push(m.text() + ' @ ' + wo);
  });
  page.on('pageerror', e => log.fehler.push('Skriptfehler: ' + e.message));
  page.on('dialog', d => { log.dialoge.push(d.message()); d.accept(); });
  await page.goto(basis + '/index.html');
  await page.waitForFunction(() => typeof appData !== 'undefined' && appData && document.getElementById('dayList').children.length > 0);
  return { ctx, page, log };
}

const HOTEL = ['Buchungsbestätigung', 'Mangrovenblick Resort', 'Adresse: Uferweg 3, Insel Demo, Thailand', 'Buchungsnummer: DEMO-771204',
  'Check-in: 02.01.2027 ab 14:00', 'Check-out: 05.01.2027 bis 11:00', '3 Nächte, 1 Erwachsener',
  'Gesamtpreis: THB 9,600.00', 'Zahlung vor Ort', 'Kostenlose Stornierung bis 28.12.2026'];
const FLUG = ['E-Ticket', 'Flug ZB 902', 'Abflug: 06.01.2027 17:30 Zürich (ZRH), Terminal 2', 'Ankunft: 07.01.2027 10:40 Bangkok (BKK)',
  'Buchungscode: DEMO77', 'Total CHF 950.00', 'bezahlt'].join('\n');

async function pdfErzeugen(browser, zeilen, ziel) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.setContent('<html><body style="font:14px sans-serif">' + zeilen.map(z => '<p>' + z + '</p>').join('') + '</body></html>');
  await p.pdf({ path: ziel, format: 'A4' });
  await ctx.close();
}
/* Eine erfundene Bestaetigung als Bild, so wie ein Screenshot oder
   ein Foto sie liefert. Optional als PDF ohne Textschicht (Scan). */
async function bildErzeugen(browser, zeilen, ziel, alsScanPdf) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 520 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.setContent('<body style="margin:0;background:#fff;color:#111;font:15px system-ui;padding:16px">' + zeilen.map(z => '<p style="margin:9px 0">' + z + '</p>').join('') + '</body>');
  const png = await p.screenshot({ type: 'png' });
  if (!alsScanPdf) fs.writeFileSync(ziel, png);
  else {
    await p.setContent('<body style="margin:0"><img style="width:100%" src="data:image/png;base64,' + png.toString('base64') + '"></body>');
    await p.pdf({ path: ziel, format: 'A4' });
  }
  await ctx.close();
}
async function tippeReiter(page, id) { await page.click('.nav-btn[data-screen="' + id + '"]'); }
async function blattZu(page) { await page.waitForFunction(() => !document.getElementById('sheet').classList.contains('auf')); }
const feld = (page, k) => page.inputValue('#bf-' + k);

(async () => {
  const srv = await server();
  const basis = 'http://localhost:' + srv.address().port;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-test-'));
  const browser = await chromium.launch();
  const alleLogs = [];
  try {
    const hotelPdf = path.join(tmp, 'hotel-demo.pdf');
    await pdfErzeugen(browser, HOTEL, hotelPdf);
    const kaputtPdf = path.join(tmp, 'kaputt.pdf');
    fs.writeFileSync(kaputtPdf, Buffer.from('%PDF-1.4\nDas ist kein PDF, nur Text.\n%%EOF'));
    const leerPdf = path.join(tmp, 'ohne-text.pdf');
    await pdfErzeugen(browser, [], leerPdf);
    const bild = path.join(tmp, 'screenshot-demo.png');
    fs.writeFileSync(bild, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGNkYPj/n4GBgYGJAQoAHxcCAr7VvO4AAAAASUVORK5CYII=', 'base64'));

    const FAEHRE = ['Speedboat Ticket', 'Von: Pier Demo Nord', 'Nach: Insel Demo', 'Abfahrt: 30.12.2026 13:30', 'Ankunft: 14:45', 'Preis: 600 THB', 'Booking reference: FERRY-7781'];
    const FAEHRE2 = ['Ferry Ticket', 'Von: Pier Demo Süd', 'Nach: Insel Demo', 'Abfahrt: 03.01.2027 09:15', 'Preis: 450 THB', 'Booking reference: FERRY-9902'];
    const TOUR = ['Buchungsbestätigung Aktivität', 'Aktivität: Schnorcheltour Demo', 'Datum: 29.12.2026 08:30', 'Gesamtpreis: THB 1,800.00', 'Buchungsnummer: TOUR-5521'];
    const HOTEL2 = ['Buchungsbestätigung', 'Hotel: Lagunenhof Demo', 'Buchungsnummer: DEMO-330918', 'Check-in: 12.01.2027 ab 15:00', 'Check-out: 14.01.2027 bis 11:00', 'Gesamtpreis: CHF 180.00', 'bereits bezahlt'];
    const fotoFaehre = path.join(tmp, 'foto-faehre.png'), fotoFaehre2 = path.join(tmp, 'foto-faehre2.png'), fotoTour = path.join(tmp, 'geteilt-tour.png'), scanPdf = path.join(tmp, 'scan-hotel.pdf');
    await bildErzeugen(browser, FAEHRE, fotoFaehre);
    await bildErzeugen(browser, FAEHRE2, fotoFaehre2);
    await bildErzeugen(browser, TOUR, fotoTour);
    await bildErzeugen(browser, HOTEL2, scanPdf, true);

    /* ============ Hauptlauf: ein Fenster, die Szenarien der Reihe nach ============ */
    const f = await fenster(browser, basis, { sw: true });
    const page = f.page;
    alleLogs.push(['Hauptlauf', f.log]);

    /* --- Grundzustand --- */
    gleich('Start: Heute zeigt den Reisetag', await page.textContent('#todayHeading'), 'Heute');
    wahr('Start: Reiseplan gezeichnet', (await page.locator('#dayList .ort-card').count()) > 3);
    gleich('Start: alte Daten ohne Buchungen unverändert', await page.evaluate(() => [ansicht.length, appData.tage.length]), [28, 28]);
    gleich('Start: acht Dokumenten-Kacheln', await page.locator('#docTiles .doc-tile').count(), 8);
    gleich('Start: sechs Reiter in der Leiste', await page.locator('.nav .nav-btn .nav-label').allTextContents(), ['Heute', 'Reiseplan', 'Dokumente', 'Budget', 'Translator', 'Mehr']);
    gleich('Leiste bei 390 px: kein Überlauf, jeder Knopf gross genug, keine Beschriftung abgeschnitten', await page.evaluate(() => {
      const nav = document.querySelector('.nav'), k = Array.from(nav.querySelectorAll('.nav-btn'));
      return [nav.scrollWidth <= nav.clientWidth, k.every(b => b.getBoundingClientRect().height >= 44 && b.getBoundingClientRect().width >= 44),
        k.every(b => b.querySelector('.nav-label').getBoundingClientRect().width <= b.getBoundingClientRect().width + 0.5)];
    }), [true, true, true]);
    await tippeReiter(page, 'screenTools');
    gleich('Mehr: Regeln für unterwegs sind ausgeblendet, Notizen und Notfall da', [await page.isVisible('#regelnKarte'), await page.isVisible('#notizFeld'), await page.isVisible('#notPolizei'), await page.isVisible('#spendCard')], [false, true, true, false]);
    await tippeReiter(page, 'screenTranslator');
    gleich('Translator: eigener Reiter mit beiden Knöpfen', [await page.isVisible('#trDeEn'), await page.isVisible('#trDeTh')], [true, true]);
    await tippeReiter(page, 'screenBudget');
    gleich('Budget: Umrechner und Ausgaben stehen hier', [await page.isVisible('#thbInput'), await page.isVisible('#spendCard'), await page.isVisible('#histOeffnen')], [true, true, true]);

    /* --- Szenario 1: Hotel-PDF --- */
    await tippeReiter(page, 'screenPlan');
    await page.click('#planenBtn');
    await page.setInputFiles('#planenDatei', hotelPdf);
    await page.waitForSelector('#buchungOk');
    gleich('S1 Hotel-PDF: Art erkannt', await page.getAttribute('#artReihe .chip-wahl.an', 'data-typ'), 'unterkunft');
    gleich('S1 Hotel-PDF: Felder', [await feld(page, 'titel'), await feld(page, 'datum'), await feld(page, 'zeit'), await feld(page, 'bisDatum'),
      await feld(page, 'bisZeit'), await feld(page, 'preis'), await feld(page, 'waehrung'), await feld(page, 'referenz'), await feld(page, 'zahlung'), await feld(page, 'land')],
      ['Mangrovenblick Resort', '2027-01-02', '14:00', '2027-01-05', '11:00', '9600', 'THB', 'DEMO-771204', 'offen', 'TH']);
    wahr('S1 Hotel-PDF: fehlende Koordinaten bleiben leer', (await feld(page, 'gps')) === '');
    await page.click('#buchungOk');
    await blattZu(page);
    const b1 = await page.evaluate(() => appData.buchungen.map(b => ({ id: b.id, typ: b.typ, titel: b.titel, quelle: b.quelle.art, importiert: !!b.quelle.importiert, sicherPreis: b.quelle.sicher.preis })));
    gleich('S1: Buchung übernommen, Herkunft gespeichert', b1.map(b => [b.typ, b.titel, b.quelle, b.importiert, b.sicherPreis]), [['unterkunft', 'Mangrovenblick Resort', 'pdf', true, 'hoch']]);
    await page.waitForFunction(id => (dokIndex[id] || []).length === 1, b1[0].id);
    const dok1 = await page.evaluate(id => dokIndex[id].map(m => [m.name, m.typ, m.groesse > 500, !!m.hash]), b1[0].id);
    gleich('S1: PDF unverändert an der Buchung abgelegt', dok1, [['hotel-demo.pdf', 'application/pdf', true, true]]);
    gleich('S1: Originalgrösse erhalten', await page.evaluate(id => dokIndex[id][0].groesse, b1[0].id), fs.statSync(hotelPdf).size);
    const tag0201 = await page.evaluate(() => { const t = ansicht.find(x => x.datum === '2027-01-02'); return [t.hotel.name, t.hotel.checkin, !!t.hotel.buchungId]; });
    /* Die erfundene Demo-Reise hat an diesem Tag schon eine Unterkunft.
       Dann darf die Buchung sie nicht stillschweigend ersetzen. */
    wahr('S1: Tag zeigt die Buchung oder meldet den Widerspruch', tag0201[0] === 'Mangrovenblick Resort' ||
      await page.evaluate(() => ansicht.find(x => x.datum === '2027-01-02').hinweise.some(h => /Widerspruch/.test(h))));

    /* Beleg aus dem Dokumente-Reiter oeffnen: PDF-Vorschau in der App */
    await tippeReiter(page, 'screenTickets');
    await page.click('.doc-tile[data-kat="hotel"]');
    await page.click('#docPanel .dok-kachel');
    await page.waitForSelector('#dokVollFlaeche canvas');
    wahr('S1: PDF wird in der App gezeichnet', (await page.locator('#dokVollFlaeche canvas').count()) >= 1);
    wahr('S1: Seite hat Inhalt', await page.evaluate(() => { const c = document.querySelector('#dokVollFlaeche canvas'); return c.width > 300 && c.height > 300; }));
    await page.click('#dokVollZu');

    /* --- Szenario 2: Flug als Text, mit Zeitzonen --- */
    await tippeReiter(page, 'screenPlan');
    await page.click('#planenBtn');
    await page.fill('#planenText', FLUG);
    await page.click('#planenErkennen');
    await page.waitForSelector('#buchungOk');
    gleich('S2 Flug: Felder', [await page.getAttribute('#artReihe .chip-wahl.an', 'data-typ'), await feld(page, 'nummer'), await feld(page, 'vonCode'), await feld(page, 'nachCode'),
      await feld(page, 'datum'), await feld(page, 'zeit'), await feld(page, 'bisDatum'), await feld(page, 'bisZeit'), await feld(page, 'preis'), await feld(page, 'waehrung'), await feld(page, 'zahlung')],
      ['flug', 'ZB 902', 'ZRH', 'BKK', '2027-01-06', '17:30', '2027-01-07', '10:40', '950', 'CHF', 'bezahlt']);
    await page.click('#buchungOk');
    await blattZu(page);
    const flugTag = await page.evaluate(() => { const t = ansicht.find(x => x.datum === '2027-01-06'); return t.transfers.filter(x => x.buchungId).map(x => [x.typ, x.zeit, x.dauer, x.ankunft]); });
    gleich('S2: Flug im Tagesplan, Dauer über Zeitzonen gerechnet', flugTag, [['Flug', '17:30', '11 h 10 min', '10:40 am 7.1. Ortszeit']]);
    const idx = await page.evaluate(() => ansicht.findIndex(x => x.datum === '2027-01-06'));
    await page.evaluate(i => openDay(i), idx);
    wahr('S2: Tagesplan zeigt Dauer und Buchungsnummer', /11 h 10 min/.test(await page.textContent('#dayTimeline')) && /DEMO77/.test(await page.textContent('#dayTimeline')));

    /* --- Szenario 3: doppelter Import --- */
    await tippeReiter(page, 'screenPlan');
    await page.click('#planenBtn');
    await page.setInputFiles('#planenDatei', hotelPdf);
    await page.waitForSelector('#buchungOk');
    wahr('S3: Dublette wird gemeldet', await page.isVisible('#dubBox'));
    wahr('S3: Hinweis, dass die Datei schon da ist', /bereits in der Ablage/.test(await page.textContent('#sheet')));
    await page.click('#dubAktualisieren');
    await page.fill('#bf-notiz', 'Zimmer mit Blick auf die Mangroven');
    await page.click('#buchungOk');
    await blattZu(page);
    gleich('S3: keine zweite Buchung, Bestand aktualisiert', await page.evaluate(() => appData.buchungen.filter(b => b.typ === 'unterkunft').map(b => [b.titel, b.notiz, b.zahlung])),
      [['Mangrovenblick Resort', 'Zimmer mit Blick auf die Mangroven', 'offen']]);
    gleich('S3: Datei liegt nur einmal', await page.evaluate(() => Object.values(dokIndex).reduce((n, l) => n + l.length, 0)), 1);
    /* Derselbe Inhalt als Text, ohne Datei: wird ueber die Buchungsnummer erkannt */
    await page.click('#planenBtn');
    await page.fill('#planenText', HOTEL.join('\n'));
    await page.click('#planenErkennen');
    await page.waitForSelector('#buchungOk');
    wahr('S3: Dublette auch ohne Datei erkannt', await page.isVisible('#dubBox'));
    await page.click('#buchungOk');
    wahr('S3: ohne Entscheid wird nichts angelegt', await page.isVisible('#dubBox'));
    await page.click('#sheet .doc-panel-zu');
    await blattZu(page);
    gleich('S3: weiterhin zwei Buchungen', await page.evaluate(() => appData.buchungen.length), 2);

    /* --- Foto aufnehmen: sofort gespeichert, Text auf dem Geraet gelesen --- */
    await page.click('#planenBtn');
    wahr('Foto: eigener Knopf, Feld öffnet die Kamera', (await page.isVisible('#planenFoto')) && (await page.getAttribute('#planenKamera', 'capture')) === 'environment');
    await page.setInputFiles('#planenKamera', fotoFaehre);
    await page.waitForSelector('#leseStand');
    gleich('Foto: liegt schon im Eingang, während noch gelesen wird', await page.evaluate(() => (dokIndex.eingang || []).map(m => m.name)), ['foto-faehre.png']);
    await page.waitForSelector('#buchungOk', { timeout: 90000 });
    wahr('Foto: Worker laufen nur über Blob', page.workers().every(w => /^blob:/.test(w.url())));
    gleich('Foto: Text erkannt', [await page.getAttribute('#artReihe .chip-wahl.an', 'data-typ'), await feld(page, 'vonOrt'), await feld(page, 'nachOrt'), await feld(page, 'datum'),
      await feld(page, 'zeit'), await feld(page, 'bisZeit'), await feld(page, 'preis'), await feld(page, 'waehrung'), await feld(page, 'referenz')],
      ['faehre', 'Pier Demo Nord', 'Insel Demo', '2026-12-30', '13:30', '14:45', '600', 'THB', 'FERRY-7781']);
    wahr('Foto: aus dem Bild Gelesenes gilt nie als sicher', (await page.locator('#sheet .feld-marke.hoch').count()) === 0 && (await page.locator('#sheet .feld-marke.mittel').count()) >= 5);
    wahr('Foto: Hinweis auf mögliche Lesefehler', /aus einem Bild gelesen/.test(await page.textContent('#sheet')));
    await page.click('#buchungOk');
    await blattZu(page);
    gleich('Foto: nach dem Übernehmen an der Buchung, Eingang leer', await page.evaluate(() => { const b = appData.buchungen.find(x => x.referenz === 'FERRY-7781'); return [(dokIndex[b.id] || []).map(m => m.name), (dokIndex.eingang || []).length, b.quelle.art]; }),
      [['foto-faehre.png'], 0, 'bild']);
    gleich('Foto: Original unverändert gespeichert', await page.evaluate(() => { const b = appData.buchungen.find(x => x.referenz === 'FERRY-7781'); return [dokIndex[b.id][0].groesse, dokIndex[b.id][0].typ]; }), [fs.statSync(fotoFaehre).size, 'image/png']);

    /* Später zuordnen: der Beleg bleibt im Eingang und ist auf Heute und unter Dokumente sichtbar */
    await page.click('#planenBtn');
    await page.setInputFiles('#planenKamera', fotoFaehre2);
    await page.waitForSelector('#buchungOk', { timeout: 90000 });
    await page.click('#buchungSpaeter');
    await blattZu(page);
    gleich('Später zuordnen: keine Buchung, Beleg im Eingang', await page.evaluate(() => [appData.buchungen.some(b => b.referenz === 'FERRY-9902'), (dokIndex.eingang || []).length]), [false, 1]);
    await tippeReiter(page, 'screenToday');
    wahr('Heute: Zeile nennt den offenen Beleg', (await page.isVisible('#todayEingang')) && /1 Beleg noch nicht zugeordnet/.test(await page.textContent('#todayEingangTitel')));
    await page.click('#todayEingang');
    wahr('Dokumente: Eingang mit Knopf «Zuordnen»', await page.isVisible('#eingangPanel .eingang-zeile .btn'));
    gleich('Dokumente: Eingang gilt nicht als verwaiste Datei', /ohne Buchung/.test(await page.textContent('#ticketsList')), false);

    /* Gescanntes PDF ohne Textschicht: erste Seite wird als Bild gelesen */
    await tippeReiter(page, 'screenPlan');
    await page.click('#planenBtn');
    await page.setInputFiles('#planenDatei', scanPdf);
    await page.waitForSelector('#buchungOk', { timeout: 90000 });
    gleich('Scan-PDF: per Texterkennung gelesen', [await page.getAttribute('#artReihe .chip-wahl.an', 'data-typ'), await feld(page, 'titel'), await feld(page, 'datum'), await feld(page, 'bisDatum'),
      await feld(page, 'preis'), await feld(page, 'waehrung'), await feld(page, 'referenz'), await feld(page, 'zahlung')],
      ['unterkunft', 'Lagunenhof Demo', '2027-01-12', '2027-01-14', '180', 'CHF', 'DEMO-330918', 'bezahlt']);
    await page.selectOption('#bf-zahlung', 'storniert');
    await page.click('#buchungOk');
    await blattZu(page);

    /* --- Teilen aus einer anderen App: Datei, dann Link --- */
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20000 });
    const tourB64 = fs.readFileSync(fotoTour).toString('base64');
    const status = await page.evaluate(async b64 => {
      const roh = atob(b64), bytes = new Uint8Array(roh.length);
      for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
      const fd = new FormData();
      fd.append('files', new File([bytes], 'geteilt-tour.png', { type: 'image/png' }));
      const r = await fetch('./teilen', { method: 'POST', body: fd, redirect: 'manual' });
      return r.type;
    }, tourB64);
    gleich('Teilen: der Service Worker nimmt an und leitet in die App', status, 'opaqueredirect');
    gleich('Teilen: wartet lokal, bis die App es abholt', await page.evaluate(async () => (await (await caches.open('teilen-eingang')).keys()).length), 1);
    await page.evaluate(() => { teilenAbholen(); });
    await page.waitForSelector('#buchungOk', { timeout: 90000 });
    gleich('Teilen: Datei gespeichert, gelesen und als Buchung vorgeschlagen', [await page.getAttribute('#artReihe .chip-wahl.an', 'data-typ'), await feld(page, 'titel'), await feld(page, 'datum'), await feld(page, 'zeit'), await feld(page, 'preis'), await feld(page, 'referenz')],
      ['aktivitaet', 'Schnorcheltour Demo', '2026-12-29', '08:30', '1800', 'TOUR-5521']);
    gleich('Teilen: Zwischenspeicher ist danach leer', await page.evaluate(async () => (await (await caches.open('teilen-eingang')).keys()).length), 0);
    await page.selectOption('#bf-zahlung', 'storniert');
    await page.click('#buchungOk');
    await blattZu(page);
    await page.evaluate(async () => {
      const fd = new FormData();
      fd.append('title', 'Hotel Demo');
      fd.append('url', 'https://www.booking.com/hotel/xx/geteilt.html');
      await fetch('./teilen', { method: 'POST', body: fd, redirect: 'manual' });
      await teilenAbholen();
    });
    await page.waitForSelector('#buchungOk');
    gleich('Teilen: ein Link kommt als Link an', [await feld(page, 'link'), await feld(page, 'anbieter')], ['https://www.booking.com/hotel/xx/geteilt.html', 'Booking.com']);
    await page.click('#buchungSpaeter'); await blattZu(page);

    /* Die Sicherheitsregel gilt im Worker: ein Blob-Worker erreicht keinen dritten Host */
    const leck = await page.evaluate(() => new Promise(fertig => {
      const w = new Worker(URL.createObjectURL(new Blob(["fetch('https://dritter-host.example/leck').then(() => postMessage('GESENDET')).catch(() => postMessage('blockiert'))"], { type: 'text/javascript' })));
      w.onmessage = e => fertig(e.data);
      setTimeout(() => fertig('keine Antwort'), 5000);
    }));
    gleich('Sicherheitsregel gilt auch im Hintergrund-Skript', leck, 'blockiert');

    /* --- Fehlerhafte und unvollstaendige Eingaben --- */
    await page.click('#planenBtn');
    await page.setInputFiles('#planenDatei', kaputtPdf);
    await page.waitForSelector('#buchungOk');
    wahr('Kaputtes PDF: verständliche Meldung, kein Absturz', /liess sich nicht lesen|keinen lesbaren Text/.test(await page.textContent('#sheet .hinweis-box')));
    await page.click('#sheet .doc-panel-zu'); await blattZu(page);

    await page.click('#planenBtn');
    await page.setInputFiles('#planenDatei', leerPdf);
    await page.waitForSelector('#buchungOk', { timeout: 90000 });
    wahr('PDF ohne Text: Hinweis auf Scan', /keinen lesbaren Text/.test(await page.textContent('#sheet .hinweis-box')));
    await page.click('#sheet .doc-panel-zu'); await blattZu(page);

    await page.click('#planenBtn');
    await page.fill('#planenText', 'https://www.booking.com/hotel/xx/demo.html');
    await page.click('#planenErkennen');
    await page.waitForSelector('#buchungOk');
    wahr('Link: Alternative wird angeboten', /Text der Bestätigung einfügen oder das PDF wählen/.test(await page.textContent('#sheet .hinweis-box')));
    gleich('Link: gespeichert wird nur der Link, nichts Erfundenes', [await feld(page, 'link'), await feld(page, 'datum'), await feld(page, 'titel')], ['https://www.booking.com/hotel/xx/demo.html', '', '']);
    await page.click('#sheet .doc-panel-zu'); await blattZu(page);

    /* Screenshot: wird Beleg, Felder von Hand, als geplant markiert */
    await page.click('#planenBtn');
    await page.setInputFiles('#planenDatei', bild);
    await page.waitForSelector('#buchungOk', { timeout: 90000 });
    wahr('Bild ohne Text: verständlicher Hinweis, Beleg bleibt gespeichert', /kein Text erkannt|Texterkennung steht gerade nicht/.test(await page.textContent('#sheet .hinweis-box')));
    await page.click('#artReihe .chip-wahl[data-typ="aktivitaet"]');
    await page.fill('#bf-titel', 'Kochkurs Demo');
    await page.fill('#bf-datum', '2026-12-24');
    await page.fill('#bf-zeit', '16:00');
    await page.fill('#bf-preis', '1200');
    await page.selectOption('#bf-waehrung', 'THB');
    await page.click('#sheet .chip-wahl[data-status="geplant"]');
    await page.click('#buchungOk');
    await blattZu(page);
    await tippeReiter(page, 'screenToday');
    wahr('Heute: geplante Aktivität erscheint, als geplant markiert', /16:00/.test(await page.textContent('#todayProgramm')) && /geplant/.test(await page.textContent('#todayProgramm')));

    /* Widerspruechliche Daten: Ende vor Anfang wird abgewiesen */
    await tippeReiter(page, 'screenPlan');
    await page.click('#planenBtn');
    await page.click('#sheet .chip-reihe .chip-wahl >> text=Unterkunft');
    await page.waitForSelector('#buchungOk');
    await page.fill('#bf-titel', 'Hotel Rückwärts');
    await page.fill('#bf-datum', '2027-01-12');
    await page.fill('#bf-bisDatum', '2027-01-06');
    const vorDialog = f.log.dialoge.length;
    await page.click('#buchungOk');
    wahr('Widerspruch: Enddatum vor Anfangsdatum wird abgewiesen', /Enddatum liegt vor dem Anfangsdatum/.test(f.log.dialoge[vorDialog] || ''));
    await page.click('#sheet .doc-panel-zu'); await blattZu(page);
    gleich('Widerspruch: nichts gespeichert', await page.evaluate(() => appData.buchungen.length), 6);

    /* --- Szenario 5: Thailand, dann Japan --- */
    await tippeReiter(page, 'screenBudget');
    await page.waitForFunction(() => /Referenzkurs|eigener Kurs/.test(document.getElementById('kursInfo').textContent));
    gleich('S5: Land und Währung aus der Reise', [await page.inputValue('#landWahl'), await page.inputValue('#waehrungWahl')], ['TH', 'THB']);
    wahr('S5: bisheriger Kurs 40 gilt weiter, als eigener Kurs ausgewiesen', /1 CHF = 40 THB · eigener Kurs/.test(await page.textContent('#kursInfo')));
    await page.fill('#spendAmount', '500');
    await page.click('#catGrid .cat-btn >> nth=0', { position: { x: 20, y: 40 } });
    gleich('S5: 500 THB gebucht', await page.evaluate(() => ausgaben.map(e => [e.betrag, e.waehrung, e.kurs, e.chf, e.chfArt, e.kategorie, e.tag, e.land])),
      [[500, 'THB', 40, 12.5, 'geschaetzt', 'Essen', '2026-12-24', 'TH']]);
    await page.selectOption('#landWahl', 'JP');
    gleich('S5: Japan gewählt, Währung folgt', await page.inputValue('#waehrungWahl'), 'JPY');
    await page.waitForFunction(() => /172 JPY · Referenzkurs vom 23\.12\.2026/.test(document.getElementById('kursInfo').textContent));
    gleich('S5: Einheit im Ausgabenfeld', await page.textContent('#spendUnit'), 'JPY');
    await page.fill('#spendAmount', '3440');
    await page.click('#catGrid .cat-btn >> nth=1', { position: { x: 20, y: 40 } });
    gleich('S5: 3440 JPY gebucht, THB-Ausgabe unverändert', await page.evaluate(() => ausgaben.map(e => [e.betrag, e.waehrung, e.chf, e.kursArt])),
      [[500, 'THB', 12.5, 'eigen'], [3440, 'JPY', 20, 'dienst']]);
    gleich('S5: Gesamtsumme in CHF', await page.textContent('#spendTotal'), '32.50 CHF');
    wahr('S5: Summen je Währung', /500 THB/.test(await page.textContent('#spendTotalThb')) && /3’440 JPY|3'440 JPY/.test(await page.textContent('#spendTotalThb')));
    /* Neuer Kurs fuer Baht: alte Ausgabe darf sich nicht bewegen */
    await page.selectOption('#landWahl', 'TH');
    await page.click('#kursEigen');
    await page.fill('#kursFeld', '30');
    await page.click('#kursSpeichern');
    await blattZu(page);
    wahr('S5: neuer eigener Kurs gilt', /1 CHF = 30 THB/.test(await page.textContent('#kursInfo')));
    gleich('S5: alte Ausgabe behält ihren Franken-Betrag', await page.evaluate(() => ausgaben[0].chf), 12.5);
    await page.fill('#spendAmount', '300');
    await page.click('#catGrid .cat-btn >> nth=0', { position: { x: 20, y: 40 } });
    gleich('S5: neue Ausgabe rechnet mit dem neuen Kurs', await page.evaluate(() => [ausgaben[2].chf, ausgaben[2].kurs]), [10, 30]);
    /* Tatsaechlich bezahlter Betrag ersetzt die Schaetzung */
    await page.click('#histOeffnen');
    await page.click('#sheet .hist-eintrag >> nth=0');
    await page.waitForSelector('#blattEcht');
    await page.fill('#blattEcht', '10.85');
    await page.click('#blattOk');
    await page.waitForFunction(() => ausgaben.some(e => e.chfArt === 'bezahlt'));
    gleich('S5: bezahlter Betrag geht vor', await page.evaluate(() => { const e = ausgaben.find(x => x.chfArt === 'bezahlt'); return [e.betrag, e.chf]; }), [300, 10.85]);
    await page.waitForSelector('#sheet .hist-eintrag');
    await page.click('#sheet .doc-panel-zu'); await blattZu(page);
    /* Waehrung ohne Kurs: es wird nicht gebucht statt geraten */
    await page.selectOption('#waehrungWahl', 'VND');
    await page.fill('#spendAmount', '100000');
    const vd = f.log.dialoge.length;
    await page.click('#catGrid .cat-btn >> nth=0', { position: { x: 20, y: 40 } });
    wahr('S5: ohne Kurs wird nicht gebucht', /kein Kurs hinterlegt/.test(f.log.dialoge[vd] || '') && (await page.evaluate(() => ausgaben.length)) === 3);
    await page.selectOption('#landWahl', 'TH');

    /* --- Szenario 6: Budget und Reiseabschluss --- */
    await tippeReiter(page, 'screenBudget');
    await page.click('#zkBudget');
    await page.fill('#budgetFeld', '3000');
    await page.click('#budgetSpeichern');
    await blattZu(page);
    const soll = await page.evaluate(() => { const a = Kern.abrechnung(appData, ausgaben, kurse); return [a.bezahltBuchungen, a.unterwegs, a.tatsaechlich, a.offen, a.geplant, a.gesamt, a.verbleibend]; });
    /* Hotel 9600 THB offen zu Kurs 30 = 320. Flug 950 CHF bezahlt.
       Kochkurs 1200 THB geplant = 40. Fähre 600 THB offen = 20.
       Unterwegs 12.50 + 20 + 10.85. Die zwei stornierten Buchungen
       zaehlen nicht. */
    gleich('S6: Abrechnung ohne doppelte Kosten', soll, [950, 43.35, 993.35, 340, 40, 1373.35, 1626.65]);
    /* Das Tausender-Zeichen haengt vom Browser ab, gerade oder typografisch. */
    gleich('S6: Anzeige stimmt mit der Rechnung überein', [await page.textContent('#zwBezahlt'), await page.textContent('#zwOffen'), (await page.textContent('#zwVerbleibend')).replace('’', "'")],
      ['993.35', '380.00', "1'626.65"]);
    const vorEnde = await page.evaluate(() => [appData.buchungen.length, ausgaben.length, Object.values(dokIndex).reduce((n, l) => n + l.length, 0), appData.tage.length]);
    await page.click('#reiseEndeBtn');
    await page.waitForSelector('#abgeschlossenBand');
    gleich('S6: Reise als abgeschlossen markiert', await page.evaluate(() => [appData.reise.status, appData.reise.abgeschlossenAm]), ['abgeschlossen', '2026-12-24']);
    gleich('S6: nichts gelöscht', await page.evaluate(() => [appData.buchungen.length, ausgaben.length, Object.values(dokIndex).reduce((n, l) => n + l.length, 0), appData.tage.length]), vorEnde);
    /* Bezahlen ist ein Zustandswechsel: die Gesamtsumme bleibt gleich */
    await page.evaluate(() => buchungBlatt({ buchung: appData.buchungen.find(b => b.typ === 'unterkunft') }));
    await page.selectOption('#bf-zahlung', 'bezahlt');
    await page.click('#buchungOk');
    await blattZu(page);
    gleich('S6: nach dem Bezahlen gleiche Gesamtsumme, nichts doppelt', await page.evaluate(() => { const a = Kern.abrechnung(appData, ausgaben, kurse); return [a.gesamt, a.offen, a.geplant, a.bezahltBuchungen]; }), [1373.35, 20, 40, 1270]);
    /* CSV */
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#budgetInhalt .btn >> text=CSV exportieren')]);
    const csvPfad = path.join(tmp, 'kosten.csv');
    await dl.saveAs(csvPfad);
    const csv = fs.readFileSync(csvPfad, 'utf8').split('\r\n').filter(Boolean);
    gleich('S6: CSV hat Kopf und alle Posten', [csv[0].replace('﻿', '').split(';').length, csv.length - 1], [12, 9]);
    wahr('S6: CSV enthält Hotel und Ausgaben', csv.some(z => /Mangrovenblick Resort/.test(z) && /320\.00/.test(z)) && csv.some(z => /;Ausgabe;Essen;/.test(z)));
    /* Reisebericht fuer den Druck */
    await page.evaluate(() => { window.print = () => { window.__gedruckt = true; }; });
    await page.click('#budgetInhalt .btn >> text=Reisebericht drucken');
    const bericht = await page.textContent('#druckBericht');
    wahr('S6: Reisebericht mit Route, Unterkünften und Summe', await page.evaluate(() => window.__gedruckt) && /Kosten nach Kategorie/.test(bericht) && /Mangrovenblick Resort/.test(bericht) && /1’373\.35|1'373\.35/.test(bericht));
    /* Wieder oeffnen */
    await page.click('#reiseEndeBtn');
    await page.waitForFunction(() => appData.reise.status === 'aktiv');
    gleich('S6: Reise lässt sich wieder öffnen', await page.isVisible('#abgeschlossenBand'), false);

    /* --- Bedienbarkeit auf dem Handy: nichts läuft seitlich aus dem Bild --- */
    for (const id of ['screenToday', 'screenPlan', 'screenTickets', 'screenBudget', 'screenTranslator', 'screenTools']) {
      await page.evaluate(s => showScreen(s), id);
      const breit = await page.evaluate(s => { const e = document.getElementById(s); return [e.scrollWidth <= e.clientWidth + 1, document.documentElement.scrollWidth <= 391]; }, id);
      gleich('Handy 390 px, kein seitlicher Überlauf: ' + id, breit, [true, true]);
    }

    /* --- Szenario 4: offline --- */
    await page.evaluate(() => navigator.serviceWorker.ready);
    /* Die Bibliotheken holt die Seite selbst in den Offline-Speicher
       und merkt sich das. Erst danach darf das Netz weg. */
    await page.waitForFunction(async () => {
      return localStorage.getItem('reisebegleiter_vendor') === '7.0.0' && !!(await caches.match('./index.html')) &&
        !!(await caches.match('./vendor/pdf.worker.min.js')) && !!(await caches.match('./vendor/ocr/lang/deu.traineddata.gz'));
    }, null, { timeout: 60000 });
    await f.ctx.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => typeof appData !== 'undefined' && appData && document.getElementById('dayList').children.length > 0);
    await page.waitForFunction(() => Object.keys(dokIndex).length > 0);
    gleich('S4 offline: Reiseplan, Buchungen, Ausgaben und Belege sind da',
      await page.evaluate(() => [ansicht.length >= 28, appData.buchungen.length, ausgaben.length, Object.values(dokIndex).reduce((n, l) => n + l.length, 0) >= 4]), [true, 6, 3, true]);
    wahr('S4 offline: Anzeige "offline"', await page.isVisible('#offlineBadge.show'));
    await tippeReiter(page, 'screenBudget');
    wahr('S4 offline: Kurs gilt weiter, mit Stand', /Referenzkurs vom 23\.12\.2026|eigener Kurs/.test(await page.textContent('#kursInfo')));
    await page.fill('#spendAmount', '90');
    await page.click('#catGrid .cat-btn >> nth=0', { position: { x: 20, y: 40 } });
    gleich('S4 offline: Ausgabe erfassen geht', await page.evaluate(() => ausgaben.length), 4);
    /* Texterkennung ohne Netz: ein Beleg aus dem Eingang wird gelesen */
    await tippeReiter(page, 'screenTickets');
    await page.click('#eingangPanel .eingang-zeile:has-text("foto-faehre2.png") .btn');
    await page.waitForSelector('#buchungOk', { timeout: 90000 });
    gleich('S4 offline: Texterkennung läuft aus dem Gerätespeicher', [await feld(page, 'vonOrt'), await feld(page, 'nachOrt'), await feld(page, 'datum')], ['Pier Demo Süd', 'Insel Demo', '2027-01-03']);
    await page.click('#buchungSpaeter'); await blattZu(page);
    wahr('S4 offline: Budget wird gerechnet', /\d/.test(await page.textContent('#zwBezahlt')));
    await tippeReiter(page, 'screenTickets');
    await page.click('.doc-tile[data-kat="hotel"]');
    await page.click('#docPanel .dok-kachel');
    await page.waitForSelector('#dokVollFlaeche canvas');
    wahr('S4 offline: PDF öffnet aus dem Gerätespeicher', (await page.locator('#dokVollFlaeche canvas').count()) >= 1);
    await page.click('#dokVollZu');
    await f.ctx.setOffline(false);

    /* --- Netz: nur die zwei erlaubten Hosts, nur die erlaubten Angaben --- */
    gleich('Netz: keine Anfrage an einen dritten Host', f.log.fremd.filter(h => ERLAUBT.indexOf(h) === -1), []);
    gleich('Netz: Kursabfrage nennt nur die Heimatwährung', f.log.kursAbfragen.filter((v, i, a) => a.indexOf(v) === i), ['/v1/latest?base=CHF']);
    wahr('Netz: Wetter nur mit gerundeten Koordinaten', f.log.wetterAbfragen.length > 0 && f.log.wetterAbfragen.every(q => {
      const p = new URLSearchParams(q);
      return /^-?\d+(\.\d)?$/.test(p.get('latitude')) && /^-?\d+(\.\d)?$/.test(p.get('longitude')) &&
        Array.from(p.keys()).sort().join() === 'current,daily,forecast_days,latitude,longitude,timezone';
    }));
    gleich('Netz: fremde Kursangaben werden verworfen', await page.evaluate(() => Object.keys(kurse.dienst.kurse).sort()), ['EUR', 'JPY', 'THB']);
    await f.ctx.close();

    /* ============ Kursdienst nicht erreichbar ============ */
    const g = await fenster(browser, basis, { kursAus: true, erwarteteFehler: /Failed to load resource|net::ERR/ });
    alleLogs.push(['Kursdienst aus', g.log]);
    await tippeReiter(g.page, 'screenBudget');
    await g.page.click('#kursHolen');
    await g.page.waitForFunction(() => /konnte nicht geholt werden/.test(document.getElementById('kursInfo').textContent));
    wahr('Kursdienst aus: Meldung, und der eigene Kurs gilt weiter', /1 CHF = 40 THB/.test(await g.page.textContent('#kursInfo')));
    await g.page.fill('#spendAmount', '400');
    await g.page.click('#catGrid .cat-btn >> nth=0', { position: { x: 20, y: 40 } });
    gleich('Kursdienst aus: Ausgabe wird trotzdem gebucht', await g.page.evaluate(() => ausgaben.map(e => e.chf)), [10]);
    await g.ctx.close();

    /* ============ Bestehende Daten: Umstellung ohne Verlust ============ */
    const altAusgaben = [{ betrag: 450, kategorie: 'Essen', notiz: 'Abendessen', ts: new Date(2026, 11, 22, 19, 30).getTime() },
      { betrag: 60, kategorie: 'Aktivität', unter: 'Jetski', notiz: '', ts: new Date(2026, 11, 23, 11, 0).getTime() }];
    const altPlan = {
      datenstand: { quelle: 'Test', stand: '2026-11-01' }, reise: { titel: 'Alt-Reise Demo', start: '2026-12-20', ende: '2026-12-26', zeitzone: 'Asia/Bangkok' },
      tage: ['2026-12-24', '2026-12-25', '2026-12-26'].map(d => ({ datum: d, wochentag: '', ort: 'Insel Demo',
        hotel: { name: 'Sandmond Resort', adresse: 'Nordstrand', tel: '+66 80 000 77 88', gps: '7.41,99.21', checkin: '14:00', foto: 'data:image/png;base64,AAAA' }, transfer: null, hinweise: [], programm: [] })),
      tickets: [{ id: 'boot-demo', gruppe: 'Boote & Fähren', titel: 'Boot Demo', info: '24.12. 10:00', status: 'fehlt', abDatum: '2026-12-24' }],
      budget: { gesamt_chf: 500 }
    };
    const m = await fenster(browser, basis, { vorher: 'if (!localStorage.getItem("reisebegleiter_data")) { localStorage.setItem("reisebegleiter_data", ' + JSON.stringify(JSON.stringify(altPlan)) +
      '); localStorage.setItem("reisebegleiter_ausgaben", ' + JSON.stringify(JSON.stringify(altAusgaben)) + '); }' });
    alleLogs.push(['Umstellung', m.log]);
    gleich('Umstellung: alte Ausgaben in neuer Form, Betrag unverändert',
      await m.page.evaluate(() => ausgaben.map(e => [e.betrag, e.waehrung, e.chf, e.chfArt, e.kategorie, e.notiz, e.tag])),
      [[450, 'THB', 11.25, 'geschaetzt', 'Essen', 'Abendessen', '2026-12-22'], [60, 'THB', 1.5, 'geschaetzt', 'Aktivitäten', 'Jetski', '2026-12-23']]);
    gleich('Umstellung: Sicherungskopien liegen vor', await m.page.evaluate(() => [JSON.parse(localStorage.getItem('reisebegleiter_ausgaben_vor_v2')).length,
      JSON.parse(localStorage.getItem('reisebegleiter_data_vor_v2')).tage.length]), [2, 3]);
    gleich('Umstellung: Hotelfoto einmal statt dreimal', await m.page.evaluate(() => [Object.keys(appData.fotos), appData.tage.filter(t => t.hotel.foto).length, appData.schema]), [['Sandmond Resort'], 0, 2]);
    gleich('Umstellung: Reiseplan unverändert lesbar', await m.page.evaluate(() => [ansicht.length, ansicht[0].hotel.name, alleTickets().length]), [3, 'Sandmond Resort', 1]);
    wahr('Umstellung: Budget aus den Reisedaten wird jetzt angezeigt', /von 500\.00 CHF/.test(await m.page.textContent('#todayBudgetSub')));
    /* Ein Import der Reiseplan-Datei darf in der App erfasste
       Buchungen nicht wegwischen. */
    await m.page.click('.nav-btn[data-screen="screenPlan"]');
    await m.page.click('#planenBtn');
    await m.page.click('#sheet .chip-reihe .chip-wahl >> text=Aktivität');
    await m.page.waitForSelector('#buchungOk');
    await m.page.fill('#bf-titel', 'Schnorcheltour Demo');
    await m.page.fill('#bf-datum', '2026-12-25');
    await m.page.click('#buchungOk');
    await m.page.waitForFunction(() => !document.getElementById('sheet').classList.contains('auf'));
    const planDatei = path.join(tmp, 'reiseplan-demo.json');
    const neuerPlan = JSON.parse(JSON.stringify(altPlan));
    neuerPlan.tage.push({ datum: '2026-12-27', ort: 'Insel Demo', hotel: { name: 'Sandmond Resort' }, transfer: null, hinweise: [], programm: [] });
    delete neuerPlan.budget;
    fs.writeFileSync(planDatei, JSON.stringify(neuerPlan));
    await m.page.setInputFiles('#importInput', planDatei);
    await m.page.waitForFunction(() => appData.tage.length === 4);
    gleich('Import der Datei: Buchungen und Budget aus der App bleiben', await m.page.evaluate(() => [appData.buchungen.map(b => b.titel), appData.budget.gesamt_chf, appData.schema]), [['Schnorcheltour Demo'], 500, 2]);
    wahr('Import der Datei: Meldung nennt die erhaltene Buchung', m.log.dialoge.some(d => /1 in der App erfasste Buchung ist erhalten/.test(d)));
    /* Eine Datei mit unsauberen Buchungen wird geprueft, nicht geglaubt */
    neuerPlan.buchungen = [{ typ: 'flug', datum: '2026-02-30', zeit: '99:99', nummer: 'ZB 1', waehrung: 'chf', preis: 'abc', unbekanntesFeld: '<script>' }, null, 'x'];
    fs.writeFileSync(planDatei, JSON.stringify(neuerPlan));
    await m.page.setInputFiles('#importInput', planDatei);
    await m.page.waitForFunction(() => appData.buchungen.length === 1 && appData.buchungen[0].typ === 'flug');
    gleich('Import der Datei: Buchungen werden geprüft', await m.page.evaluate(() => { const b = appData.buchungen[0]; return [b.datum, b.zeit, b.nummer, b.waehrung, b.preis, b.unbekanntesFeld]; }),
      [null, null, 'ZB 1', 'CHF', null, null].map(x => x === null ? undefined : x));
    await m.page.reload();
    await m.page.waitForFunction(() => typeof appData !== 'undefined' && appData && document.getElementById('dayList').children.length > 0);
    gleich('Umstellung: nach Neustart stabil', await m.page.evaluate(() => [ausgaben.length, ausgaben[0].chf, ausgaben[0].id.length > 3]), [2, 11.25, true]);
    await m.ctx.close();

    /* ============ Vor der Reise ============ */
    const v = await fenster(browser, basis, { zeit: '2026-11-12T10:00:00' });
    alleLogs.push(['Vor der Reise', v.log]);
    wahr('Vor der Reise: Countdown statt Reisetag', /^Noch \d+ Tage$/.test(await v.page.textContent('#todayHeading')));
    wahr('Vor der Reise: Einstieg «Reise planen» auf Heute', await v.page.isVisible('#vorReiseListe .btn >> text=Reise planen'));
    await v.ctx.close();

    alleLogs.forEach(p => gleich('Keine Konsolenfehler, keine CSP-Verletzung: ' + p[0], p[1].fehler, []));
  } catch (e) {
    fehler++;
    console.error('ABBRUCH  ' + (e && e.stack || e));
    alleLogs.forEach(p => { if (p[1].fehler.length) console.error('Konsole ' + p[0] + ':', p[1].fehler); if (p[1].dialoge.length) console.error('Dialoge ' + p[0] + ':', p[1].dialoge.slice(-3)); });
  } finally {
    await browser.close();
    srv.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(ok + ' Prüfungen bestanden, ' + fehler + ' fehlgeschlagen');
  process.exit(fehler ? 1 : 0);
})();
