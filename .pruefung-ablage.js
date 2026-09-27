/* Einmalige Pruefung der Dokumenten-Ablage. Keine Reisedaten.
   Startet Edge fern gesteuert, laedt die App, legt ein erfundenes
   Bild ab und liest danach den Zustand zurueck.

   Aufruf: node .pruefung-ablage.js
   Die Datei ist ein Werkzeug, kein Teil der App. */
const { spawn } = require('child_process');
const http = require('http');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9333;
const ZIEL = 'http://localhost:8123/index.html';

function warte(ms) { return new Promise(r => setTimeout(r, ms)); }

function holeJson(pfad) {
  return new Promise((ok, fehler) => {
    http.get({ host: '127.0.0.1', port: PORT, path: pfad }, res => {
      let t = '';
      res.on('data', d => t += d);
      res.on('end', () => { try { ok(JSON.parse(t)); } catch(e) { fehler(e); } });
    }).on('error', fehler);
  });
}

(async () => {
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + require('os').tmpdir() + '\\edgepruef',
    'about:blank'
  ], { stdio: 'ignore' });

  let ziele = null;
  for (let i = 0; i < 40 && !ziele; i++) {
    await warte(250);
    try { ziele = await holeJson('/json/list'); } catch(e) {}
  }
  if (!ziele) { console.log('FEHLER: Edge antwortet nicht auf dem Debug-Port'); edge.kill(); process.exit(1); }

  const seite = ziele.find(z => z.type === 'page');
  const ws = new WebSocket(seite.webSocketDebuggerUrl);
  let nr = 0;
  const offen = new Map();
  const meldungen = [];

  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && offen.has(m.id)) { offen.get(m.id)(m); offen.delete(m.id); return; }
    /* Nur die Art der Meldung, nie ihr Inhalt. Die App schreibt beim
       Laden den Reisetitel in die Konsole. Wuerde dieses Werkzeug das
       durchreichen, landeten Reisedaten in der Pruefausgabe und damit
       moeglicherweise in einem Chat oder Log. Bei einem Fehler zaehlt
       die Stelle, nicht der Wert. */
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      meldungen.push('Konsolen-Fehler (Inhalt unterdrueckt, Datenschutz)');
    }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      const text = String((d.exception ? d.exception.description : d.text) || '');
      /* Nur die erste Zeile plus Ort. Ein Stapelabzug kann Werte
         enthalten, eine Fehlerart nicht. */
      meldungen.push('AUSNAHME: ' + text.split('\n')[0] +
        ' (Zeile ' + ((d.lineNumber || 0) + 1) + ')');
    }
  });

  function ruf(method, params) {
    return new Promise(ok => { const id = ++nr; offen.set(id, ok); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  }
  async function js(ausdruck) {
    const a = await ruf('Runtime.evaluate', { expression: ausdruck, awaitPromise: true, returnByValue: true });
    if (a.result && a.result.exceptionDetails) return { fehler: a.result.exceptionDetails.text + ' ' + (a.result.exceptionDetails.exception || {}).description };
    return { wert: a.result && a.result.result ? a.result.result.value : undefined };
  }

  await new Promise(r => ws.addEventListener('open', r));
  await ruf('Runtime.enable');
  await ruf('Page.enable');
  await ruf('Page.navigate', { url: ZIEL });
  await warte(4000);

  const zeig = (name, e) => console.log(name + ': ' + (e.fehler ? 'FEHLER ' + e.fehler : JSON.stringify(e.wert)));

  console.log('=== Zustand nach dem Start ===');
  zeig('Tickets in den Daten', await js('(appData.tickets||[]).length'));
  zeig('Ablage defekt', await js('dokAblageDefekt'));
  zeig('Speicherzeile', await js("document.getElementById('speicherZeile').textContent"));
  zeig('Dauerhafter Speicher', await js('speicherLage && speicherLage.dauerhaft'));
  zeig('Hotel-Buchungen in tickets', await js("(appData.tickets||[]).filter(t=>ticketKat(t.gruppe)==='hotel').length"));

  console.log('\n=== Ablegen eines erfundenen Bildes ===');
  const ablegen = await js(`(async () => {
    const c = document.createElement('canvas'); c.width = 2400; c.height = 1600;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0,0,2400,1600);
    g.fillStyle = '#000000'; g.font = '80px sans-serif'; g.fillText('PRUEFBILD', 100, 200);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const datei = new File([blob], 'pruefbild.png', { type: 'image/png' });
    const zielId = appData.tickets[0].id;
    const meta = await dokSpeichern(zielId, datei);
    return { name: meta.name, typ: meta.typ, kb: Math.round(meta.groesse/1024), originalKb: Math.round(datei.size/1024) };
  })()`);
  zeig('Abgelegt', ablegen);

  console.log('\n=== Kommt es zurueck? ===');
  zeig('Im Index', await js("dokListe(appData.tickets[0].id).length"));
  zeig('Blob wirklich lesbar', await js("(async()=>{const l=dokListe(appData.tickets[0].id);const b=await dokBlob(l[0].id);return b?b.size+' Bytes, '+b.type:'NICHTS';})()"));
  zeig('Index neu aus der Datenbank', await js("(async()=>{await dokIndexLaden();return Object.keys(dokIndex).length+' Buchung(en), '+Object.values(dokIndex).reduce((n,l)=>n+l.length,0)+' Datei(en)';})()"));
  zeig('Statuszeile', await js("(()=>{renderDokumente();return ticketStatusZeile(appData.tickets[0]);})()"));
  zeig('Speicherzeile jetzt', await js("(async()=>{await speicherPruefen();renderSpeicherLage();return document.getElementById('speicherZeile').textContent;})()"));

  console.log('\n=== Sicherung und Rueckweg ===');
  zeig('Export-Runde', await js(`(async () => {
    const alle = []; Object.keys(dokIndex).forEach(k => dokIndex[k].forEach(m => alle.push(m)));
    const b = await dokBlob(alle[0].id);
    const b64 = await blobNachBase64(b);
    const zurueck = base64NachBlob(b64, alle[0].typ);
    return { original: b.size, base64Zeichen: b64.length, zurueck: zurueck.size, gleich: zurueck.size === b.size };
  })()`));

  console.log('\n=== Aufraeumen ===');
  zeig('Geloescht', await js("(async()=>{const l=dokListe(appData.tickets[0].id);await dokLoeschen(l[0].id, appData.tickets[0].id);return dokListe(appData.tickets[0].id).length;})()"));

  console.log('\n=== Meldungen aus der Konsole ===');
  console.log(meldungen.length ? meldungen.join('\n') : '(keine)');

  ws.close();
  edge.kill();
  process.exit(0);
})();
