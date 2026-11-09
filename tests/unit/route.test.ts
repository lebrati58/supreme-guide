import { beforeAll, describe, expect, it } from 'vitest';
import { appendFileSync, writeFileSync } from 'node:fs';
import { loadCities, loadCountries, loadWorld110, loadWorld50 } from '../../src/data/loaders';
import { buildSession, GENERATORS, makeGameData, validateQuestion, type GameData } from '../../src/game/engine';
import { mulberry32 } from '../../src/game/rng';
import { CountryIndex } from '../../src/geo/countryIndex';
import { JOURNEYS } from '../../src/content/journeys';
import { createTrip } from '../../src/transport/trips';
import { buildRouteCtx, compassKey, type RouteCtx } from '../../src/game/route';
import { buildGuide, currentFactIndex } from '../../src/game/guide';
import type { City } from '../../src/types';

let data: GameData, index: CountryIndex, cities: City[];
const ctxs = new Map<string, RouteCtx>();
const LOG = process.env.ROUTE_LOG;

beforeAll(async () => {
  const [c, w, w50, ci] = await Promise.all([loadCountries(), loadWorld110(), loadWorld50(), loadCities()]);
  data = makeGameData(c, true, new Set(w.features.map((f) => f.properties.num)));
  index = new CountryIndex(w50);
  cities = ci;
  const cc = new Map(c.map((x) => [x.iso3, x.iso2]));
  for (const id of ['paris-marseille', 'tokaido', 'pch', 'transsib', 'eurostar', 'med-cruise']) {
    const j = JOURNEYS.find((x) => x.id === id)!;
    const trip = await createTrip({ mode: j.mode, title: j.title, stops: j.stops, index, curatedId: j.id });
    ctxs.set(id, buildRouteCtx(trip, cities, cc));
  }
  if (LOG) writeFileSync(LOG, '');
});

describe('route context', () => {
  it('finds the towns the TGV passes between Paris and Marseille, in order', () => {
    const r = ctxs.get('paris-marseille')!;
    const names = r.places.map((p) => p.name);
    expect(names[0]).toBe('Paris Gare de Lyon');
    expect(names[names.length - 1]).toBe('Marseille Saint-Charles');
    for (let i = 1; i < r.places.length; i++) expect(r.places[i].at).toBeGreaterThanOrEqual(r.places[i - 1].at);
    expect(r.places.length).toBeGreaterThan(4);
    expect(r.landmarks.length).toBeGreaterThanOrEqual(0);
  });
  it('computes direction and distance', () => {
    const r = ctxs.get('paris-marseille')!;
    expect(compassKey(r.bearingDeg)).toBe('s'); // Paris → Marseille is roughly south (bearing ~158°)
    expect(r.distanceKm).toBeGreaterThan(600);
    expect(r.distanceKm).toBeLessThan(700);
    expect(compassKey(ctxs.get('tokaido')!.bearingDeg)).toBe('w');
  });
});

describe('trip quizzes stay on the route', () => {
  it.each(['paris-marseille', 'tokaido', 'pch', 'transsib', 'eurostar', 'med-cruise'])('%s', (id) => {
    const route = ctxs.get(id)!;
    const iso = new Set(route.countries.map((c) => c.iso3));
    let routeSpecific = 0, total = 0;
    for (let seed = 1; seed <= 15; seed++) {
      const qs = buildSession(data, { count: 6, rnd: mulberry32(seed), route });
      for (const q of qs) {
        total++;
        expect(validateQuestion(q), q.prompt).toEqual([]);
        expect(q.countries?.some((c) => iso.has(c)), `${id}: off-route question: ${q.prompt}`).toBe(true);
        if (q.id.startsWith('r-')) routeSpecific++;
        if (LOG && seed <= 2) appendFileSync(LOG, `${id} | ${q.id.slice(0, 18)} | ${q.prompt}\n`);
      }
    }
    expect(total).toBeGreaterThan(40);
    expect(routeSpecific / total, `${id}: share of route-specific questions`).toBeGreaterThan(0.45);
  });

  it('route generators produce valid questions', () => {
    const rnd = mulberry32(3);
    for (const route of ctxs.values()) for (const [name, gen] of Object.entries(GENERATORS)) {
      if (!name.startsWith('r')) continue;
      for (let i = 0; i < 20; i++) { const q = gen(data, rnd, undefined, route); if (q) expect(validateQuestion(q), q.prompt).toEqual([]); }
    }
  });
});

describe('guide mode', () => {
  it.each(['paris-marseille', 'tokaido', 'transsib', 'med-cruise'])('%s: facts follow the route, from departure to arrival', (id) => {
    const route = ctxs.get(id)!;
    const facts = buildGuide(route, data, [], '🚆');
    expect(facts.length).toBeGreaterThan(6);
    expect(facts[0].id).toBe('start');
    expect(facts[facts.length - 1].id).toBe('end');
    for (let i = 1; i < facts.length; i++) expect(facts[i].at).toBeGreaterThanOrEqual(facts[i - 1].at);
    for (const f of facts) {
      expect(f.title.length, f.id).toBeGreaterThan(0);
      expect(f.text.length, f.id).toBeGreaterThan(5);
      expect(f.title + f.text, f.id).not.toMatch(/\{\w+\}/);
    }
    expect(facts.some((f) => f.id.startsWith('country-'))).toBe(true);
    expect(facts.some((f) => f.id.startsWith('place-'))).toBe(true);
    if (LOG) appendFileSync(LOG, facts.slice(0, 12).map((f) => `GUIDE ${id} ${f.at.toFixed(2)} ${f.icon} ${f.title} — ${f.text}`).join('\n') + '\n');
  });
  it('tracks the current fact as the trip progresses', () => {
    const facts = buildGuide(ctxs.get('paris-marseille')!, data, [], '🚆');
    expect(currentFactIndex(facts, 0)).toBeLessThan(currentFactIndex(facts, 0.5));
    expect(facts[currentFactIndex(facts, 1)].id).toBe('end');
  });
});
