# Umbau-Stand: Frontend-Redesign TravelMate

**Stand:** 09.08.2026
**Sicherungspunkt:** Branch `sicherung-2026-08-09-2052` auf `main`

Diese Datei ist die Uebergabe fuer die naechste Sitzung. Sie enthaelt
bewusst **keine** echten Reisedaten, nur Entscheide und offene Punkte.

---

## Ausgangslage

Das Aussehen der App gefaellt nicht. Es liegt ein neuer Design-Entwurf
vor, erstellt mit ChatGPT: dunkles Theme, Tuerkis als Primaerfarbe,
vier Tabs (Heute, Reiseplan, Dokumente, Mehr).

Befund nach Pruefung des Codes: Die vorhandene Struktur passt bereits
zum Entwurf. `screenToday`, `screenPlan`, `screenDay`, `screenTickets`,
`screenMap` und `docTiles` existieren. Es ist ein Design-Refresh, kein
Neubau.

---

## Getroffene Entscheide

| # | Entscheid | Begruendung |
|---|---|---|
| 1 | **Neues Design auf bestehende Logik.** Datenschicht, Import, Export, Service Worker und Karte bleiben | Nichts Funktionierendes wegwerfen |
| 2 | **Kartenscreen bleibt** | Fertig, offline, verletzt keine Regel |
| 3 | **Ortsfavoriten "In der Naehe" entfallen** | Google Maps mit Zwischenschritt, hoechster Bauaufwand, schlechteres Ergebnis |
| 4 | **Wetter bleibt, CSP wird gezielt geoeffnet** | Siehe Regelaenderung unten |
| 5 | **Uebersetzer bleibt** (DE-EN, DE-Thai) plus Knopf "In Google Translate oeffnen" fuer den Offline-Fall | Ein eingebauter Uebersetzer kann in einer PWA nicht offline |
| 6 | **Ausgabenrechner bleibt im Werkzeug-Screen**, nicht auf Heute | Ausdruecklicher Wunsch. Gegenmittel: PWA-Schnellzugriff beim langen Druecken aufs App-Icon fuehrt direkt zu "Ausgabe erfassen" |
| 7 | **Dunkles Theme bleibt**, aber mit Kontrastkorrektur | OLED spart Akku. Kleintext 11px auf `#788484` war bei Sonnenlicht unlesbar |
| 8 | **Buchungsnummern und PINs kommen nicht in die Daten** | Vor Ort nicht noetig. Sie stehen auf den hinterlegten Bestaetigungen |
| 9 | **Kein Webfont.** `system-ui` statt Inter | Offline-Betrieb, keine externe Verbindung. Ergibt auf Android Roboto |
| 10 | **Dokumente-Kacheln zweischichtig:** Farbverlauf plus Icon als Grundlage, Bild optional darueber | App funktioniert vollstaendig ohne Bilder, Bilder koennen nachlaufen |

---

## Regelaenderung, noch einzutragen in CLAUDE.md

Die bestehende Regel "CSP nicht aufweichen" wird **praezisiert, nicht
aufgehoben**:

- `connect-src` wird um **genau einen Wetterdienst** erweitert
  (Open-Meteo, kein Schluessel, kein Konto).
- Die uebergebenen Koordinaten werden **auf eine Nachkommastelle
  gerundet**, rund elf Kilometer Unschaerfe. Der Dienst erfaehrt die
  Region, nicht die Unterkunft.
- Alles andere bleibt: `default-src 'none'`, `form-action 'none'`,
  kein Backend, kein Tracking, keine Telemetrie.

**Ohne diese Praezisierung blockiert die Regel beim naechsten Mal genau
das Feature, das bestellt wurde.**

---

## Bereits erledigt

- [x] Sicherungsbranch `sicherung-2026-08-09-2052` angelegt
- [x] `:root`-Variablenblock in `index.html` komplett ersetzt:
      Farbwelt, Akzente nach Bedeutung, Linien, Radien, Abstaende,
      Bedienmasse, Schriftstack. Bestehende Variablennamen beibehalten,
      damit die Aenderung ohne Umbau der 1'300 CSS-Zeilen greift
- [x] Kontrastkorrektur: `--muted` von `#85a09d` auf `#B7C0C0`
      angehoben, `--faint` nur noch fuer Nebensaechliches

---

## Naechste Schritte

- [ ] Typografie-Skala anwenden (Groessen im CSS sind noch die alten)
- [ ] Phosphor-Icons einbinden, Outline, Strichstaerke 1.75
- [ ] Dokumente-Kacheln als Farbverlauf plus Icon
- [ ] CSP fuer den Wetterdienst oeffnen, CLAUDE.md entsprechend anpassen
- [ ] Wetter-Karte mit Zwischenspeicher, Zeitstempel und fest
      eingebauten Klimamittelwerten fuer Dezember und Januar
- [ ] Ausgaben-Block im Werkzeug-Screen, Eingabe in zwei Tipps
- [ ] Export und Import fuer das Zwischenspeichern pruefen und
      verbessern. **Wichtig:** Reisedaten und Ausgaben trennen, damit
      ein Import der Route die erfassten Ausgaben nicht ueberschreibt
- [ ] PWA-Schnellzugriff aufs App-Icon
- [ ] Ortsfavoriten ausbauen

---

## Offene Fragen: am 09.08.2026 geklaert

| Frage | Entscheid |
|---|---|
| **Ausgaben-Kategorien** | **Sechs:** Essen, Transport, Unterkunft, Aktivitaet, Roller, Sonstiges. Transport schluckt Boot, Taxi, Bus und Flug. Begruendung: weniger Pillen heisst schnelleres Tippen, blind bedienbar |
| **Kritischer Reisetag** | **Warnkarte plus Vorabend-Hinweis.** Am Tag selbst eine rote Karte ganz oben auf Heute mit der Abfahrtszeit, am Vorabend zusaetzlich ein Eintrag unter "Nicht vergessen". Keine Push-Benachrichtigung, darauf ist bei Android kein Verlass |
| **Begruessung** | **Ohne Namen**, nur "Guten Morgen". Spart die oberste Zeile fuer das, was zaehlt |
| **Schrift** | **`system-ui`**, ergibt auf Android Roboto. Kein Webfont, nichts das offline fehlen kann. Bereits eingetragen |

**Einzige noch offene Frage:**

**Aussehen des Werkzeug-Screens.** Dafuer existiert kein Entwurf.
Enthaelt: Umrechner, Ausgaben, Uebersetzer, Notfallnummern,
Datensicherung. Bewusst nicht vorbesprochen: Der Vorschlag wird gebaut
und danach am fertigen Bild korrigiert, das ist schneller als darueber
zu reden, ohne ihn zu sehen.

---

## Assets: am 10.08.2026 eingebaut

Quelle war `C:\Users\remar\Desktop\Rreiseapp\Bilder`, alle Bilder
1254 x 1254. Skaliert und komprimiert wurde lokal mit PowerShell und
System.Drawing, **nicht** mit dem Python-Skript aus ChatGPT.

| Datei | Inhalt | Groesse |
|---|---|---|
| `assets/icon-192.png` | App-Icon | 43 KB |
| `assets/icon-512.png` | App-Icon | 317 KB |
| `assets/icon-maskable-512.png` | App-Icon, Android-Maske | 186 KB |
| `assets/hero.jpg` | Bungalow im Breitformat, Heute-Screen | 37 KB |
| `assets/tile-flug.jpg` | Flugzeug, blau | 15 KB |
| `assets/tile-boot.jpg` | Longtail-Boot, tuerkis | 15 KB |
| `assets/tile-hotel.jpg` | Bungalow, warm | 18 KB |
| `assets/tile-pass.jpg` | Reisepass, rotbraun | 13 KB |
| `assets/tile-schutz.jpg` | Schutzschild, violett | 10 KB |

**Zwei Dateien fehlen weiterhin, beide folgenlos:**
`assets/tile-visa.jpg` (Motiv noch nicht erzeugt) und
`assets/tile-default.jpg`. Die App faellt ueber `withAsset()` auf den
Farbverlauf zurueck, und `cache.add()` faengt Fehlschlaege ab.

**Drei Dinge, die beim Einbau aufgefallen sind:**

1. Das Manifest verwies auf **SVG-Data-URIs**. Chrome auf Android
   nimmt SVG-Icons fuer den Startbildschirm nur unzuverlaessig an,
   deshalb jetzt echte PNG.
2. Das maskable Icon aus ChatGPT waere falsch geworden: Das Skript
   skaliert das fertige Icon **inklusive seiner abgerundeten Kachel**
   und setzt es auf einen Grund. In der Android-Maske ergibt das eine
   zweite, sichtbare Kante. Richtig ist nur das Motiv auf
   vollflaechigem Grund, hier `#001014`, die gemessene Kachelfarbe.
3. Der schwarze Rand des Quellbilds wurde weggeschnitten. Gemessen,
   nicht geschaetzt: die Kachel liegt bei 111 bis 1142.

**Ansehen:** `node .server.js` im Repo starten, dann
`http://localhost:8123` im Browser. Ueber `file://` laeuft der
Service Worker nicht. Der Server lauscht auf `0.0.0.0`, du kommst
also auch vom Handy im gleichen WLAN darauf. **Aber:** Ueber eine
LAN-Adresse ohne HTTPS startet der Service Worker nicht, das Aussehen
kannst du dort pruefen, den Offline-Betrieb nicht.

---

## Umbau nach Lios erstem Feedback: 11.08.2026

Reihenfolge bewusst gewaehlt: **Struktur zuerst, Design danach.**
Grund: Reiseplan und Dokumente aendern das Layout ohnehin komplett,
zuerst gestalten hiesse zweimal gestalten.

### Heute

- Knoepfe erscheinen nur, wenn sie etwas tun koennen. Vorher war
  "Anrufen" nur ausgegraut und "Karte" gar nicht geprueft.
- **Behobener Fehler:** `callBtn.disabled = true` wurde nie wieder
  zurueckgesetzt. Nach einem Tag ohne Nummer blieb der Knopf auch
  bei Hotels mit Nummer tot.
- Der Nachtflug wird als solcher erkannt und heisst "Heute Nacht
  unterwegs", mit Flugzeug-Symbol statt Bett. Erkennungszeichen:
  Transfer am selben Tag, dazu weder Koordinaten noch Nummer.
- "Foto" heisst jetzt "Hotelfoto" und verschwindet an Flugtagen.
  Lio hatte den Knopf fuer einen QR-Scanner gehalten, zu Recht.
- **Wetter am Ziel statt am Start.** Hat der heutige Tag keine
  Koordinaten, wird der naechste Tag genommen, der welche hat.
  Damit ist die Karte am Abreisetag nicht mehr leer.
- **Zwei Uhren**, Zuhause und Ziel. Beide ueber `Intl` aus einer
  benannten Zeitzone, nicht ueber die Geraeteuhr. Sonst zeigt die
  Heimatuhr vor Ort thailaendische Zeit. Laeuft offline.
- Begruessung jetzt wirklich ohne Namen, wie am 09.08. entschieden.
  Der Code hing noch am alten Stand.

### Reiseplan

Statt einer Zeile pro Tag eine Karte pro Ort. Antippen klappt die
Tage auf. Gruppiert wird nach **Zielort plus Hotel**, nicht nach dem
ganzen Ortstext.

**Warum das wichtig ist:** Erst gruppierte ich nach dem vollen Text.
Ergebnis waren 17 Gruppen statt 10, weil "Bangkok → Chiang Mai" und
"Chiang Mai" bei identischem Hotel getrennt blieben. Der Rauchtest
hat das aufgedeckt, nicht das Auge.

### Dokumente

Sechs feste Kacheln, spaltenweise gefuellt: links Hotels, Boote und
Faehren, Fluege. Rechts Einreise und Visa, Reisepass, Versicherung.
Sie entstehen nicht mehr aus den vorhandenen Dokumenten, sondern
stehen immer da. Leere Kacheln sagen "noch nichts".

- Kachel antippen oeffnet den Inhalt unter dem Raster, die aktive
  Kachel ist markiert. In einem zweispaltigen Raster gibt es kein
  "direkt darunter", ohne die Spaltenordnung zu zerreissen.
- **Hotels sind der Sonderfall:** Sie kommen aus `tage[].hotel`,
  nicht aus `tickets`. Jede Unterkunft einmal, mit Zeitraum,
  Adresse, Anrufen, WhatsApp und Route nach Google Maps.
- Dokumente, die in keine Kachel passen, stehen unter "Nicht
  zugeordnet" statt stillschweigend zu verschwinden.
- `tile-default.jpg` wird nicht mehr gebraucht. **Es fehlt nur noch
  `assets/tile-visa.jpg`.**

### Mehr

- Kategorien neu: Essen, Transport, **Konsum**, Aktivitaeten,
  Roller, Sonstiges. Unterkunft faellt weg. Konsum ist Einkaufen,
  Mitbringsel und Genussmittel in einem Topf.
- **Der schnelle Weg bleibt zwei Tipps.** Betrag, Kachel, gebucht.
  Ein Stift auf jeder Kachel oeffnet ein Blatt mit Unterpunkten und
  Notizfeld. Kein langes Druecken: versteckte Gesten findet niemand.
- **Verlauf** mit Bearbeiten und Loeschen, nach Tagen gruppiert.
- **Notizfeld**, eigener Speicherplatz, sichert beim Tippen. Fester
  Hinweis: keine PINs, keine Kartennummern. Damit bleibt Entscheid 8
  in Kraft.
- Alte Buchungen werden migriert: "Aktivitaet" wird "Aktivitaeten",
  "Unterkunft" wird "Sonstiges" mit dem alten Namen als Notiz.

### Getestet

`jsdom`-Rauchtest ausserhalb des Repos, kein `node_modules` im
Projekt. Laedt die Seite, klickt sich durch alle vier Reiter, bucht,
korrigiert und loescht eine Ausgabe. Null Konsolenfehler.

**Der Test ist nicht committet.** Er lag in `%TEMP%\rbtest`. Wenn er
bleiben soll, braucht das Projekt eine Entscheidung ueber
`node_modules`, und die will ich nicht nebenbei treffen.

### Offen, bewusst nicht gemacht

- **Das Design.** Lio hat neue Bilder erstellt, sie liegen noch
  nicht im Repo. Das ist der naechste Block.
- `assets/tile-visa.jpg`.
- Zeitzonen stehen bisher nur in `reise.zeitzone`. Fuer eine Reise
  ueber mehrere Laender braucht jeder Tag ein eigenes `tz`. Der Code
  liest das bereits, die Daten haben es noch nicht.

---

## Erst im November

Zehn Transfers mit Zeiten und Preisen, Koordinaten und Telefonnummern
der Unterkuenfte, Tauchbasis, TDAC-Formular. Grund: Fahrplaene fuer
Januar sind im August teilweise noch nicht veroeffentlicht.

Danach die Vault-Notizen nachziehen. Sie sind veraltet: Die
Projektnotiz spricht von zwei Commits, die Spec enthaelt Features, die
hier gestrichen wurden.
