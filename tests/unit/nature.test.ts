import { beforeAll, describe, expect, it } from 'vitest';
import { loadCities, loadCountries, loadGeoFeatures, loadWorld110, loadWorld50 } from '../../src/data/loaders';
import { buildSession, makeGameData, validateQuestion, type GameData } from '../../src/game/engine';
import { mulberry32 } from '../../src/game/rng';
import { CountryIndex } from '../../src/geo/countryIndex';
import { JOURNEYS } from '../../src/content/journeys';
import { createTrip } from '../../src/transport/trips';
import { buildRouteCtx, type RouteCtx } from '../../src/game/route';
import { buildGuide, localSay } from '../../src/game/guide';
import { sideOf, type GeoFeatures } from '../../src/game/nature';
import type { LngLat } from '../../src/types';

let data: GameData;
const ctxs = new Map<string, RouteCtx>();
let geo: GeoFeatures;

beforeAll(async () => {
  const [c, w, w50, cities, g] = await Promise.all([loadCountries(), loadWorld110(), loadWorld50(), loadCities(), loadGeoFeatures()]);
  geo = g;
  data = makeGameData(c, true, new Set(w.features.map((f) => f.properties.num)));
  const index = new CountryIndex(w50);
  const cc = new Map(c.map((x) => [x.iso3, x.iso2]));
  for (const id of ['transsib', 'glacier', 'paris-marseille', 'tokaido']) {
    const j = JOURNEYS.find((x) => x.id === id)!;
    const trip = await createTrip({ mode: j.mode, title: j.title, stops: j.stops, index, curatedId: j.id });
    ctxs.set(id, buildRouteCtx(trip, cities, cc, geo));
  }
});

describe('left / right', () => {
  const north: { p: LngLat; at: number }[] = Array.from({ length: 11 }, (_, k) => ({ p: [10, 45 + k * 0.1] as LngLat, at: k / 10 }));
  it('travelling north, east is on the right and west on the left', () => {
    expect(sideOf(north, [10.3, 45.5])).toBe('right');
    expect(sideOf(north, [9.7, 45.5])).toBe('left');
    expect(sideOf(north, [10, 45.5])).toBeUndefined(); // on the path
  });
  it('no left/right cue near an approximate (stop-to-stop) line: Mount Fuji is ~5 km from it', () => {
    // The drawn Tōkaidō line is straight between stations and passes north of Fuji, while the real
    // track runs south of it (Fuji on the right): a cue here would be wrong, so none is given.
    const fuji = ctxs.get('tokaido')!.nature.peaks.find((p) => p.name === 'Mount Fuji');
    expect(fuji).toBeDefined();
    expect(fuji!.side).toBeUndefined();
  });
});

describe('rivers, ranges and peaks along real routes', () => {
  it('the Trans-Siberian crosses the Volga, the Irtysh, the Ob, the Angara and the Amur, in that order', () => {
    const names = ctxs.get('transsib')!.nature.rivers.map((r) => r.name);
    for (const r of ['Volga', 'Irtysh', 'Ob', 'Angara', 'Amur']) expect(names, names.join(', ')).toContain(r);
    expect(names.indexOf('Volga')).toBeLessThan(names.indexOf('Ob'));
    expect(names.indexOf('Ob')).toBeLessThan(names.indexOf('Amur'));
  });
  it('the Glacier Express goes through the Alps and sees the Matterhorn', () => {
    const r = ctxs.get('glacier')!;
    expect(r.nature.regions.map((g) => g.name)).toContain('Alps');
    expect(r.nature.peaks.map((p) => p.name)).toContain('Matterhorn');
  });
  it('Paris → Marseille by TGV crosses the Rhône', () => {
    expect(ctxs.get('paris-marseille')!.nature.rivers.map((r) => r.name)).toContain('Rhône');
  });
  it('the guide tells them, and questions about them are valid', () => {
    const r = ctxs.get('transsib')!;
    const facts = buildGuide(r, data);
    expect(facts.some((f) => f.id === 'river-Ob')).toBe(true);
    let n = 0;
    for (let seed = 1; seed <= 20; seed++) for (const q of buildSession(data, { count: 8, rnd: mulberry32(seed), route: r })) {
      expect(validateQuestion(q)).toEqual([]);
      if (/^r-(river|region|peak)/.test(q.id)) n++;
    }
    expect(n).toBeGreaterThan(5);
  });
});

describe('local pronunciation', () => {
  it('uses the local language of single-language countries (and Hebrew in Israel)', () => {
    const rus = data.byIso3.get('RUS')!, isr = data.byIso3.get('ISR')!, che = data.byIso3.get('CHE')!;
    expect(localSay(rus, 'Moscow', ['', '', '', '', '', '', 'Москва', '', '', ''])).toEqual({ text: 'Москва', lang: 'ru-RU' });
    expect(localSay(isr, 'Haifa', ['', '', '', '', '', '', '', 'חיפה', '', ''])).toEqual({ text: 'חיפה', lang: 'he-IL' });
    expect(localSay(rus, 'Nowhere', undefined)).toBeUndefined(); // no Cyrillic name known: no guessing
    expect(localSay(che, 'Zürich', undefined)).toBeUndefined(); // several official languages
  });
});
