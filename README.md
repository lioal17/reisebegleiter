# Travel-Mate

Reisebegleiter als Offline-PWA. Alles läuft lokal auf dem Handy: Reiseplan, Buchungen, Belege, Ausgaben und Abrechnung. Kein Konto, kein Server, kein Tracking.

## Was die App kann

| Reiter | Inhalt |
|---|---|
| **Heute** | Reisetag, Ort, Unterkunft, alle Verbindungen des Tages, Programm, Budgetstand, Wetter, zwei Uhren |
| **Reiseplan** | Stationen und Tage, Knopf **«Reise planen»**, Liste der Buchungen, Tagesplan mit Beleg an jeder Buchung |
| **Dokumente** | Acht Kacheln, Suche, PDF und Bilder direkt in der App, alles offline |
| **Mehr** | Umrechner mit Land und Währung, Ausgaben, Verlauf, Budget und Abrechnung, Notizen, Notfall, Datensicherung |

### «Reise planen»

Vier Wege führen hinein, alle enden in derselben Vorschau:

1. Text der Bestätigung einfügen, zum Beispiel aus der Mail
2. PDF wählen oder hineinziehen
3. Foto oder Screenshot wählen, hineinziehen oder aus der Zwischenablage einfügen
4. Von Hand erfassen

Die Vorschau zeigt, was erkannt wurde, markiert jedes Feld mit «erkannt», «bitte prüfen» oder «unbekannt» und lässt sich korrigieren. Erst **«In Reiseplanung übernehmen»** schreibt etwas.

**Was erkannt wird und was nicht:**

- **Text und PDF mit Textschicht** werden gelesen: Art der Buchung, Datum, Zeit, Flugnummer, Flughäfen mit Zeitzone, Preis, Währung, Buchungsnummer, Bezahlstatus, Stornozeile.
- **Bilder, Screenshots und gescannte PDF** werden als Beleg abgelegt. Ihr Inhalt wird nicht gelesen, die Felder füllst du von Hand.
- **Links** werden an der Buchung gespeichert und lassen sich öffnen. Die Seite dahinter kann die App nicht abrufen: Buchungsseiten verlangen eine Anmeldung, und der Browser verbietet einer lokalen App den Zugriff.
- **Nichts wird erfunden.** Was im Text nicht steht, bleibt leer.
- Eine Buchung, die es schon gibt, wird erkannt. Die App bietet «Bestehende aktualisieren» an statt einen zweiten Eintrag.

### Geld

- Reiseland wählen, die Währung folgt. Die Währung lässt sich von Hand übersteuern.
- Kurs entweder als Referenzkurs vom Kursdienst (mit Stand-Datum, offline gilt der letzte) oder als eigener Kurs, zum Beispiel vom Bankomat-Beleg. Der eigene geht vor.
- Jede Ausgabe speichert ihren Franken-Betrag beim Buchen. Ein neuer Kurs verändert keine alte Ausgabe.
- Geschätzte Beträge tragen ein «≈». Wer den Betrag vom Kontoauszug kennt, trägt ihn ein, dann zählt der.
- Der Preis einer Buchung zählt aus der Buchung, nie zusätzlich als Ausgabe. «Bezahlt» ist ein Statuswechsel.
- **Budget und Abrechnung:** Budget, bezahlt, offen, verbleibend, nach Kategorie, Land, Ort und Tag.
- **«Reise beenden»** markiert die Reise als abgeschlossen und zeigt die Abrechnung. Es wird nichts gelöscht, und die Markierung lässt sich wieder aufheben.
- Export als **CSV** und als **Reisebericht** über den Druckdialog («Als PDF speichern»).

## Installation auf Android (Chrome)

1. `https://lioal17.github.io/reisebegleiter/` in Chrome öffnen
2. Menü **⋮**, dann **«Zum Startbildschirm»**
3. **Hinzufügen**

Die App einmal mit Netz öffnen, danach läuft sie offline.

## Lokal ansehen

```bash
node .server.js
```

Dann `http://localhost:8123` im Browser öffnen. Über `file://` läuft der Service Worker nicht.

## Eigene Reisedaten

Die App startet mit einer erfundenen Demo-Reise. Für die eigene Reise gibt es zwei Wege, die sich ergänzen:

- **In der App:** über «Reise planen» Buchung für Buchung erfassen.
- **Als Datei:** eine `reisedaten.json` nach `DATEN-VORLAGE.md` bauen und unter **Mehr, Datensicherung, Reiseplan, Importieren** einlesen.

Reisedaten gehören nicht ins Repository, siehe `.gitignore`.

## Datenschutz

Oberstes Gebot, siehe `CLAUDE.md`.

- Reisedaten, Belege und Ausgaben bleiben auf dem Gerät, in `localStorage` und `IndexedDB`.
- Die Sicherheitsregel der Seite (CSP) steht auf `default-src 'none'`. Erlaubt sind genau zwei ausgehende Abfragen:
  - **Wetter** bei Open-Meteo: nur Koordinaten, auf eine Nachkommastelle gerundet.
  - **Wechselkurse** bei Frankfurter: nur «alle Kurse zu CHF», für jede Reise dieselbe Abfrage.
- PDF werden von pdf.js auf dem Gerät gelesen (`vendor/`, Apache-2.0). Keine Texterkennung in der Cloud, keine Cloud-KI.
- Kein Sync zwischen Geräten, kein Zugriff von aussen.

**Deshalb regelmässig sichern:** Mehr, Datensicherung. Reiseplan, Ausgaben und Dokumente sind drei getrennte Sicherungen. Wird das Handy neu aufgesetzt, sind die Daten sonst weg.

## Tests

```bash
node tests/kern.test.js
```

```bash
node tests/e2e.test.js
```

Der erste Lauf prüft die Logik ohne Browser, der zweite die App in Chromium in Handygrösse (braucht Playwright global, im Repo liegt kein `node_modules`). Der zweite Lauf scheitert bei jedem Konsolenfehler, jeder CSP-Verletzung und jeder Anfrage an einen dritten Host. Alle Testdaten sind erfunden.

## Dateien

- `index.html`: die ganze App. Der Block `<script id="kern">` enthält die Logik ohne Oberfläche.
- `sw.js`: Service Worker für den Offline-Betrieb
- `manifest.webmanifest`: macht die App installierbar
- `vendor/`: pdf.js, Beiwerk. Ohne diese Dateien läuft die App weiter, PDF öffnen dann in einem neuen Tab.
- `demo-daten.json`: erfundene Beispielreise
- `tests/`: die beiden Testläufe
- `UMBAU-STAND.md`: Entscheide und offene Punkte
