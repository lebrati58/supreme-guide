import type { Airport, City, Country } from '../types';
import type { Topology } from 'topojson-specification';
import { feature } from 'topojson-client';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

const base = import.meta.env.BASE_URL;
const cache = new Map<string, Promise<unknown>>();

/** Languages of public/data/city-names.json, in order (see scripts/build_city_names.py). */
export const CITY_LANGS = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'he', 'ar', 'zh'];

function getJson<T>(file: string): Promise<T> {
  if (!cache.has(file)) {
    cache.set(file, fetch(`${base}data/${file}`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${file}: ${r.status}`);
      return r.json();
    }).catch((e) => { cache.delete(file); throw e; }));
  }
  return cache.get(file) as Promise<T>;
}

export const loadCountries = () => getJson<Country[]>('countries.json');

export async function loadAirports(): Promise<Airport[]> {
  const rows = await getJson<[string, string, string, string, number, number, string, 'L' | 'M'][]>('airports.json');
  return rows.map(([iata, icao, name, cc, lat, lng, tz, size]) => ({ iata, icao, name, cc, lat, lng, tz, size }));
}

let citiesP: Promise<City[]> | null = null;
/** GeoNames cities (pop ≥ 50 000 or capital), with their names in the game languages when available. */
export function loadCities(): Promise<City[]> {
  citiesP ??= Promise.all([
    getJson<[string, string, number, number, number, 0 | 1][]>('cities.json'),
    getJson<{ n: number; langs: string[]; names: (string[] | 0)[] }>('city-names.json').catch(() => null),
  ]).then(([rows, i18n]) => {
    const ok = i18n && i18n.n === rows.length && i18n.langs.join() === CITY_LANGS.join();
    return rows.map(([name, cc, lat, lng, pop, cap], i) => {
      const names = ok ? i18n!.names[i] : 0;
      return { name, cc, lat, lng, pop, capital: cap === 1, ...(names ? { names } : {}) };
    });
  }).catch((e) => { citiesP = null; throw e; });
  return citiesP;
}

export interface CountryProps { name: string; num: string; iso3?: string }
export type WorldFC = FeatureCollection<Polygon | MultiPolygon, CountryProps>;

/** Natural Earth features whose numeric id is missing — matched by name. */
const NAME_TO_ISO3: Record<string, string> = { Kosovo: 'UNK' };

async function world(file: string): Promise<WorldFC> {
  const [topo, countries] = await Promise.all([getJson<Topology>(file), loadCountries()]);
  const byNum = new Map(countries.map((c) => [c.num, c.iso3]));
  const fc = feature(topo, topo.objects.countries) as unknown as WorldFC;
  fc.features.forEach((f, i) => {
    const num = (f.id as string | undefined) ?? '';
    f.properties = { name: f.properties?.name ?? '', num, iso3: byNum.get(num) ?? NAME_TO_ISO3[f.properties?.name ?? ''] };
    f.id = i + 1; // numeric ids are required for MapLibre feature-state
  });
  return fc;
}
export const loadWorld50 = () => world('world-50m.json');
export const loadWorld110 = () => world('world-110m.json');

/** Rivers, ranges/deserts and peaks (Natural Earth + GeoNames names); loaded when a trip opens. */
export const loadGeoFeatures = () => getJson<import('../game/nature').GeoFeatures>('geo-features.json');
