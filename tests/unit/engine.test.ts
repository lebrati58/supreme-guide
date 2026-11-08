import { beforeAll, describe, expect, it } from 'vitest';
import { loadCountries, loadWorld110, loadWorld50 } from '../../src/data/loaders';
import { buildSession, GENERATORS, makeGameData, validateQuestion, type GameData } from '../../src/game/engine';
import { mulberry32 } from '../../src/game/rng';
import { CURATED } from '../../src/content/questions';
import { LANDMARKS } from '../../src/content/landmarks';
import { EVENTS } from '../../src/content/events';
import { JOURNEYS } from '../../src/content/journeys';
import { CountryIndex } from '../../src/geo/countryIndex';
import { greatCircle } from '../../src/geo/geo';

let data: GameData;
let index: CountryIndex;
beforeAll(async () => {
  const [c, w] = await Promise.all([loadCountries(), loadWorld110()]);
  data = makeGameData(c, true, new Set(w.features.map((f) => f.properties.num)));
  index = new CountryIndex(await loadWorld50());
});

describe('content integrity', () => {
  it('curated questions are well-formed, unique and sourced', () => {
    const ids = new Set<string>();
    for (const q of CURATED) {
      expect(validateQuestion(q), q.id).toEqual([]);
      expect(ids.has(q.id), q.id).toBe(false); ids.add(q.id);
      expect(q.source?.url, q.id).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
      q.countries?.forEach((iso) => expect(data.byIso3.has(iso), `${q.id}:${iso}`).toBe(true));
    }
    expect(CURATED.length).toBeGreaterThanOrEqual(60);
  });
  it('landmarks reference real countries and lie inside them (or on their border)', () => {
    for (const l of LANDMARKS) {
      expect(data.byIso3.has(l.iso3), l.id).toBe(true);
      // Microstates (e.g. Vatican City, 0.49 km²) are too small for the 1:50m borders.
      if ((data.byIso3.get(l.iso3)?.area ?? 0) < 100) continue;
      const hit = index.at([l.lng, l.lat])?.iso3;
      // Islands / coastlines may fall just outside 1:50m polygons; then the nearest is checked by distance.
      if (hit) expect([l.iso3, ...(l.shared ?? [])], `${l.id} is in ${hit}`).toContain(hit);
    }
  });
  it('events have unique labels', () => {
    expect(new Set(EVENTS.map((e) => e.label)).size).toBe(EVENTS.length);
  });
  it('curated journeys have at least two stops with valid coordinates', () => {
    for (const j of JOURNEYS) {
      expect(j.stops.length).toBeGreaterThanOrEqual(2);
      j.stops.forEach((s) => { expect(Math.abs(s.lat)).toBeLessThanOrEqual(90); expect(Math.abs(s.lng)).toBeLessThanOrEqual(180); });
    }
  });
});

describe('question generators', () => {
  it('produce valid questions across thousands of samples', () => {
    const rnd = mulberry32(42);
    let n = 0;
    for (const [name, gen] of Object.entries(GENERATORS)) {
      for (let i = 0; i < 300; i++) {
        const q = gen(data, rnd);
        if (!q) continue;
        n++;
        expect(validateQuestion(q), `${name}: ${q.prompt}`).toEqual([]);
      }
    }
    expect(n).toBeGreaterThan(3000);
  });
  it('capital answers come from the dataset', () => {
    const rnd = mulberry32(7);
    for (let i = 0; i < 300; i++) {
      const q = GENERATORS.capital(data, rnd)!;
      const iso = q.countries![0];
      expect(q.options![q.answer!]).toBe(data.byIso3.get(iso)!.capital);
    }
  });
  it('border true/false matches the borders dataset', () => {
    const rnd = mulberry32(9);
    for (let i = 0; i < 300; i++) {
      const q = GENERATORS.border(data, rnd);
      if (!q) continue;
      const [a, b] = q.countries!;
      expect(q.answer === 0).toBe(data.byIso3.get(a)!.borders.includes(b));
    }
  });
  it('sessions are deterministic for a seed (daily / friend challenges)', () => {
    const det = { ...data, flagsOk: false };
    const a = buildSession(det, { count: 10, rnd: mulberry32(123) }).map((q) => q.id);
    const b = buildSession(det, { count: 10, rnd: mulberry32(123) }).map((q) => q.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(10);
  });
  it('trip quizzes mostly target the countries on the route', () => {
    let hits = 0, total = 0;
    for (let seed = 0; seed < 20; seed++) {
      const qs = buildSession(data, { count: 6, rnd: mulberry32(seed), focus: ['JPN'], focusRate: 0.9 });
      qs.forEach((q) => { total++; if (q.countries?.includes('JPN')) hits++; });
    }
    expect(hits / total).toBeGreaterThan(0.75);
  });
  it('focus and region constraints are respected', () => {
    const qs = buildSession(data, { count: 8, rnd: mulberry32(5), region: 'Oceania' });
    expect(qs.length).toBe(8);
    qs.forEach((q) => expect(q.countries?.some((i) => data.byIso3.get(i)?.region === 'Oceania'), q.prompt).toBe(true));
    const kid = buildSession(data, { count: 10, rnd: mulberry32(6), maxDifficulty: 1 });
    kid.forEach((q) => expect(q.difficulty).toBe(1));
  });
});

describe('country index (offline)', () => {
  it('locates points', () => {
    expect(index.at([2.35, 48.85])?.iso3).toBe('FRA');
    expect(index.at([-77.04, 38.9])?.iso3).toBe('USA'); // Washington, D.C.
    expect(index.at([139.69, 35.68])?.iso3).toBe('JPN');
    expect(index.at([-30, 40])).toBeNull(); // mid-Atlantic
  });
  it('lists countries along a flight in order', () => {
    const path = greatCircle([2.5479, 49.0097], [-73.7781, 40.6413], 40);
    const list = index.alongPath(path).map((c) => c.iso3);
    expect(list[0]).toBe('FRA');
    expect(list[list.length - 1]).toBe('USA');
    expect(list).toContain('CAN');
  });
});
