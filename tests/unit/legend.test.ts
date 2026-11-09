import { beforeAll, describe, expect, it } from 'vitest';
import { loadCities, loadCountries, loadWorld110, loadWorld50 } from '../../src/data/loaders';
import { buildSession, makeGameData, validateQuestion, type GameData } from '../../src/game/engine';
import { mulberry32 } from '../../src/game/rng';
import { CountryIndex } from '../../src/geo/countryIndex';
import { JOURNEYS } from '../../src/content/journeys';
import { LEGENDS } from '../../src/content/legendary';
import { createTrip } from '../../src/transport/trips';
import { buildRouteCtx, type RouteCtx } from '../../src/game/route';
import { buildGuide } from '../../src/game/guide';

let data: GameData;
const ctxs = new Map<string, RouteCtx>();

beforeAll(async () => {
  const [c, w, w50, cities] = await Promise.all([loadCountries(), loadWorld110(), loadWorld50(), loadCities()]);
  data = makeGameData(c, true, new Set(w.features.map((f) => f.properties.num)));
  const index = new CountryIndex(w50);
  const cc = new Map(c.map((x) => [x.iso3, x.iso2]));
  for (const l of LEGENDS) {
    const j = JOURNEYS.find((x) => x.id === l.journey)!;
    const trip = await createTrip({ mode: j.mode, title: j.title, stops: j.stops, index, curatedId: j.id });
    ctxs.set(l.journey, buildRouteCtx(trip, cities, cc));
  }
});

describe('legendary journeys', () => {
  it('has exactly ten, each tied to a curated journey', () => {
    expect(LEGENDS).toHaveLength(10);
    expect(new Set(LEGENDS.map((l) => l.journey)).size).toBe(10);
    for (const l of LEGENDS) expect(JOURNEYS.some((j) => j.id === l.journey), l.journey).toBe(true);
  });

  it.each(LEGENDS.map((l) => [l.journey, l] as const))('%s: content is consistent', (_id, l) => {
    const j = JOURNEYS.find((x) => x.id === l.journey)!;
    const stops = new Set(j.stops.map((s) => s.name));
    for (const f of l.facts) expect(stops.has(f.stop), `${l.journey}: unknown stop ${f.stop}`).toBe(true);
    expect(l.facts.length).toBeGreaterThanOrEqual(5);
    expect(l.questions.length).toBe(5);
    for (const q of l.questions) {
      expect(q.o.length).toBe(4);
      expect(new Set(q.o).size).toBe(4);
      expect(q.a).toBeGreaterThanOrEqual(0);
      expect(q.a).toBeLessThan(4);
    }
    expect(l.local.phrases.map((p) => p.key).sort()).toEqual(['bye', 'hello', 'please', 'sorry', 'thanks', 'yesno']);
  });

  it.each(LEGENDS.map((l) => l.journey))('%s: questions appear in trip quizzes with the right answer', (id) => {
    const route = ctxs.get(id)!;
    const l = LEGENDS.find((x) => x.journey === id)!;
    let n = 0;
    for (let seed = 1; seed <= 10; seed++) {
      for (const q of buildSession(data, { count: 6, rnd: mulberry32(seed), route })) {
        expect(validateQuestion(q)).toEqual([]);
        if (!q.id.startsWith('legend-')) continue;
        n++;
        const src = l.questions.find((x) => q.id === `legend-${id}-${x.id}`)!;
        expect(q.options![q.answer!]).toBe(src.o[src.a]);
      }
    }
    expect(n).toBeGreaterThan(10);
  });

  it.each(LEGENDS.map((l) => l.journey))('%s: the guide tells every story at its stop', (id) => {
    const route = ctxs.get(id)!;
    const l = LEGENDS.find((x) => x.journey === id)!;
    const facts = buildGuide(route, data);
    const told = facts.filter((f) => f.id.startsWith('legend-'));
    expect(told).toHaveLength(l.facts.length);
    for (let i = 1; i < facts.length; i++) expect(facts[i].at).toBeGreaterThanOrEqual(facts[i - 1].at);
  });
});
