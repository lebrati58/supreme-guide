import type { Airport, City, Country } from '../types';
import type { Topology } from 'topojson-specification';
import { feature } from 'topojson-client';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

const base = import.meta.env.BASE_URL;
const cache = new Map<string, Promise<unknown>>();

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

export async function loadCities(): Promise<City[]> {
  const rows = await getJson<[string, string, number, number, number, 0 | 1][]>('cities.json');
  return rows.map(([name, cc, lat, lng, pop, cap]) => ({ name, cc, lat, lng, pop, capital: cap === 1 }));
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
