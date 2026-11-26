import { beforeAll, describe, expect, it } from 'vitest';
import { loadCities, loadCountries, loadGeoFeatures, loadWorld110, loadWorld50 } from '../../src/data/loaders';
import { makeGameData, type GameData } from '../../src/game/engine';
import { CountryIndex } from '../../src/geo/countryIndex';
import { JOURNEYS } from '../../src/content/journeys';
import { createTrip } from '../../src/transport/trips';
import { buildRouteCtx } from '../../src/game/route';
import { buildCard, lines, routeCells, unlocked } from '../../src/game/bingo';
import { SPOT_BY_MODE, SPOT_ITEMS } from '../../src/content/bingo';
import { mulberry32 } from '../../src/game/rng';
import { MODES } from '../../src/types';

let data: GameData, index: CountryIndex, cities: Awaited<ReturnType<typeof loadCities>>, cc: Map<string, string>, geo: Awaited<ReturnType<typeof loadGeoFeatures>>;
beforeAll(async () => {
  const [c, w, w50, ci, g] = await Promise.all([loadCountries(), loadWorld110(), loadWorld50(), loadCities(), loadGeoFeatures()]);
  data = makeGameData(c, true, new Set(w.features.map((f) => f.properties.num)));
  index = new CountryIndex(w50); cities = ci; geo = g; cc = new Map(c.map((x) => [x.iso3, x.iso2]));
});

describe('road bingo', () => {
  it('every mode has enough distinct, known items for a 4×4 card', () => {
    const ids = new Set(SPOT_ITEMS.map((s) => s.id));
    expect(ids.size).toBe(SPOT_ITEMS.length);
    for (const m of MODES) {
      expect(new Set(SPOT_BY_MODE[m]).size, m).toBe(SPOT_BY_MODE[m].length);
      expect(SPOT_BY_MODE[m].length, m).toBeGreaterThanOrEqual(16);
      for (const id of SPOT_BY_MODE[m]) expect(ids.has(id), id).toBe(true);
    }
  });

  it('cards have the right size, no duplicates, and at most size−1 route cells', () => {
    const route = [1, 2, 3, 4, 5].map((i) => ({ id: `r-x-${i}`, emoji: '🏞️', label: `R${i}`, at: i / 10 }));
    for (let s = 1; s <= 30; s++) for (const size of [3, 4] as const) {
      const card = buildCard(MODES[s % MODES.length], size, mulberry32(s), route);
      expect(card.length).toBe(size * size);
      expect(new Set(card.map((c) => c.id)).size).toBe(card.length);
      expect(card.filter((c) => c.at !== undefined).length).toBeLessThanOrEqual(size - 1);
    }
  });

  it('lines: rows, columns and both diagonals', () => {
    expect(lines(3, new Set([0, 1, 2]))).toEqual([[0, 1, 2]]);
    expect(lines(3, new Set([0, 3, 6]))).toEqual([[0, 3, 6]]);
    expect(lines(3, new Set([0, 4, 8]))).toEqual([[0, 4, 8]]);
    expect(lines(3, new Set([2, 4, 6]))).toEqual([[2, 4, 6]]);
    expect(lines(3, new Set([0, 1, 5]))).toEqual([]);
    expect(lines(4, new Set(Array.from({ length: 16 }, (_, i) => i))).length).toBe(10);
  });

  it('route cells come from the route and unlock on approach', async () => {
    const j = JOURNEYS.find((x) => x.id === 'tokaido')!;
    const trip = await createTrip({ mode: j.mode, title: j.title, stops: j.stops, index, curatedId: j.id });
    const r = buildRouteCtx(trip, cities, cc, geo);
    const cells = routeCells(r, data);
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.some((c) => c.id === 'r-lm-fuji' || c.id.startsWith('r-peak-'))).toBe(true);
    const c = cells[0];
    expect(unlocked(c, c.at! - 0.1)).toBe(false);
    expect(unlocked(c, c.at!)).toBe(true);
    expect(unlocked(c, undefined)).toBe(true);
  });
});
