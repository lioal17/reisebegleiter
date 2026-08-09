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

## Assets, die noch fehlen

Werden vom Nutzer aus ChatGPT nachgeliefert, blockieren nichts.
Reihenfolge nach Nutzen:

1. App-Icon 1024px (existiert bereits, muss nur heruntergeladen werden).
   Ableitungen und ein korrektes maskable Icon werden hier erzeugt,
   nicht in ChatGPT: Das dortige Skript skaliert das fertige Icon
   inklusive seiner abgerundeten Kachel, was in der Android-Maske eine
   sichtbare Kante ergibt
2. Flugtickets, 3. Hotel Voucher, 4. Boot Tickets,
5. Reisepass, 6. Versicherung, 7. Visum

Je 600 x 600 PNG, im oberen Drittel ruhig und dunkel, damit weisse
Schrift darauf lesbar bleibt.

---

## Erst im November

Zehn Transfers mit Zeiten und Preisen, Koordinaten und Telefonnummern
der Unterkuenfte, Tauchbasis, TDAC-Formular. Grund: Fahrplaene fuer
Januar sind im August teilweise noch nicht veroeffentlicht.

Danach die Vault-Notizen nachziehen. Sie sind veraltet: Die
Projektnotiz spricht von zwei Commits, die Spec enthaelt Features, die
hier gestrichen wurden.
