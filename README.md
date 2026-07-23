# Reisebegleiter – Thailand 2026/27

Offline-PWA für deine 28-tägige Solo-Reise durch Thailand. Alles läuft lokal auf deinem Handy – keine Datenübertragung, kein Tracking, 100% Datenschutz.

## Features

- **📅 Heute** – Was läuft heute? Hotel, Transfers, Hinweise auf einen Blick
- **📋 Reiseplan** – Alle 28 Tage zum Scrollen, mit Orten, Hotels, Transfer-Zeiten
- **🎫 Tickets** – Flüge, Hotels, Boote, Einreise – alle Dokumente gespeichert, offline verfügbar
- **🔧 Werkzeug** – Umrechner (THB↔CHF), Übersetzer, Ausgabenrechner, Notfallnummern

## Installation

### Auf Android (Chrome)

1. Öffne `https://lioal17.github.io/reisebegleiter/` im Chrome-Browser
2. Oben rechts: **⋮** (Menü) → **«Zum Startbildschirm»**
3. Name: **Reisebegleiter** → **Hinzufügen**
4. Fertig! App erscheint als Icon auf dem Startbildschirm

### Lokal (für die Entwicklung)

```bash
# Repo klonen
gh repo clone lioal17/reisebegleiter
cd reisebegleiter

# Lokal servieren (Port 8000)
python3 -m http.server
# oder: npx http-server

# Im Browser öffnen
open http://localhost:8000
```

## Deine echten Reisedaten importieren

Die App startet mit erfundenen **Demo-Daten** (fiktive Hotels, Orte, Flüge).

### So importierst du deine echten Daten:

1. **Reisedaten vorbereiten:** Erstelle eine `reisedaten.json` mit deinen echten Daten (siehe `DATEN-VORLAGE.md`)
2. **Auf dem Handy:**
   - App öffnen → **Werkzeug** (unten rechts)
   - Nach unten scrollen → **«Daten verwalten»**
   - Klick **«📥 Importieren»**
   - Wähle deine `reisedaten.json`
   - Fertig! Deine Daten sind jetzt offline auf dem Handy

### Wichtig: Datenschutz

- Die `reisedaten.json` wird **nie ins Repository committed** (siehe `.gitignore`)
- Sie bleibt **ausschliesslich auf deinem Handy** – keine Übertragung, kein Cloud-Sync
- Die App funktioniert **100% offline** – auch ohne Internet
- GitHub Pages braucht nur die App-Dateien, nicht deine Daten

## Tickets & Dokumente hochladen

1. **Im Tab «Tickets»** unten auf **«➕ Ticket hinzufügen»** klicken
2. Foto oder PDF wählen → wird lokal gespeichert
3. Alle Dokumente sind **offline** verfügbar

## Ausgaben erfassen

1. **Werkzeug** → **Ausgaben**
2. **Betrag in THB eingeben** → **Kategorie wählen** → **➕**
3. Wird sofort in CHF umgerechnet (Fixkurs 1 CHF = 40 THB, aufgerundet)
4. Verlauf bleibt gespeichert

## Technische Details

- **Single-Page-App:** Eine `index.html`, keine Server
- **Offline-fähig:** Service Worker cached die App
- **Lokale Speicherung:** Daten in `localStorage` und `IndexedDB`
- **Restriktive CSP:** Keine Möglichkeit für Datenexfiltration
- **PWA-Ready:** Installierbar auf Android/iOS Home-Screen

## Datenschutz & Sicherheit

✅ **Garantien:**
- Deine Reisedaten bleiben **nur auf deinem Gerät**
- **Keine Netzwerk-Anfragen** mit Nutzerdaten
- **Keine Cloudanbindung, kein Sync**
- **Quellcode öffentlich** – vollständig nachvollziehbar

❌ **Was nicht möglich ist:**
- Daten-Sync über mehrere Geräte (absichtlich)
- Automatische Backups in der Cloud
- Remote-Zugriff von außen

💾 **Lokale Backups:**
- Im Tab «Werkzeug» → **«📤 Exportieren»**
- Speichert deine Daten als `reisedaten-backup-YYYY-MM-DD.json`
- Kopiere die Datei auf einen USB-Stick oder lokalen Ordner

## Häufig gefragt

**F: Funktioniert die App auf Koh Ngai ohne Netz?**  
A: Ja, 100%. Die App lädt einmalig und funktioniert dann komplett offline.

**F: Wo sind meine Daten gespeichert?**  
A: Ausschliesslich im Handy-Speicher (`localStorage` und `IndexedDB`). Nirgendwo sonst.

**F: Kann ich die App auf mehreren Handys installieren?**  
A: Ja, als PWA auf mehreren Handys. Aber: Die Daten werden **nicht synchronisiert** – jedes Handy hat seine eigene Kopie.

**F: Was passiert, wenn ich das Handy neu aufsetze?**  
A: Deine Daten sind weg. Deswegen regelmässig exportieren!

## Entwicklung & Feedback

Alle Dateien sind in diesem Repository:
- `index.html` – Komplette App (HTML+CSS+JS)
- `demo-daten.json` – Beispieldaten
- `sw.js` – Service Worker (Offline)
- `manifest.webmanifest` – PWA-Konfiguration

Fragen oder Fehler? GitHub Issues willkommen!

---

**Gute Reise! 🌴**
