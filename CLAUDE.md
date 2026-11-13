# CLAUDE.md – Projektregeln Reisebegleiter

## 🔒 OBERSTES GEBOT: Datenschutz (nicht verhandelbar)

**Reisedaten dürfen NIEMALS hochgeladen, übertragen oder aus dem lokalen Browser herausgegeben werden. Sie bleiben ausschliesslich lokal und offline. Datenschutz hat oberste Priorität – vor jedem Feature.**

Immer einzuhalten:

- Die App bleibt eine **reine Offline-/Local-First-Webapp** (eine einzige `index.html`, Daten nur in `localStorage`/`IndexedDB`, **kein** Backend, kein Tracking, keine Telemetrie).
- **Keine** Funktion einbauen, die Reisedaten per Netzwerk sendet: kein `fetch`/XHR/WebSocket/`sendBeacon`/Formular-POST an externe Ziele, kein Cloud-Sync, kein Analytics.
- Die **Content-Security-Policy nicht aufweichen** (`default-src 'none'`, `form-action 'none'`), sodass keine Datenexfiltration möglich wird. Für `connect-src` gelten die beiden Präzisierungen unten – sie sind abschliessend.
- **Nie** echte Reisedaten in Commits, Pull Requests, Screenshots, Logs, Artifacts oder Issue-/PR-Kommentaren – und niemals an Dritte oder externe Dienste – weitergeben. Export-`*.json` (Datensicherungen) gehören **nicht** ins Repository (siehe `.gitignore`).
- Test-/Demodaten sind **immer frei erfunden** (keine echten Orte/Hotels/Flüge wenn möglich; Nummern angepasst).
- **Kein externer Zugriff von außen:** Weder Dritte noch externe Anwendungen oder Dienste dürfen auf Reisedaten zugreifen können. Keine Funktion/Integration darf einen Zugriffsweg von außerhalb des lokalen Systems öffnen (keine Freigaben, keine Remote-Schnittstellen, kein Sync-Dienst).
- **Auch Claude selbst ist ein externer Kanal:** Reisedaten dürfen **nicht** in den Claude-Chat gelangen (keine echten Namen/Hotels/Abläufe in Nachrichten, Screenshots oder eingefügten Exporten). Claude fordert nie echte Reisedaten an und arbeitet ausschliesslich mit erfundenen Demodaten.

### Präzisierung `connect-src`: genau zwei Ausnahmen

#### Ausnahme 1: Wetter

`connect-src` ist **nicht** mehr `'self'` allein, sondern `'self' https://api.open-meteo.com https://api.frankfurter.dev`. Die Wetter-Ausnahme ist an vier Bedingungen gebunden:

1. **Genau ein Wetterdienst.** Open-Meteo, ohne Schlüssel, ohne Konto, ohne Registrierung.
2. **Nur Koordinaten, auf eine Nachkommastelle gerundet.** Rund elf Kilometer Unschärfe. Der Dienst erfährt die Region, nicht die Unterkunft. Die Rundung passiert im Code, nicht im Kopf: `Math.round(x * 10) / 10`.
3. **Nur ausgehende Abfrage von Wetterwerten.** Keine Namen, keine Daten, keine Termine, keine Kennungen, kein Zeitplan der Reise. Ein Request enthält ausschliesslich gerundete Koordinaten und die gewünschten Wetterfelder.
4. **Die App bleibt ohne diesen Dienst voll funktionsfähig.** Fällt er aus oder ist kein Netz da, zeigt sie zwischengespeicherte Werte mit Zeitstempel, sonst fest eingebaute Klimamittelwerte. Wetter ist Beiwerk, nie Voraussetzung.

#### Ausnahme 2: Wechselkurse (entschieden am 12.11.2026)

Der Währungsrechner darf Tageskurse holen. Die Ausnahme ist an vier Bedingungen gebunden:

1. **Genau ein Kursdienst.** Frankfurter (`api.frankfurter.dev`, Referenzkurse der Europäischen Zentralbank), ohne Schlüssel, ohne Konto, ohne Registrierung.
2. **Die Abfrage ist für jede Reise dieselbe.** Sie lautet immer «alle Kurse zur Heimatwährung» und enthält sonst nichts. Insbesondere **keine** Liste der gebrauchten Währungen: daraus liessen sich die Reiseländer ablesen. Der Dienst erfährt die Heimatwährung, nicht das Ziel.
3. **Nur ausgehende Abfrage von Kursen.** Keine Beträge, keine Ausgaben, keine Namen, keine Daten, keine Kennungen.
4. **Die App bleibt ohne diesen Dienst voll funktionsfähig.** Fällt er aus oder ist kein Netz da, gilt der zuletzt gespeicherte Kurs mit Stand-Datum, sonst ein von Hand eingetragener Kurs. Bereits erfasste Ausgaben behalten ihren eingefrorenen Franken-Betrag und werden von einem neuen Kurs nie verändert.

**Kein dritter Host kommt dazu, egal wie nützlich er wäre.**

### Präzisierung Hintergrund-Skripte und Texterkennung (entschieden am 13.11.2026)

Gemessen am 13.11.2026: Ein Hintergrund-Skript (Worker), das direkt aus einer Datei gestartet wird, unterliegt der Sicherheitsregel der Seite **nicht**. Ein Worker, der aus einem Blob gestartet wird, erbt sie. Daraus folgt:

1. **Jeder Worker wird über einen Blob gestartet**, nie direkt aus einer Datei. Das gilt für pdf.js und für die Texterkennung. So gilt `connect-src` auch dort, und ein Worker erreicht keinen dritten Host.
2. **Die CSP bekommt dafür genau zwei Ergänzungen:** `worker-src 'self' blob:` und in `script-src` zusätzlich `'wasm-unsafe-eval'`. Das zweite erlaubt, WebAssembly auszuführen, mehr nicht: es öffnet keinen Netzwerkpfad. Die Texterkennung ist WebAssembly.
3. **Texterkennung nur auf dem Gerät.** tesseract.js 7.0.0 mit Sprachdaten Deutsch und Englisch liegt unter `vendor/ocr/`. Bilder, Screenshots und gescannte PDF werden lokal gelesen. Nichts davon verlässt das Gerät.
4. **Das Ergebnis ist ein Vorschlag.** Erkannter Text füllt die Vorschau. In den Reiseplan kommt erst etwas nach «In Reiseplanung übernehmen».

### Präzisierung Teilen aus anderen Apps (entschieden am 13.11.2026)

Die installierte App darf als Ziel im «Teilen»-Menü von Android erscheinen (`share_target` im Manifest). Bedingungen:

1. **Nur eingehend, nur vom Gerät, nur von Hand.** Die App nimmt an, was der Nutzer selbst aus einer anderen App auf demselben Gerät übergibt: eine Datei, einen Text, einen Link. Es gibt keinen Endpunkt im Netz, niemand von aussen kann etwas einliefern.
2. **Nichts geht dabei hinaus.** Der Service Worker legt das Übergebene lokal ab und öffnet die App. Keine Anfrage an einen Server.
3. **Die App teilt selbst nichts.** Es gibt kein «Teilen aus Travel-Mate heraus».

Alles andere bleibt: `default-src 'none'`, `form-action 'none'`, `connect-src` mit genau zwei Hosts, kein Backend, kein Tracking, keine Telemetrie, kein Cloud-Sync.

**Wer diese Ausnahmen erweitern will, ändert zuerst diese Datei und fragt zuerst nach.**

**Pflicht-Checkliste bei JEDER Anpassung (vor Commit/PR zu bestätigen):**
1. Bleibt die App vollständig **offline nutzbar** (kein neuer Netzwerkpfad ausser den beiden oben beschriebenen Ausnahmen Wetter und Wechselkurse)?
2. Bleibt die **CSP unverändert restriktiv** (`default-src 'none'`, `form-action 'none'`, `connect-src` ohne weitere Hosts, Worker nur über Blob)?
3. Enthalten Commit/PR/Screenshots/Logs/ZIPs **keine echten Reisedaten** (nur erfundene)?
4. Entsteht **kein Zugriffsweg von außen** auf Reisedaten (keine Freigabe, kein Endpoint)?

Falls eine Anfrage einem dieser Punkte widerspricht: **stoppen und nachfragen statt umsetzen.**

### Meine Rolle: Datenschutz-Wächter

Ich (Claude) bin das **wachende Auge über die Reisedaten** und trage aktiv Mitverantwortung für den Datenschutz. Das heisst:

- Bei **jeder** Aufgabe prüfe ich von mir aus, ob Reisedaten irgendwie nach außen gelangen könnten – auch wenn nicht ausdrücklich danach gefragt wird.
- Ich **stoppe und warne** proaktiv, sobald eine Änderung, ein Export, ein Commit, ein Screenshot oder eine Aktion datenschutzrelevante Reisedaten in Umlauf bringen könnte – und setze sie **nicht** um, sondern frage zuerst nach.
- Es darf **nie** dazu kommen, dass echte Reisedaten (Namen, Flüge, Hotels, Adressen, Notizen usw.) in Umlauf geraten – weder ins Repository, noch in PRs/Logs/Artifacts, noch an externe Dienste.
- Im Zweifel gilt: **Datenschutz vor Bequemlichkeit und vor Feature.**

## Technischer Kontext

- Die gesamte App ist **eine `index.html`** (HTML + CSS + JS inline, kein Build, kein Server). Im Browser öffnen oder via GitHub Pages.
- In `index.html` stehen zwei Skriptblöcke: `<script id="kern">` enthält die Logik ohne Oberfläche (Erkennung von Buchungen, Tagesansicht, Finanzen), der zweite Block die Oberfläche. Die Tests führen den Kern-Block direkt in Node aus.
- **Einzige Zusatzdateien liegen unter `vendor/`:** pdf.js 3.11 (`pdf.min.js`, `pdf.worker.min.js`, Apache-2.0) und die Texterkennung tesseract.js 7.0.0 (`vendor/ocr/`, Apache-2.0, Sprachdaten Deutsch und Englisch). Beide arbeiten **auf dem Gerät** und senden nichts. Sie sind Beiwerk: fehlen sie, läuft die App weiter, nur ohne PDF-Text, PDF-Vorschau und Texterkennung. Weitere Bibliotheken nur nach Rückfrage.
- **Keine Texterkennung in der Cloud und keine Cloud-KI.** Buchungen werden regelbasiert aus Text erkannt. Der Text kommt aus der Eingabe, aus der Textschicht eines PDF oder aus der lokalen Texterkennung eines Bildes.
- Tests: `node tests/kern.test.js` und `node tests/e2e.test.js` (braucht Playwright global, kein `node_modules` im Repo). Testdaten sind erfunden.
- Daten liegen lokal in **`localStorage`** (Reiseplan, Ausgaben) und **`IndexedDB`** (Ticket-Dokumente/Blobs).
- Service Worker (`sw.js`) cached das App-Shell für Offline-Betrieb.
- Manifest (`manifest.webmanifest`) macht die PWA installierbar auf Android/iOS.

## Arbeitsweise

- Änderungen über einen Branch + Pull Request nach `main` (kein direkter Push auf `main`).
- **Keine PRs ohne ausdrücklichen Auftrag.**
- Bei bestätigt funktionierendem Stand einen Wiederherstellungspunkt anlegen: Restore-Branch `sicherung-JJJJ-MM-TT-HHMM` auf `main`.

## Best Service (optional, aber definiert)

Wenn ausdrücklich **„Best Service"** verlangt wird, gehört – zusätzlich zur eigentlichen Aufgabe – folgendes dazu:

1. **ZIP-Datei für den Nutzer:** Ein Wiederherstellungs-ZIP des aktuellen Stands erzeugen und dem Nutzer **direkt aushändigen**. Erzeugung **immer** per `git archive` (nur getrackte Dateien) → damit garantiert **keine** Reise-/Datendateien (`*.json` etc.) enthalten sind.
2. **Link zu den löschbaren, gemergten Branches:** Dem Nutzer den GitHub-Branches-Link geben **und** die vollständig in `main` gemergten Branches auflisten, die er löschen kann.

> Datenschutz bleibt oberstes Gebot: Das ZIP darf **niemals** echte Reisedaten enthalten – nur getrackte Repo-Dateien; Export-`*.json` sind per `.gitignore` ohnehin ausgeschlossen.
