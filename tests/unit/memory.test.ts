import { beforeAll, describe, expect, it } from 'vitest';
import { loadAirports, loadCities, loadCountries, loadGeoFeatures, loadTravelInfo, loadWorld110, loadWorld50 } from '../../src/data/loaders';
import { makeGameData, type GameData } from '../../src/game/engine';
import { CountryIndex } from '../../src/geo/countryIndex';
import { JOURNEYS } from '../../src/content/journeys';
import { createTrip } from '../../src/transport/trips';
import { buildRouteCtx } from '../../src/game/route';
import { buildGuide } from '../../src/game/guide';
import { buildMemoryQuiz, MEMORY_MIN } from '../../src/game/memory';
import { mulberry32 } from '../../src/game/rng';
import type { Airport, City, Stop } from '../../src/types';

let data: GameData, index: CountryIndex, cities: City[], airports: Airport[], drive: Record<string, 'l' | 'r'>, cc: Map<string, string>, geo: Awaited<ReturnType<typeof loadGeoFeatures>>;
beforeAll(async () => {
  const [c, w, w50, ci, ap, info, g] = await Promise.all([loadCountries(), loadWorld110(), loadWorld50(), loadCities(), loadAirports(), loadTravelInfo(), loadGeoFeatures()]);
  data = makeGameData(c, true, new Set(w.features.map((f) => f.properties.num)));
  index = new CountryIndex(w50); cities = ci; airports = ap; drive = info.drive; geo = g;
  cc = new Map(c.map((x) => [x.iso3, x.iso2]));
});
const JULY = Date.UTC(2027, 6, 1, 12);
const ctxFor = async (j: { mode: any; title: string; stops: Stop[]; id?: string }) => {
  const trip = await createTrip({ mode: j.mode, title: j.title, stops: j.stops, index, curatedId: j.id });
  return buildRouteCtx(trip, cities, cc, geo, { airports, drive, when: JULY });
};

describe('memory quiz', () => {
  it('every curated journey: well-formed questions, about what the guide told, in journey order', async () => {
    const counts: Record<string, number> = {};
    for (const j of JOURNEYS) {
      const r = await ctxFor(j);
      const qs = buildMemoryQuiz(r, data, mulberry32(1));
      counts[j.id] = qs.length;
      if (!qs.length) continue;
      expect(qs.length).toBeGreaterThanOrEqual(MEMORY_MIN);
      expect(qs.length).toBeLessThanOrEqual(8);
      expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
      const guideIds = new Set(buildGuide(r, data).map((f) => f.id));
      for (const q of qs) {
        expect(q.options!.length).toBeGreaterThanOrEqual(2);
        expect(new Set(q.options).size).toBe(q.options!.length);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.source?.url).toMatch(/^https:\/\//);
        // Each question matches a fact the guide told on this route.
        const [, kind, ...rest] = q.id.split('-');
        const key = rest.join('-');
        const told = kind === 'tz' ? [...guideIds].some((g) => g.startsWith('tz-'))
          : kind === 'legend' ? [...guideIds].some((g) => g.startsWith('legend-'))
          : kind === 'order' ? guideIds.has(`place-${key}`)
          : guideIds.has(`${kind}-${key}`);
        expect(told, `${j.id} ${q.id}`).toBe(true);
      }
    }
    // Most curated journeys have enough material.
    expect(Object.values(counts).filter((n) => n >= MEMORY_MIN).length).toBeGreaterThanOrEqual(Math.ceil(JOURNEYS.length * 0.6));
  });

  it('Trans-Siberian: clocks forward 7 h; the right answer is the true total', async () => {
    const r = await ctxFor(JOURNEYS.find((x) => x.id === 'transsib')!);
    const q = buildMemoryQuiz(r, data, mulberry32(3), 20).find((x) => x.id === 'mem-tz')!;
    expect(q).toBeTruthy();
    expect(q.options![q.answer!]).toBe('+7 h');
  });

  it('Paris → London by car: driving on the left in the UK', async () => {
    const stops: Stop[] = [{ name: 'Paris', lat: 48.8566, lng: 2.3522, cc: 'FR' }, { name: 'Calais', lat: 50.9513, lng: 1.8587, cc: 'FR' },
      { name: 'Folkestone', lat: 51.0814, lng: 1.1695, cc: 'GB' }, { name: 'London', lat: 51.5074, lng: -0.1278, cc: 'GB' }];
    const r = await ctxFor({ mode: 'car', title: 'Paris → London', stops });
    const qs = buildMemoryQuiz(r, data, mulberry32(5), 20);
    const d = qs.find((x) => x.id === 'mem-drive-GBR');
    expect(d && d.options![d.answer!]).toBe('On the left');
    const country = qs.find((x) => x.id === 'mem-country-GBR');
    if (country) expect(country.options).not.toContain('France');
  });
});
