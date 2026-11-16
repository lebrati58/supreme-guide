import { beforeAll, describe, expect, it } from 'vitest';
import { loadAirports, loadCities, loadCountries, loadTravelInfo, loadWorld110, loadWorld50 } from '../../src/data/loaders';
import { makeGameData, type GameData } from '../../src/game/engine';
import { CountryIndex } from '../../src/geo/countryIndex';
import { JOURNEYS } from '../../src/content/journeys';
import { createTrip } from '../../src/transport/trips';
import { buildRouteCtx } from '../../src/game/route';
import { buildGuide } from '../../src/game/guide';
import { formatShift, formatUtc, tzOffsetMin } from '../../src/game/practical';
import type { Airport, City, Stop } from '../../src/types';

let data: GameData, index: CountryIndex, cities: City[], airports: Airport[], drive: Record<string, 'l' | 'r'>, cc: Map<string, string>;
beforeAll(async () => {
  const [c, w, w50, ci, ap, info] = await Promise.all([loadCountries(), loadWorld110(), loadWorld50(), loadCities(), loadAirports(), loadTravelInfo()]);
  data = makeGameData(c, true, new Set(w.features.map((f) => f.properties.num)));
  index = new CountryIndex(w50); cities = ci; airports = ap; drive = info.drive;
  cc = new Map(c.map((x) => [x.iso3, x.iso2]));
});

const JULY = Date.UTC(2027, 6, 1, 12);
const JANUARY = Date.UTC(2027, 0, 15, 12);

describe('time zones', () => {
  it('offsets follow daylight saving time', () => {
    expect(tzOffsetMin('Europe/Paris', JANUARY)).toBe(60);
    expect(tzOffsetMin('Europe/Paris', JULY)).toBe(120);
    expect(tzOffsetMin('Asia/Kolkata', JULY)).toBe(330);
    expect(tzOffsetMin('Not/AZone', JULY)).toBeNull();
    expect(formatShift(60)).toBe('+1 h');
    expect(formatShift(-30)).toBe('−30 min');
    expect(formatShift(330)).toBe('+5 h 30');
    expect(formatUtc(330)).toBe('UTC+5:30');
  });

  it('the Trans-Siberian moves the clocks forward 7 hours in total, never back', async () => {
    const j = JOURNEYS.find((x) => x.id === 'transsib')!;
    const trip = await createTrip({ mode: j.mode, title: j.title, stops: j.stops, index, curatedId: j.id });
    const r = buildRouteCtx(trip, cities, cc, undefined, { airports, drive, when: JULY });
    const total = r.practical.tz.reduce((s, z) => s + (z.toMin - z.fromMin), 0);
    expect(total).toBe(7 * 60);
    expect(r.practical.tz.every((z) => z.toMin > z.fromMin)).toBe(true);
    expect(buildGuide(r, data).filter((f) => f.id.startsWith('tz-')).length).toBe(r.practical.tz.length);
  });
});

describe('driving side', () => {
  it('the data knows the classic cases', () => {
    for (const k of ['GB', 'IE', 'JP', 'AU', 'IN', 'ZA', 'CY', 'MT', 'TH']) expect(drive[k], k).toBe('l');
    for (const k of ['FR', 'IL', 'US', 'DE', 'CN', 'BR', 'RU']) expect(drive[k], k).toBe('r');
  });

  it('a road trip Paris → London announces driving on the left in the UK', async () => {
    const stops: Stop[] = [{ name: 'Paris', lat: 48.8566, lng: 2.3522, cc: 'FR' }, { name: 'Calais', lat: 50.9513, lng: 1.8587, cc: 'FR' },
      { name: 'Folkestone', lat: 51.0814, lng: 1.1695, cc: 'GB' }, { name: 'London', lat: 51.5074, lng: -0.1278, cc: 'GB' }];
    const trip = await createTrip({ mode: 'car', title: 'Paris → London', stops, index });
    const r = buildRouteCtx(trip, cities, cc, undefined, { airports, drive, when: JULY });
    const facts = buildGuide(r, data);
    const d = facts.filter((f) => f.id.startsWith('drive-'));
    expect(d.map((f) => f.id)).toEqual(['drive-GBR']);
    // …and the clocks go back one hour (France UTC+2 → UK UTC+1 in summer).
    expect(r.practical.tz.map((z) => z.toMin - z.fromMin)).toEqual([-60]);
  });

  it('no driving fact on a train', async () => {
    const j = JOURNEYS.find((x) => x.id === 'eurostar')!;
    const trip = await createTrip({ mode: j.mode, title: j.title, stops: j.stops, index, curatedId: j.id });
    const r = buildRouteCtx(trip, cities, cc, undefined, { airports, drive, when: JULY });
    expect(buildGuide(r, data).some((f) => f.id.startsWith('drive-'))).toBe(false);
  });
});
