# PlantUML Gantt Renderer

> Aktuelle Version: **v26.5.19** (2026-05-23) · English version: [README.en.md](README.en.md)

Single-File-Webanwendung, die eine Teilmenge der **PlantUML-Gantt-Syntax** im Browser nativ rendert — ohne PlantUML-Server, ohne Java, ohne Backend. Live-Reload beim Editieren der `.puml`-Datei, kritischer-Pfad-Highlighting, klappbare Sections, reproduzierbarer Export, A4-Druck.

```
~/GitHub/plantuml-renderer/plantuml-renderer.html   ← die einzige Datei
```

## Features

### Render-Engine

- **Vollständig client-seitig:** PlantUML-Gantt-Subset wird direkt im Browser geparst und als SVG gerendert.
- **Live-Reload:** Polling der gewählten `.puml`-Datei alle 1 s; bei Änderung sofortiges Re-Rendering.
- **Robustes Live-Parsen:** pro-Zeile-toleranter Parser mit Heuristiken (Eckklammer-Imbalance, verdächtiges Datum, Keyword ohne Muster). Dummy-Tasks bei Syntaxfehlern verhindern, dass Nachfolger an den Projektanfang zurückspringen. Letzter erfolgreich gerenderter Stand bleibt bei Fehlern sichtbar.
- **Strukturiertes Warn-Banner** mit Zeilennummern pro Fehler.
- **Source-Preview** im Panel mit rot markierten Fehlerzeilen, automatisch eingeblendet bei Problemen.

### Visualisierung

- **Kritischer Pfad** (CPM, Slack=0) per Toggle: rote Outline um kritische Bars/Milestones, rote Kanten auf den Pfeilen entlang der Kette. Manuelle Bar-Farben bleiben unangetastet (Outline-Frame außerhalb des Balkens).
- **Zeitachse adaptiv:** Year / Quarter / Month / KW / Datum / Projekttag / Wochentag je nach Zoomstufe. Das Year-Label wird bei breiten Year-Ticks alle ~500 px wiederholt, damit es bei horizontalem Scrollen immer ablesbar bleibt.
- **100%-Zoom-Button:** setzt die Skala einmalig auf `BAR_H` px/Tag (= 14) — konstanter Wert, unabhängig von Datums-Filter oder Browser-Breite. Für reproduzierbaren Export: gleiche `.puml` + gleicher Datums-Filter + 100%-Zoom → identischer Output.
- **Sticky-Header & Sticky-Label-Spalte** beim Scrollen.
- **Dynamische Label-Spalte:** automatische Breite zwischen 200–500 px je nach längstem Task-Namen.
- **Heute-Linie**, **Wochenend-/Feiertags-Shading**, **Progress-Overlay** (`is N% completed`), **Custom-Farben** (`is colored in #hex/TextColor`).
- **Sections einklappbar:** Klick auf Section-Header oder Buttons "Alle einklappen" / "Alle ausklappen".
- **Notizen** in der rechten Notiz-Spalte. Mehrzeilig via `note bottom` + `end note`-Block, hängt automatisch am vorhergehenden Task/Milestone.
- **Projektanfang implizit:** Wenn `Project starts` in der `.puml` fehlt, leitet der Renderer den Anfang aus dem frühesten Task/Milestone ab → `T+N`-Skala funktioniert auch ohne explizite Direktive.

### Bedienung

- **Datums-Filter** (Von / Bis) als manuelle Override; "Auto" resettet auf autoWindow + skaliert auf Browser-Breite (sticky, neu fitten bei Panel-Collapse, Splitter-Drag, Window-Resize).
- **Zoom** per Buttons (+/−), Reset oder Strg+Mausrad (Cursor-fokussiert).
- **Tooltips** auf Bars/Milestones/Notes (XSS-sicher via DOM-API). Notiz-Text erscheint auch dann im Hover-Tooltip, wenn der „Notizen anzeigen"-Toggle aus ist.
- **Toggles:** Meilensteine, Notizen, Abhängigkeiten, Kritischer Pfad, Auto-Reload.
- **Ansicht-Buttons:** `100%` (fixer Zoom auf 14 px/Tag), `Reset` (Auto-Zoom fürs aktuelle Fenster, sticky Resize-Fit, Datums-Filter bleibt), `Auto` (wie Reset, plus Datums-Fenster auf alle Tasks).

### Export

- **SVG** (vektoriell, beliebig nachbearbeitbar).
- **PNG** (4× Supersampling).
- **PDF / Drucken A4 Quer** (mit eingebetteter Source-Sans-3 für schriftgenauen Druck).

### Persistenz

- IndexedDB cached den zuletzt gewählten Ordner-Handle (kein Re-Picken nach Reload) und die eingebettete Druck-Font.
- **Keine eingebaute Versionierung** — siehe [Versionierung](#versionierung).

---

## Installation & Start

### Variante 1: Doppelklick (einfachste Form)

```bash
open plantuml-renderer.html      # macOS
xdg-open plantuml-renderer.html  # Linux
start plantuml-renderer.html     # Windows
```

Funktioniert mit Einschränkung: die File-System-Access-API (`showDirectoryPicker`) kann je nach Browser-Version per `file://`-Aufruf blockiert sein.

### Variante 2: Lokaler Python-Webserver (empfohlen)

```bash
cd ~/GitHub/plantuml-renderer
python3 -m http.server 8000
```

Dann im Browser öffnen:

```
http://localhost:8000/plantuml-renderer.html
```

Vorteile:

- File-System-Access-API funktioniert zuverlässig.
- Source-Sans-3-Font lädt sauber von Google Fonts.
- IndexedDB-Origin ist stabil (`http://localhost:8000`) — Persistenz bleibt zwischen Sessions.

**Browser-Anforderung:** Chromium-basiert (Chrome ≥ 86, Edge, Brave, Arc, Vivaldi). **Safari & Firefox** unterstützen `showDirectoryPicker` nicht — Ordner-Watch funktioniert dort nicht.

### Erste Schritte

1. Browser öffnen, App laden.
2. **"Ordner wählen"** klicken → Verzeichnis mit `.puml`-Dateien auswählen.
3. Datei aus dem Dropdown wählen.
4. Im Editor (z. B. VSCodium, VSCode, Vim) die `.puml`-Datei editieren und speichern → App rendert binnen 1 s neu.

---

## PlantUML-Syntax-Referenz

Diese Tabelle zeigt **alle Konstrukte, die der Renderer unterstützt**. Alles, was hier nicht steht, wird stillschweigend ignoriert oder als Warnung gemeldet. Die Reihenfolge entspricht dem Layout im Chart (Source-Order = Zeilen-Order).

### Projekt-Rahmen

| Syntax                                  | Wirkung                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------- | --- | -------------------------------------------- |
| `@startgantt` / `@enduml` / `@endgantt` | Diagramm-Klammer (ignoriert, akzeptiert für PlantUML-Kompatibilität).        |
| `title Projektbezeichnung`              | Titel oben in der Label-Spalte des SVG-Headers.                              |
| `Project starts 2026-01-01`             | Anker für `[X] lasts N days`-Tasks und für die Projekttag-Skala (`T1, T2…`). |
| `saturday are closed`                   | Wochentag als Nicht-Arbeitstag (`monday                                      | …   | sunday`). Wird in`addWorkDays` übersprungen. |
| `2026-12-25 is closed`                  | Einzelner Kalendertag als Nicht-Arbeitstag (gleiches Verhalten).             |

### Tasks

| Syntax                                                      | Bedeutung                                          |
| ----------------------------------------------------------- | -------------------------------------------------- |
| `[Name] starts 2026-01-01 and ends 2026-01-10`              | Absolute Start- und End-Daten.                     |
| `[Name] starts 2026-01-01 and lasts 5 days`                 | Absoluter Start + Dauer (Arbeitstage).             |
| `[Name] starts 2026-01-01 and lasts 2 weeks`                | Dauer in Wochen (= 14 Tage).                       |
| `[Name] lasts 5 days`                                       | Implizit ab `Project starts`.                      |
| `then [Name] lasts 3 days`                                  | Beginnt direkt nach dem zuletzt definierten Task.  |
| `[Name] starts at [Other]'s end and lasts 3 days`           | Relative Abhängigkeit auf das Ende von `[Other]`.  |
| `[Name] starts at [Other]'s end + 2 days and lasts 5 days`  | Mit Offset (`+ N days/weeks`).                     |
| `[Name] starts at [Other]'s start and lasts 4 days`         | Beginnt zeitgleich mit `[Other]`.                  |
| `[Name] starts 3 days after [Other]'s end and lasts 2 days` | Alternative Schreibweise mit `N days/weeks after`. |
| `[Name] starts at [Other]'s end and ends 2026-04-30`        | Mischung relativ-/absolut-Ende.                    |

### Meilensteine

| Syntax                                     | Bedeutung                        |
| ------------------------------------------ | -------------------------------- |
| `[Done] happens 2026-06-30`                | Milestone an absolutem Datum.    |
| `[Done] happens at [X]'s end`              | Am Ende eines Tasks.             |
| `[Done] happens at [X]'s end + 5 days`     | Mit positivem Offset.            |
| `[Done] happens at [X]'s start`            | Am Anfang eines Tasks.           |
| `[Done] happens on 3 days after [X]'s end` | Alternative Offset-Schreibweise. |

### Abhängigkeitspfeile

| Syntax       | Bedeutung                                                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[A] -> [B]` | Visueller Pfeil von Task A nach Task B im Chart; zusätzlich CPM-Kante. Verschiebt **kein** Datum. Für echte Constraints `[B] starts at [A]'s end …` verwenden. |

### Modifier (auf zuletzt definiertes Item)

| Syntax                                 | Bedeutung                                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `[A] is colored in #2980b9`            | Bar-/Diamond-Fill. Hex-Farbe.                                                                                                           |
| `[A] is colored in #2980b9/white`      | Fill plus Textfarbe (`/` als Trenner).                                                                                                  |
| `[A] is 75% completed`                 | Progress-Overlay (halbtransparenter dunkler Block auf der Bar).                                                                         |
| `[A] links to [[https://example.com]]` | Hyperlink auf Bar/Milestone und Label-Spalten-Text. Öffnet im neuen Tab. **Doppelte** eckige Klammern um die URL (PlantUML-Konvention). |

### Strukturierung

| Syntax                          | Bedeutung                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `-- Phase 1 --`                 | Section-Header (dunkler Balken über volle Breite). **Klickbar** → ein-/ausklappbar.              |
| `-- Detail [2] --`              | Subsection (heller Balken, schmaler Akzent). Nicht klickbar, aber wird mit Section ausgeblendet. |
| `[Display] as [alias] starts …` | Alias-Trick: `[alias]` ist die referenzierbare ID, `Display` der angezeigte Label-Text.          |

### Kommentare (intern, nicht gerendert)

| Syntax                       | Bedeutung                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `' Kommentar bis Zeilenende` | Einzeiliger Code-Kommentar (PlantUML-Konvention). Hat keinen Einfluss auf den Render. |
| `/' Block-Kommentar '/`      | Mehrzeiliger Block-Kommentar; alles dazwischen wird ignoriert.                        |

### Diagramm-Notizen (im Chart sichtbar)

| Syntax                            | Bedeutung                                                                                                                                                                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `note bottom` `…Text…` `end note` | Mehrzeilige Notiz nach einem Task/Milestone. Hängt automatisch am zuletzt definierten Task/Milestone, wird in der rechten Notiz-Spalte als erste Zeile + `…` gerendert; der Tooltip beim Hover zeigt den vollen Text mit Zeilenumbrüchen. |

### Tipps zur Praxis

- **Source-Order zählt.** Tasks erscheinen in der Reihenfolge, in der sie geschrieben werden. Sections gruppieren visuell, ändern aber keine Datums-Logik.
- **Aliasse für lange Namen:** `[Implementierung der Auth-Komponente] as [auth] starts …` macht spätere Referenzen kurz.
- **Implizit-temporal:** Tasks ohne `afterTask` aber mit absolutem Datum werden im **kritischen Pfad** automatisch dem in der Source-Ordnung letzten Vorgänger angehängt, dessen `end ≤ start` ist. So bleibt der CP auch bei Datums-Tasks aussagekräftig.

---

## Versionierung

Der Renderer hat **keine** eingebaute Snapshot-/History-Funktion. Versionsverwaltung läuft extern:

1. `.puml`-Ordner mit `git init` zum Repo machen.
2. In einem Editor mit Git-Panel arbeiten — **VSCodium** (FOSS-Build von VSCode, mit PlantUML-Extension + eingebauter Source-Control-Tab), VSCode oder JetBrains IDEs sind alle geeignet.
3. Beim Speichern committen wenn Meilenstein erreicht; `git push` für Backup/Sync.
4. Alte Version anschauen: `git checkout <commit> -- file.puml` → Renderer pollt, rendert automatisch.

Diese Trennung "Renderer = View, Git = Verwalter" hält den Renderer schlank und nutzt etablierte Tools.

---

## Beispiel-Datei

Im Repo liegt [`example.puml`](example.puml) — ein vollständiges Sprint-Beispiel mit parallelen Streams, das praktisch jede unterstützte Syntax-Form einmal zeigt: Section + Subsection, Alias-Form, absolute und relative Task-Constraints, mehrere Milestone-Varianten, `then`-Form, `->`-Pfeile, `is N% completed` / `is colored in #hex/textColor`-Modifier, Code- und Block-Kommentare sowie eine mehrzeilige `note bottom`-Notiz.

Lade die Datei im Renderer, aktiviere „Kritischen Pfad hervorheben" → die längste Pfadkette (Discovery → QA → Release) ist rot umrandet, die parallelen Streams (Auth-Middleware, Migration) bleiben unmarkiert.

---

## Browser-Kompatibilität

| Browser               | Status           | Anmerkung                                          |
| --------------------- | ---------------- | -------------------------------------------------- |
| Chrome ≥ 86           | ✅ vollständig   | empfohlen                                          |
| Edge (Chromium)       | ✅ vollständig   |                                                    |
| Brave / Arc / Vivaldi | ✅ vollständig   |                                                    |
| Firefox               | ⚠️ eingeschränkt | kein `showDirectoryPicker`, manueller Reload nötig |
| Safari                | ⚠️ eingeschränkt | wie Firefox                                        |

---

## Lizenz

MIT — siehe [LICENSE](LICENSE).
