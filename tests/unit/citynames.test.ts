import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadCities, loadCountries, loadWorld50 } from '../../src/data/loaders';
import { cityAllNames, cityName } from '../../src/i18n/content';
import { setLocale } from '../../src/i18n';
import { CountryIndex } from '../../src/geo/countryIndex';
import { JOURNEYS } from '../../src/content/journeys';
import { createTrip } from '../../src/transport/trips';
import { buildRouteCtx } from '../../src/game/route';
import { buildGuide } from '../../src/game/guide';
import { makeGameData } from '../../src/game/engine';
import type { City } from '../../src/types';

let cities: City[];
const norm = (x: string) => x.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const find = (q: string) => cities.filter((c) => cityAllNames(c).some((n) => norm(n).startsWith(norm(q))));

beforeAll(async () => { cities = await loadCities(); });
afterAll(() => setLocale('en'));

describe('city names in the game languages (GeoNames)', () => {
  it('loads names aligned with the cities', () => {
    const london = cities.find((c) => c.name === 'London' && c.cc === 'GB')!;
    expect(london.names).toBeDefined();
    expect(cities.filter((c) => c.names).length).toBeGreaterThan(5000);
  });

  it.each([['Londres', 'London'], ['לונדון', 'London'], ['Лондон', 'London'], ['伦敦', 'London'], ['pekin', 'Beijing'],
    ['Le Caire', 'Cairo'], ['München', 'Munich'], ['Moscou', 'Moscow'], ['ירושלים', 'Jerusalem'], ['القاهرة', 'Cairo']])('“%s” finds %s', (q, en) => {
    expect(find(q).map((c) => c.name)).toContain(en);
  });

  it('shows the name in the player language, falling back to the default name', async () => {
    const moscow = cities.find((c) => c.name === 'Moscow')!;
    await setLocale('fr'); expect(cityName(moscow)).toBe('Moscou');
    await setLocale('he'); expect(cityName(moscow)).toBe('מוסקבה');
    await setLocale('zh'); expect(cityName(moscow)).toBe('莫斯科');
    await setLocale('en'); expect(cityName(moscow)).toBe('Moscow');
    expect(cityName({ name: 'Nowhere' })).toBe('Nowhere');
  });

  it('the guide names towns on the route in the player language', async () => {
    const [c, w50] = await Promise.all([loadCountries(), loadWorld50()]);
    const data = makeGameData(c, true, new Set());
    const j = JOURNEYS.find((x) => x.id === 'transsib')!;
    const trip = await createTrip({ mode: j.mode, title: j.title, stops: j.stops, index: new CountryIndex(w50), curatedId: j.id });
    const route = buildRouteCtx(trip, cities, new Map(c.map((x) => [x.iso3, x.iso2])));
    await setLocale('ru');
    const towns = buildGuide(route, data).filter((f) => f.id.startsWith('place-') && f.icon === '🏙️');
    expect(towns.length).toBeGreaterThan(3);
    for (const f of towns) expect(f.title, f.title).toMatch(/[Ѐ-ӿ]/);
  });
});
