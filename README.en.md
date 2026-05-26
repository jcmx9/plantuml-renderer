# PlantUML Gantt Renderer

> Current version: **v26.5.32** (2026-05-26) · German version: [README.md](README.md)

Single-file web application that renders a subset of **PlantUML Gantt syntax** natively in the browser — no PlantUML server, no Java, no backend. Live-reload while editing the `.puml` source, critical-path highlighting, collapsible sections, reproducible export, A4 print.

```
~/GitHub/plantuml-renderer/plantuml-renderer.html   ← the only file
```

## Features

### Render engine
- **Fully client-side:** the supported PlantUML Gantt subset is parsed and rendered to SVG directly in the browser.
- **Live-reload:** polls the selected `.puml` file every 1 s and re-renders on change.
- **Robust live parsing:** per-line tolerant parser with heuristics (bracket imbalance, suspicious dates, keyword without pattern). Dummy tasks on syntax errors prevent dependent tasks from jumping back to the project start. The last successfully rendered state stays visible when errors occur.
- **Structured warning banner** with line numbers per issue. Plus lint warnings: **isolated items** (no predecessor, no successor, no dependency) and **plan conflicts** (predecessor ends after successor starts, for FS relationships).
- **Source preview** panel highlights faulty lines in red, opens automatically on problems.

### Visualisation
- **Critical path** (CPM, slack = 0) toggle: red outline around critical bars/milestones, red dependency arrows along the chain. Custom bar colours stay untouched (the outline frame is drawn outside the bar). The backward pass is **lag-aware** (`+ N days` offsets propagate slack correctly) and distinguishes **hard edges** (`afterTask`, predecessor's shift propagates) from **soft edges** (`->` arrows, logical ordering only). SS-relationships (`at [Y]'s start + N`) are treated correctly as parallel.
- **Adaptive time scale:** Year / Quarter / Month / ISO week / Date / Project day / Day-of-week depending on zoom. The year label is repeated every ~500 px so it remains readable while scrolling horizontally.
- **100 % zoom button:** sets the scale to `BAR_H` px/day (= 14) once — a constant value, independent of the date filter or browser width. For reproducible export: same `.puml` + same date filter + 100 % zoom → identical output.
- **Sticky header & label column** during scroll.
- **Dynamic label column:** width adapts between 200–500 px based on the longest task name.
- **Today line**, **weekend / holiday shading**, **progress overlay** (`is N% completed`), **custom colours** (`is colored in #hex/TextColor`).
- **Collapsible sections:** click a section header or use "Collapse all" / "Expand all".
- **Notes** rendered in the right-hand notes column. Multi-line `note bottom` + `end note` blocks attach automatically to the previously defined task/milestone.
- **Implicit project start:** if `Project starts` is missing in the `.puml`, the renderer derives the anchor from the earliest task/milestone → the `T+N` scale still works.

### Controls
- **Date filter** (from / to) as a manual override; "Auto" resets to autoWindow + scales to the browser width (sticky; re-fits on panel collapse, splitter drag, window resize).
- **Zoom** via buttons (+/−) or Ctrl + mouse wheel (cursor-anchored).
- **Tooltips** on bars/milestones/notes (XSS-safe via DOM API). For tasks: start, end, duration (days/weeks), completion (`is N% completed > 0`), direct predecessors and successors (with display labels from `[Display] as [alias]`). For milestones: date + predecessors/successors. The note text shows up in the hover tooltip even when the "Show notes" toggle is off.
- **Toggles:** milestones, notes, dependencies, critical path, auto-reload.
- **View buttons:** `100%` (fixed zoom at 14 px/day, for reproducible export) and `Auto` (sticky resize-fit + date window expanded to all tasks).

### Export
- **SVG** (vector, fully editable).
- **PNG** (4× supersampling).
- **PDF / A4 landscape print** (with the Source Sans 3 font embedded for font-faithful output).

### Persistence
- IndexedDB caches the last selected folder handle (no re-picking after reload) and the embedded print font.
- **No built-in versioning** — see [Versioning](#versioning).

---

## Installation & start

### Option 1: double-click (simplest)

```bash
open plantuml-renderer.html      # macOS
xdg-open plantuml-renderer.html  # Linux
start plantuml-renderer.html     # Windows
```

Caveat: the File System Access API (`showDirectoryPicker`) may be blocked when invoked via `file://`, depending on the browser version.

### Option 2: local Python web server (recommended)

```bash
cd ~/GitHub/plantuml-renderer
python3 -m http.server 8000
```

Then open in the browser:

```
http://localhost:8000/plantuml-renderer.html
```

Advantages:
- File System Access API works reliably.
- Source Sans 3 font loads cleanly from Google Fonts.
- IndexedDB origin is stable (`http://localhost:8000`) — persistence survives sessions.

**Browser requirement:** Chromium-based (Chrome ≥ 86, Edge, Brave, Arc, Vivaldi). **Safari & Firefox** do not support `showDirectoryPicker` — folder watch will not work there.

### First steps

1. Open the app in a browser.
2. Click **"Choose folder"** → select a directory containing `.puml` files.
3. Pick a file from the dropdown.
4. Edit the `.puml` file in your editor of choice (VSCodium, VSCode, Vim, …) and save → the app re-renders within 1 s.

---

## PlantUML syntax reference

This table lists **every construct supported by the renderer**. Anything not listed here is either silently ignored or reported as a warning. Order follows the chart layout (source order = row order).

### Project frame

| Syntax | Effect |
|---|---|
| `@startgantt` / `@enduml` / `@endgantt` | Diagram brackets (ignored, accepted for PlantUML compatibility). |
| `title Project label` | Title in the top-left header cell. |
| `Project starts 2026-01-01` | Anchor for `[X] lasts N days` tasks and the project-day scale (`T1, T2…`). |
| `saturday are closed` | Weekday as non-working day (`monday|…|sunday`). Skipped by `addWorkDays`. |
| `2026-12-25 is closed` | Single calendar day as non-working day (same behaviour). |
| `2026-12-24 to 2026-12-26 are closed` | Date range as non-working days (range is expanded into `closedDates`). |
| `2026-05-23 is open` | Reopen override: keeps a single day open even when e.g. `saturday are closed` applies. |

### Tasks

| Syntax | Meaning |
|---|---|
| `[Name] starts 2026-01-01 and ends 2026-01-10` | Absolute start and end. |
| `[Name] starts 2026-01-01 and lasts 5 days` | Absolute start + duration (working days). |
| `[Name] starts 2026-01-01 and lasts 2 weeks` | Duration in weeks (= 14 days). |
| `[Name] requires 1 week and 4 days` | Compound duration (= 11 days; PlantUML doc standard). |
| `[A] requires 5 days then [B] requires 3 days` | Single-line chaining: two tasks on one line. |
| `[Name] starts D+5 and requires 3 days` | `D+n` notation: relative to `Project starts` (D+0). |
| `[Name] ends D+10 and requires 2 days` | `D+n` also in the `ends` context. |
| `[Name] ends 2026-07-15` | Standalone `ends` — start derived from default duration 1. |
| `[Name] ends 2026-07-20 and requires 5 days` | `ends` anchor with duration: start computed backwards. |
| `[Span] occurs from [M1] to [M2]` | Task span between two milestones (or tasks). |
| `[Name] lasts 5 days` | Implicit start at `Project starts`. |
| `then [Name] lasts 3 days` | Starts right after the previously defined task. |
| `[Name] starts at [Other]'s end and lasts 3 days` | Relative constraint on the end of `[Other]`. |
| `[Name] starts at [Other]'s end + 2 days and lasts 5 days` | With offset (`+ N days/weeks`). |
| `[Name] starts at [Other]'s start and lasts 4 days` | Starts simultaneously with `[Other]`. |
| `[Name] starts 3 days after [Other]'s end and lasts 2 days` | Alternative `N days/weeks after` form. Offset is **calendar-day** (PlantUML spec). |
| `[Name] starts 3 working days after [Other]'s end and lasts 2 days` | Same, but the offset skips closed days (working-day arithmetic). |
| `[Name] starts at [Other]'s end and ends 2026-04-30` | Relative start + absolute end. |
| `[Name] starts 1 day before [Other]'s start` | Backward constraint (start relative-before pivot). |
| `[Name] starts 2 days before [Other]'s end and lasts 5 days` | Backward + duration. |
| `[Name] requires 5 days and ends at [Other]'s end` | Duration + end-anchor (start derived backwards). |
| `[Name] starts 1 day before [Y]'s start and ends at [Y]'s end` | Start and end anchored to the same pivot (doc example). |

> **Synonym:** `requires` is a 1:1 substitute for `lasts` everywhere (PlantUML doc standard). Example: `[Name] requires 5 days` ≡ `[Name] lasts 5 days`.

### Milestones

| Syntax | Meaning |
|---|---|
| `[Done] happens 2026-06-30` | Milestone at an absolute date. |
| `[Done] happens at [X]'s end` | At the end of a task. |
| `[Done] happens at [X]'s end + 5 days` | With positive offset. |
| `[Done] happens at [X]'s start` | At the start of a task. |
| `[Done] happens on 3 days after [X]'s end` | Alternative offset spelling. |
| `[Kickoff] happens on 5 days before [X]'s start` | Backward form (PlantUML doc-verified, milestones only). |

### Dependency arrows

| Syntax | Meaning |
|---|---|
| `[A] -> [B]` | Visual arrow from task A to task B; also a CPM edge. Does **not** shift any date. For real constraints, use `[B] starts at [A]'s end …`. |

### Modifiers (apply to the most recently defined item)

| Syntax | Meaning |
|---|---|
| `[A] is colored in #2980b9` | Bar/diamond fill. Hex colour. |
| `[A] is colored in #2980b9/white` | Fill plus text colour (`/` as separator). |
| `[A] is 75% completed` | Progress overlay (semi-transparent dark block on the bar). |
| `[A] links to [[https://example.com]]` | Hyperlink on the bar/milestone and the label-column text. Opens in a new tab. **Double** square brackets around the URL (PlantUML convention). |
| `[A] pauses on 2026-06-15` | Pause day (PlantUML directive). Task end shifts later by the number of pause days inside its range. |
| `[A] pauses on monday` | Pause weekday — every occurrence inside the task range is skipped. |

### Structure

| Syntax | Meaning |
|---|---|
| `-- Phase 1 --` | Section header (full-width dark bar). **Clickable** → collapse/expand. |
| `-- Detail [2] --` | Subsection (lighter bar with thin accent). Not clickable, but hides with its section. |
| `[Display] as [alias] starts …` | Alias trick: `[alias]` is the referenced ID, `Display` is the rendered label text. |

### Comments (internal, not rendered)

| Syntax | Meaning |
|---|---|
| `' Comment until end of line` | Single-line code comment (PlantUML convention). No effect on the render. |
| `/' Block comment '/` | Multi-line block comment; anything between the delimiters is ignored. |

### Diagram notes (visible in the chart)

| Syntax | Meaning |
|---|---|
| `note bottom` `…text…` `end note` | Multi-line note after a task/milestone. Attaches automatically to the most recently defined task/milestone; rendered in the right-hand notes column as the first line + ` …`. The hover tooltip shows the full text with line breaks. |

### Practical tips

- **Source order matters.** Tasks appear in the order they are written. Sections group visually but do not change the date logic.
- **Aliases for long names:** `[Implementation of the auth component] as [auth] starts …` keeps later references short.
- **Implicit temporal links:** tasks without `afterTask` but with absolute dates are attached, for the **critical path** only, to the most recent earlier task whose `end ≤ start`. The CP stays meaningful even for date-anchored tasks.

---

## Versioning

The renderer has **no** built-in snapshot/history feature. Version control happens externally:

1. Turn the `.puml` folder into a Git repo with `git init`.
2. Work in an editor with a Git panel — **VSCodium** (FOSS build of VSCode, with a PlantUML extension + built-in Source Control tab), VSCode, or any JetBrains IDE works fine.
3. Commit when you reach a milestone; `git push` for backup/sync.
4. Inspect an older version: `git checkout <commit> -- file.puml` → the renderer polls and re-renders automatically.

This "renderer = view, Git = manager" split keeps the renderer lean and uses established tools.

---

## Example file

The repository ships [`example.puml`](example.puml) — a complete sprint example with parallel streams that exercises virtually every supported syntax form: section + subsection, alias form, absolute and relative task constraints, multiple milestone variants, `then` form, `->` arrows, `is N% completed` / `is colored in #hex/textColor` modifiers, code and block comments, and a multi-line `note bottom` note.

Load the file in the renderer, enable "Highlight critical path" → the longest chain (Discovery → QA → Release) is outlined in red, while the parallel streams (auth middleware, migration) stay unmarked.

---

## Browser compatibility

| Browser | Status | Note |
|---|---|---|
| Chrome ≥ 86 | ✅ full | recommended |
| Edge (Chromium) | ✅ full | |
| Brave / Arc / Vivaldi | ✅ full | |
| Firefox | ⚠️ limited | no `showDirectoryPicker`, manual reload required |
| Safari | ⚠️ limited | same as Firefox |

---

## Licence

MIT — see [LICENSE](LICENSE).
