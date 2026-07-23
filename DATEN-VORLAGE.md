# DATEN-VORLAGE – Deine echten Reisedaten importieren

Diese Anleitung zeigt dir, wie du deine Thailand-Reisedaten aus Notion/Markdown in die richtige `reisedaten.json` umwandelst.

## Schritt 1: Daten sammeln

Du brauchst:
- **Reisedaten:** Start/End-Datum, Anzahl Tage, Stationen
- **Tagesplan:** Für jeden der 28 Tage: Datum, Wochentag, Ort, Hotel (Name, Adresse, Tel, WhatsApp), Transfer (falls vorhanden), Hinweise
- **Tickets:** Flüge, Hotels, Boote mit Buchungsnummern, Status (vorhanden/foto nötig/fehlt)
- **Notfall:** Botschaft, Notruf-Nummern

## Schritt 2: JSON-Struktur verstehen

```json
{
  "reise": {
    "titel": "Thailand Solo-Reise",
    "start": "2026-12-20",
    "ende": "2027-01-16",
    "tage": 28,
    "stationen": 9
  },
  "tage": [
    {
      "datum": "2026-12-20",
      "wochentag": "Fr",
      "ort": "Zürich → Bangkok",
      "hotel": {
        "name": "Nachtflug ZB 415",
        "adresse": "Zürich (ZRH) → Bangkok (BKK)",
        "tel": "",
        "whatsapp": "",
        "checkin": "17:30",
        "gps": ""
      },
      "transfer": null,
      "hinweise": ["Flugzeit ca. 12h"],
      "programm": []
    }
  ],
  "tickets": [
    {
      "id": "flight-zh-bkk",
      "gruppe": "Flüge",
      "titel": "Zürich – Bangkok",
      "info": "ZB 415 · 20.12.2026 17:30",
      "status": "vorhanden",
      "abDatum": "2026-12-20"
    }
  ],
  "notfall": {
    "botschaft": "+66 2 674 6900",
    "notruf": "191",
    "feuerwehr": "199",
    "polizei": "1155",
    "ambulanz": "1669"
  },
  "budget": {
    "gesamt_chf": 6500,
    "pro_tag": 232,
    "ausgebenBisher": 0
  },
  "ausgaben": [],
  "favoriten": {
    "Bangkok": ["7-Eleven", "SkyTrain", "Bankomat"]
  }
}
```

## Schritt 3: Daten ausfüllen

### `reise`-Block
```json
"reise": {
  "titel": "Dein Reise-Name",
  "start": "YYYY-MM-DD (Abreisedatum)",
  "ende": "YYYY-MM-DD (Rückkehrdatum)",
  "tage": 28 (oder deine Anzahl),
  "stationen": 9 (oder deine Anzahl)
}
```

### `tage`-Block – Für JEDEN Tag ein Eintrag

```json
{
  "datum": "2026-12-20",          // ISO-Format: YYYY-MM-DD
  "wochentag": "Fr",              // Mo, Di, Mi, Do, Fr, Sa, So
  "ort": "Zürich → Bangkok",      // Wo bist du?
  "hotel": {
    "name": "Hotelname oder Flug",
    "adresse": "Strasse, Ort",
    "tel": "+66 123 456 7890",    // Oder leer ""
    "whatsapp": "+66812345678",   // Oder leer ""
    "checkin": "14:00",           // Check-in-Zeit
    "gps": "13.7512,100.5083"     // Lat,Lon oder leer
  },
  "transfer": {                   // null wenn kein Transfer
    "typ": "Flug",                // "Flug", "Boot", "Bus", "Tauchen", etc.
    "zeit": "08:00",              // Abfahrtszeit
    "detail": "ZB 415",           // Flugnummer, Route, etc.
    "ticketRef": "flight-bkk"     // Referenz zu Ticket-ID (siehe unten)
  } oder null,
  "hinweise": [
    "Früh raus (06:00)",
    "Kein Bankomat auf der Insel"
  ],
  "programm": ["Tauchen", "Snorkeln"] // Optional
}
```

### `tickets`-Block

Für jeden Flug, Hotel, Boot, Einreiseformular:

```json
{
  "id": "flight-zh-bkk",           // Eindeutige ID (z.B. flight-bkk)
  "gruppe": "Flüge",               // z.B. "Flüge", "Hotels", "Boote & Fähren", "Einreise & Visa", "Reisepass", "Versicherung"
  "titel": "Zürich – Bangkok",     // Lesbarer Name
  "info": "ZB 415 · 20.12.2026 17:30",  // Buchungsnummer, Datum
  "status": "vorhanden",           // "vorhanden", "foto_noetig", "fehlt"
  "abDatum": "2026-12-20"          // Wann wird es gebraucht?
}
```

**Status-Bedeutungen:**
- `"vorhanden"` – Bestätigung liegt vor
- `"foto_noetig"` – Ticket fotografiert, aber nicht hochgeladen
- `"fehlt"` – Noch nicht gebucht (wird rot angezeigt)

### `notfall`-Block

Deine Nummern – wichtig für Emergencies:

```json
"notfall": {
  "botschaft": "+66 2 674 6900",
  "notruf": "191",
  "feuerwehr": "199",
  "polizei": "1155",
  "ambulanz": "1669"
}
```

### `budget`-Block

Freiwillig, aber sinnvoll:

```json
"budget": {
  "gesamt_chf": 6500,        // Gesamtbudget
  "pro_tag": 232,            // Durchschnitt pro Tag
  "ausgebenBisher": 0        // Wird von der App aktualisiert
}
```

### `favoriten`-Block

«In der Nähe» – pro Ort 3 Lieblingsplätze:

```json
"favoriten": {
  "Bangkok": ["7-Eleven", "SkyTrain", "Bankomat"],
  "KohNgai": ["Pier", "Tauchbasis", "Apotheke"],
  "KohMuk": ["Apotheke", "Markt", "Pier"]
}
```

## Schritt 4: JSON validieren

Speichere deine Datei als `reisedaten.json` und prüfe mit einem **JSON-Validator** (z.B. https://jsonlint.com):

```bash
# Oder lokal mit Python:
python3 -c "import json; json.load(open('reisedaten.json'))" && echo "✓ JSON korrekt"
```

## Schritt 5: In der App importieren

1. App öffnen → **Werkzeug** (unten rechts)
2. Nach unten scrollen → **«Daten verwalten»**
3. Klick **«📥 Importieren»**
4. Wähle `reisedaten.json`
5. Daten sind jetzt offline auf dem Handy! ✅

## Tipps

- **GPS-Koordinaten:** Findest du auf Google Maps (Rechtsklick → Koordinaten kopieren)
- **Whatsapp-Link:** Format: `+66` + Nummer (Thailand beginnt mit +66)
- **Telefon-Link:** `tel:` funktioniert nur mit echten Nummern im Format `+66 XX XXXXXX`
- **Datum-Format:** Immer `YYYY-MM-DD` (2026-12-20)
- **Fehlende Infos:** `null` oder `""` verwenden
- **Begrüssung mit Namen:** Optional `"name": "DeinName"` im `reise`-Block – wird nur lokal angezeigt
- **Hotel-Foto:** Über den Foto-Knopf in der App hinzufügen (bleibt auf dem Gerät); das Feld `hotel.foto` musst du nicht von Hand füllen
- **Reihenfolge:** Die App sortiert die Tage automatisch nach Datum – die Reihenfolge in der Datei ist egal
- **Karte:** Die Routen-Karte entsteht aus den `gps`-Koordinaten der Hotels – je mehr Tage GPS haben, desto besser die Karte

## Beispiel: Minimale reisedaten.json

Wenn du nicht alles hast, funktioniert auch eine vereinfachte Version:

```json
{
  "reise": {
    "titel": "Thailand 2026",
    "start": "2026-12-20",
    "ende": "2027-01-16"
  },
  "tage": [
    {
      "datum": "2026-12-20",
      "wochentag": "Fr",
      "ort": "Bangkok",
      "hotel": {
        "name": "Hotel A",
        "adresse": "",
        "tel": "",
        "whatsapp": "",
        "checkin": "14:00",
        "gps": ""
      },
      "transfer": null,
      "hinweise": [],
      "programm": []
    }
  ],
  "tickets": [],
  "notfall": {}
}
```

---

**Fertig!** Deine Daten sind jetzt lokal in der App. Kein Cloud-Sync, 100% privat. 🔒
