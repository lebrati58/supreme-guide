/**
 * Builds src/i18n/locales/en.json — the reference catalog — from:
 *   - UI strings (src/i18n/ui.ts)
 *   - game content (questions, landmarks, events, journeys, mascot, badges, ranks)
 *   - dataset labels (capitals, sub-regions) from public/data/countries.json
 * Run: npm run i18n          Check only (CI/tests): npm run i18n -- --check
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { UI } from '../src/i18n/ui';
import { slug } from '../src/i18n/slug';
import { CURATED } from '../src/content/questions';
import { LANDMARKS } from '../src/content/landmarks';
import { EVENTS } from '../src/content/events';
import { JOURNEYS } from '../src/content/journeys';
import { MASCOT_LINES } from '../src/content/mascotLines';
import { BADGES } from '../src/content/badges';
import { TITLES } from '../src/content/ranks';

const root = resolve(import.meta.dirname, '..');
const out: Record<string, string> = { ...UI };
const add = (k: string, v: string) => {
  if (out[k] !== undefined && out[k] !== v) throw new Error(`Duplicate catalog key with different text: ${k}`);
  out[k] = v;
};

for (const q of CURATED) {
  add(`q.${q.id}.q`, q.prompt);
  q.options?.forEach((o, i) => add(`q.${q.id}.o${i}`, o));
  add(`q.${q.id}.e`, q.explanation);
}
for (const l of LANDMARKS) {
  add(`lm.${l.id}.name`, l.name); add(`lm.${l.id}.city`, l.city); add(`lm.${l.id}.fact`, l.fact); add(`lm.${l.id}.clue`, l.clue);
}
for (const e of EVENTS) add(`ev.${slug(e.wiki)}`, e.label);
for (const j of JOURNEYS) {
  add(`jr.${j.id}.title`, j.title); add(`jr.${j.id}.blurb`, j.blurb);
  j.stops.forEach((s) => { add(`jr.${j.id}.${slug(s.name)}`, s.name); if (s.note) add(`stopnote.${slug(s.note)}`, s.note); });
}
for (const [mood, lines] of Object.entries(MASCOT_LINES)) lines.forEach((l, i) => add(`mascot.${mood}.${i}`, l));
for (const b of BADGES) { add(`badge.${b.id}.name`, b.name); add(`badge.${b.id}.desc`, b.desc); }
TITLES.forEach(([, name], i) => add(`rank.${i}`, name));

const countries = JSON.parse(readFileSync(resolve(root, 'public/data/countries.json'), 'utf8')) as { iso3: string; un: boolean; capitals: string[]; subregion: string }[];
for (const c of countries) {
  if (c.subregion) add(`subregion.${slug(c.subregion)}`, c.subregion);
  if (c.un) c.capitals.forEach((cap, i) => add(`cap.${c.iso3}.${i}`, cap));
}

const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
const json = JSON.stringify(sorted, null, 1) + '\n';
const file = resolve(root, 'src/i18n/locales/en.json');
if (process.argv.includes('--check')) {
  if (readFileSync(file, 'utf8') !== json) { console.error('en.json is out of date: run `npm run i18n`'); process.exit(1); }
  console.log('en.json up to date');
} else {
  writeFileSync(file, json);
  console.log(`en.json: ${Object.keys(sorted).length} keys`);
}
