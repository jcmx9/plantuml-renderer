#!/usr/bin/env node
// Dependency-freier Smoke-Test für plantuml-renderer.html.
// Extrahiert das Inline-<script> in eine vm-Sandbox und prüft die reine
// Pipeline (parsePlantUML → resolveItems → computeCriticalPath) sowie die
// Security-Helper. KEIN DOM nötig — die hier getesteten Funktionen sind
// DOM-frei (Canvas-Messung hat einen Node-Fallback).
//
//   node scripts/smoke-test.js
//
// Exit 0 = alles grün, Exit 1 = mindestens ein Check rot.
// Läuft lokal und in der CI (.github/workflows/ci.yml).

'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HTML = path.join(ROOT, 'plantuml-renderer.html');

// --- Inline-JS aus der HTML extrahieren (letzter <script>-Block am Dateiende) ---
const html = fs.readFileSync(HTML, 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i)
       || html.match(/<script>([\s\S]*)<\/script>/i);
if (!m) { console.error('FEHLER: kein <script>-Block in der HTML gefunden'); process.exit(1); }

const sandbox = { console };
vm.createContext(sandbox);
// Der DOMContentLoaded-Init-Block wirft ohne DOM — bewusst schlucken, die
// Funktions-Deklarationen sind davor schon im Kontext registriert.
try { vm.runInContext(m[1], sandbox, { timeout: 5000 }); } catch (e) { /* DOM-Init ignorieren */ }

const { parsePlantUML, resolveItems, computeCriticalPath, safeHref, safeColor } = sandbox;

let failures = 0;
function check(name, cond, detail) {
  const ok = !!cond;
  if (!ok) failures++;
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : '  → ' + (detail || '')}`);
}
function pipeline(puml) {
  const p = parsePlantUML(puml);
  const items = resolveItems(p.rawItems, p.closedDates, p.closedWeekdays, p.openOverrides);
  const cp = computeCriticalPath(items);
  return {
    parseWarnings: (p.parseWarnings || []).length,
    unresolved: (items._unresolvedDetails || []).length,
    critical: cp.criticalNodes,
    cycle: !!cp.cycleDetected,
  };
}

console.log('Funktionen exponiert:');
check('parsePlantUML', typeof parsePlantUML === 'function');
check('resolveItems', typeof resolveItems === 'function');
check('computeCriticalPath', typeof computeCriticalPath === 'function');
check('safeHref', typeof safeHref === 'function');
check('safeColor', typeof safeColor === 'function');
if (failures) { console.error('\nAbbruch: Kernfunktionen nicht im vm-Scope (Scope-Bruch im Script?)'); process.exit(1); }

console.log('\nSecurity-Helper:');
for (const [inp, exp] of [
  ['https://example.com', 'https://example.com'],
  ['mailto:a@b.de', 'mailto:a@b.de'],
  ['#anchor', '#anchor'],
  ['javascript:alert(1)', null],
  ['data:text/html,x', null],
  ['vbscript:x', null],
]) check(`safeHref(${JSON.stringify(inp)})`, safeHref(inp) === exp, `=> ${JSON.stringify(safeHref(inp))}`);
for (const [inp, exp] of [
  ['#fff', '#fff'],
  ['#a0c4ff', '#a0c4ff'],
  ['GreenYellow', 'GreenYellow'],
  ['#fff"onload=alert(1)', null],
  ['"><script>', null],
]) check(`safeColor(${JSON.stringify(inp)})`, safeColor(inp) === exp, `=> ${JSON.stringify(safeColor(inp))}`);

console.log('\nCPM-Verhalten (Komponenten-Ende):');
const side = pipeline(`@startgantt
Project starts 2026-01-01
[A] starts 2026-01-01 and lasts 10 days
[B] starts at [A]'s end and lasts 5 days
[C] starts at [A]'s end and lasts 2 days
@endgantt`);
check('Seitenkette: A,B kritisch', side.critical.has('A') && side.critical.has('B'));
check('Seitenkette: C NICHT kritisch (echter Slack)', !side.critical.has('C'), `kritisch=${[...side.critical].join(',')}`);

const iso = pipeline(`@startgantt
Project starts 2026-01-01
[A] starts 2026-01-01 and lasts 10 days
[B] starts at [A]'s end and lasts 5 days
[doc] starts 2026-07-01 and lasts 2 days
@endgantt`);
check('Isolierter Spät-Task entkritisiert Hauptkette nicht', iso.critical.has('A') && iso.critical.has('B'));

const lin = pipeline(`@startgantt
Project starts 2026-01-01
[A] starts 2026-01-01 and lasts 5 days
[B] starts at [A]'s end and lasts 5 days
[C] starts at [B]'s end and lasts 5 days
@endgantt`);
check('Lineare Kette: A,B,C alle kritisch', lin.critical.size === 3, `size=${lin.critical.size}`);

console.log('\nDatums-Semantik:');
const { parseDate, dateToISO, daysBetween } = sandbox;
function taskSpan(puml, name) {
  const p = parsePlantUML(puml);
  resolveItems(p.rawItems, p.closedDates, p.closedWeekdays, p.openOverrides);
  const t = p.rawItems.find(i => i.name === name);
  return `${dateToISO(t.start)}..${dateToISO(t.end)}`;
}
// Intern ist `end` exklusiv; PlantUML zählt den Endtag mit (requires 15 days ↔ D+0 … ends D+14).
check('starts/ends: Endtag zählt mit', taskSpan('Project starts 2026-01-05\n[A] starts 2026-01-05 and ends 2026-01-07', 'A') === '2026-01-05..2026-01-08');
check('starts/ends am selben Tag = 1 Tag', taskSpan('Project starts 2026-01-05\n[A] starts 2026-01-05 and ends 2026-01-05', 'A') === '2026-01-05..2026-01-06');
check('ends D+14 ≙ requires 15 days', taskSpan('Project starts 2020-07-01\n[A] starts D+0 and ends D+14', 'A') === taskSpan('Project starts 2020-07-01\n[A] starts D+0 and requires 15 days', 'A'));
check('lasts 3 days = 3 Tage', taskSpan('Project starts 2026-01-05\n[A] starts 2026-01-05 and lasts 3 days', 'A') === '2026-01-05..2026-01-08');
check('parseDate: Jahr 0020 bleibt 20 (nicht 1920)', parseDate('0020-01-05').getFullYear() === 20);
check('daysBetween über Zeitumstellung', daysBetween(parseDate('2026-03-28'), parseDate('2026-03-30')) === 2);

console.log('\nRepo-Dateien (Regression):');
const fixtures = [
  { file: 'example.puml', expectWarnings: 0, expectUnresolved: 0 },
  // Lokale Zusatzdatei (nicht getrackt) — wird übersprungen, wenn nicht vorhanden.
  { file: 'test-outer-labels.puml', expectWarnings: 0, expectUnresolved: 0 },
];
for (const fx of fixtures) {
  const fp = path.join(ROOT, fx.file);
  if (!fs.existsSync(fp)) { console.log(`  – ${fx.file} (nicht vorhanden, übersprungen)`); continue; }
  const r = pipeline(fs.readFileSync(fp, 'utf8'));
  check(`${fx.file}: parseWarnings=${fx.expectWarnings}`, r.parseWarnings === fx.expectWarnings, `ist ${r.parseWarnings}`);
  if (fx.expectUnresolved !== undefined)
    check(`${fx.file}: unresolved=${fx.expectUnresolved}`, r.unresolved === fx.expectUnresolved, `ist ${r.unresolved}`);
  check(`${fx.file}: kein Zyklus`, !r.cycle);
  console.log(`     (kritische Knoten: ${r.critical.size})`);
}

console.log(`\n${failures === 0 ? '✓ ALLE CHECKS GRÜN' : '✗ ' + failures + ' CHECK(S) ROT'}`);
process.exit(failures === 0 ? 0 : 1);
