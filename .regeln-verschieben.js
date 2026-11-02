#!/usr/bin/env node
/* Hinweise aufraeumen: allgemeine Regeln raus aus den einzelnen Tagen,
   rein in den Block "regeln".
   ---------------------------------------------------------------
   Warum es dieses Skript gibt: Saetze wie "immer in THB abrechnen"
   gelten an jedem Tag. Stehen sie in tage[].hinweise, verdraengen sie
   das, was nur heute gilt, zum Beispiel "vorher Geld holen". Die App
   zeigt den Block "regeln" einmal unter Mehr und nie im Tagesplan.

   Datenschutz: Dieses Skript laeuft lokal und sendet nichts. Die
   Liste, die es anzeigt, enthaelt echte Reisedaten. Sie gehoert in
   kein Chatfenster, in keinen Commit und in kein Protokoll.

   Anzeigen:
     node .regeln-verschieben.js
   Verschieben (Nummern aus der Liste):
     node .regeln-verschieben.js 2 3 4 5
   Andere Datei:
     node .regeln-verschieben.js --datei=reisedaten-test.json 2 3
*/

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dateiArg = args.find(a => a.startsWith('--datei='));
const datei = path.resolve(__dirname, dateiArg ? dateiArg.slice(8) : 'reisedaten-thailand.json');
const nummern = args.filter(a => /^\d+$/.test(a)).map(Number);

if (!fs.existsSync(datei)) {
  console.error('Nicht gefunden: ' + datei);
  process.exit(1);
}

let daten;
try {
  daten = JSON.parse(fs.readFileSync(datei, 'utf8').replace(/^﻿/, ''));
} catch (e) {
  console.error('Die Datei ist kein gueltiges JSON: ' + e.message);
  process.exit(1);
}

if (!Array.isArray(daten.tage)) {
  console.error('Kein Block "tage" gefunden. Abbruch, es wird nichts geaendert.');
  process.exit(1);
}

/* Durchgehende Nummerierung ueber alle Tage. Sie gilt nur fuer den
   Stand der Datei in diesem Moment: nach einem Verschieben neu
   anzeigen lassen, sonst trifft eine alte Nummer die falsche Zeile. */
const zeilen = [];
daten.tage.forEach((tag, tagIdx) => {
  (tag.hinweise || []).forEach((text, hinweisIdx) => {
    zeilen.push({ nr: zeilen.length + 1, tagIdx: tagIdx, hinweisIdx: hinweisIdx, datum: tag.datum, text: String(text) });
  });
});

if (!zeilen.length) {
  console.log('Keine Hinweise in den Tagen. Nichts zu tun.');
  process.exit(0);
}

if (!nummern.length) {
  console.log('');
  console.log('Hinweise in den Tagen. Diese Liste nicht in einen Chat kopieren.');
  console.log('');
  zeilen.forEach(z => {
    console.log(String(z.nr).padStart(3) + '  [' + z.datum + ']  ' + z.text);
  });
  console.log('');
  console.log('Zum Verschieben die Nummern anhaengen, zum Beispiel:');
  console.log('  node .regeln-verschieben.js ' + zeilen.slice(0, 2).map(z => z.nr).join(' '));
  console.log('');
  console.log('Bestehende Regeln im Block "regeln": ' + ((daten.regeln || []).length));
  process.exit(0);
}

const unbekannt = nummern.filter(n => n < 1 || n > zeilen.length);
if (unbekannt.length) {
  console.error('Diese Nummern gibt es nicht: ' + unbekannt.join(', ') + '. Abbruch, es wird nichts geaendert.');
  process.exit(1);
}

/* Erst sichern, dann aendern. Die Sicherung ist per .gitignore vom
   Repository ausgeschlossen. */
const stempel = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const sicherung = path.join(path.dirname(datei), 'reisedaten-backup-' + stempel + '.json');
fs.copyFileSync(datei, sicherung);

const gewaehlt = zeilen.filter(z => nummern.includes(z.nr));
if (!Array.isArray(daten.regeln)) daten.regeln = [];

let neu = 0;
let doppelt = 0;
gewaehlt.forEach(z => {
  if (daten.regeln.some(r => String(r).trim() === z.text.trim())) doppelt++;
  else { daten.regeln.push(z.text); neu++; }
});

/* Von hinten entfernen, sonst verschieben sich die Positionen unter
   den noch offenen Treffern weg. */
gewaehlt
  .slice()
  .sort((a, b) => b.tagIdx - a.tagIdx || b.hinweisIdx - a.hinweisIdx)
  .forEach(z => { daten.tage[z.tagIdx].hinweise.splice(z.hinweisIdx, 1); });

fs.writeFileSync(datei, JSON.stringify(daten, null, 2) + '\n', 'utf8');

console.log('Sicherung angelegt: ' + path.basename(sicherung));
console.log('Aus den Tagen entfernt: ' + gewaehlt.length);
console.log('Neu im Block "regeln": ' + neu + (doppelt ? ', bereits vorhanden: ' + doppelt : ''));
console.log('Der Block "regeln" hat jetzt ' + daten.regeln.length + ' Eintraege.');
console.log('In der App sichtbar unter Mehr. Seite einmal neu laden.');
