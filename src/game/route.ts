import type { City, LngLat, Mode, Trip, WikiCard } from '../types';
import { LANDMARKS, type Landmark } from '../content/landmarks';
import { bearing, densify, haversineKm } from '../geo/geo';

/**
 * Everything that is really ON the player's route: ordered stops, the towns and cities the path
 * passes (GeoNames, within a corridor), nearby landmarks and the countries crossed. Route questions
 * and the guide mode are built only from this, so they always relate to the journey.
 */
export interface RoutePlace {
  name: string;
  cc?: string;        // ISO2
  lat: number; lng: number;
  pop: number;        // GeoNames population (0 for stops without data)
  at: number;         // fraction of the route (0..1)
  offKm: number;      // distance from the path
  stop: boolean;      // a named stop of the trip
  capital: boolean;
  stopIndex?: number;
  /** For a stop merged with a nearby GeoNames town of another name (e.g. “Avignon TGV” → Avignon). */
  town?: string;
  /** GeoNames names of the place (or of its merged town) in the game languages. */
  names?: string[];
}
export interface RouteLandmark { l: Landmark; at: number; offKm: number }
export interface RouteCtx {
  mode: Mode;
  places: RoutePlace[];          // sorted by `at`
  landmarks: RouteLandmark[];    // sorted by `at`
  countries: { iso3: string; at: number }[];
  from: RoutePlace; to: RoutePlace;
  distanceKm: number;            // great-circle distance from first to last stop
  bearingDeg: number;            // overall direction of travel
  /** Sampled path (≈5 km) with cumulative fraction, for distance tests. */
  path: { p: LngLat; at: number }[];
  /** Cities of the route countries that are NOT near the route (for “which is on your route?”). */
  offRoute: City[];
  explore: boolean;              // walking “explore around me” (no real path)
  curatedId?: string;            // to translate curated stop names
  pathKm: number;                // length of the drawn path
  progress?: number;             // current position (0..1), set by the trip screen
  wiki: WikiCard[];              // place cards fetched on demand for this route (player's language)
  ai: NonNullable<Trip['ai']>;   // optional AI questions grounded on `wiki`
}

/** Corridor half-width (km) in which a town counts as “on the route”, by transport mode. */
const CORRIDOR: Record<Mode, number> = { flight: 30, train: 8, bus: 6, car: 6, cruise: 12, walk: 1.5 };
const LANDMARK_RADIUS: Record<Mode, number> = { flight: 80, train: 30, bus: 25, car: 25, cruise: 30, walk: 2 };
const MIN_POP: Record<Mode, number> = { flight: 250000, train: 50000, bus: 50000, car: 50000, cruise: 50000, walk: 0 };

/** Fast approximate distance (km) — equirectangular, accurate enough below a few hundred km. */
function approxKm(a: LngLat, b: LngLat) {
  const x = ((b[0] - a[0]) * Math.PI / 180) * Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180);
  const y = ((b[1] - a[1]) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * 6371;
}

export function nearestOnPath(path: RouteCtx['path'], p: LngLat): { at: number; offKm: number } {
  let best = Infinity, at = 0;
  for (const q of path) { const d = approxKm(q.p, p); if (d < best) { best = d; at = q.at; } }
  return { at, offKm: best };
}

export function buildRouteCtx(trip: Trip, cities: City[], ccByIso3: Map<string, string>): RouteCtx {
  const dense = densify(trip.geometry, 5);
  let acc = 0;
  const lens = dense.map((p, i) => (i ? (acc += haversineKm(dense[i - 1], p)) : 0));
  const total = acc || 1;
  const path = dense.map((p, i) => ({ p, at: lens[i] / total }));
  const explore = trip.distanceKm < 0.2;

  // Named stops (skip “passes through” waypoints like tunnel portals).
  const stops: RoutePlace[] = trip.stops.map((s, i) => {
    const loc = nearestOnPath(path, [s.lng, s.lat]);
    return { name: s.name, cc: s.cc, lat: s.lat, lng: s.lng, pop: 0, at: i === 0 ? 0 : i === trip.stops.length - 1 ? 1 : loc.at, offKm: loc.offKm, stop: true, capital: false, stopIndex: i };
  }).filter((s, i, arr) => !trip.stops[i].note && (i === 0 || haversineKm([s.lng, s.lat], [arr[i - 1].lng, arr[i - 1].lat]) > 0.05 || i === arr.length - 1));

  // Towns in the corridor (bounding-box prefilter, then distance to the sampled path).
  const corridor = CORRIDOR[trip.mode];
  const pad = corridor / 80 + 0.2;
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const { p } of path) { w = Math.min(w, p[0]); e = Math.max(e, p[0]); s = Math.min(s, p[1]); n = Math.max(n, p[1]); }
  const routeCC = new Set(trip.countries.map((c) => ccByIso3.get(c.iso3)).filter(Boolean) as string[]);
  const towns: RoutePlace[] = [];
  const offRoute: City[] = [];
  if (!explore) {
    for (const c of cities) {
      const inBox = c.lng >= w - pad && c.lng <= e + pad && c.lat >= s - pad && c.lat <= n + pad;
      if (inBox && c.pop >= MIN_POP[trip.mode]) {
        const loc = nearestOnPath(path, [c.lng, c.lat]);
        if (loc.offKm <= corridor) { towns.push({ name: c.name, names: c.names, cc: c.cc, lat: c.lat, lng: c.lng, pop: c.pop, at: loc.at, offKm: loc.offKm, stop: false, capital: c.capital }); continue; }
        if (loc.offKm >= 80 && routeCC.has(c.cc)) offRoute.push(c);
      } else if (routeCC.has(c.cc) && c.pop >= 50000 && offRoute.length < 400) {
        offRoute.push(c);
      }
    }
  }
  // Merge towns into stops when they are the same place (stop names win; take the population),
  // and keep one town per agglomeration: skip suburbs/districts close to a bigger place already kept.
  const places: RoutePlace[] = [...stops];
  const cluster = trip.mode === 'flight' ? 60 : 20;
  for (const t of towns.sort((a, b) => b.pop - a.pop)) {
    const same = places.find((p) => haversineKm([p.lng, p.lat], [t.lng, t.lat]) < 8);
    if (same) { if (!same.pop) { same.pop = t.pop; same.capital = t.capital; same.cc ??= t.cc; if (same.stop && t.name !== same.name) same.town = t.name; same.names ??= t.names; } continue; }
    if (places.some((p) => haversineKm([p.lng, p.lat], [t.lng, t.lat]) < cluster)) continue;
    places.push(t);
  }
  places.sort((a, b) => a.at - b.at || (a.stop ? -1 : 1));

  const radius = LANDMARK_RADIUS[trip.mode];
  const center: LngLat = trip.geometry[0];
  const landmarks: RouteLandmark[] = LANDMARKS.map((l) => {
    if (explore) { const d = haversineKm(center, [l.lng, l.lat]); return { l, at: 0, offKm: d }; }
    const loc = nearestOnPath(path, [l.lng, l.lat]);
    return { l, at: loc.at, offKm: loc.offKm };
  }).filter((x) => x.offKm <= (explore ? 5 : radius)).sort((a, b) => a.at - b.at);

  // Endpoints are the trip's first and last stops (not a suburb that happens to sort at the ends).
  const first = stops[0];
  const last = stops[stops.length - 1];
  const a: LngLat = [trip.stops[0].lng, trip.stops[0].lat];
  const b: LngLat = [trip.stops[trip.stops.length - 1].lng, trip.stops[trip.stops.length - 1].lat];
  return {
    mode: trip.mode, places, landmarks, countries: trip.countries, from: first, to: last,
    distanceKm: haversineKm(a, b), bearingDeg: bearing(a, b), path, offRoute, explore, curatedId: trip.curatedId, pathKm: total, wiki: trip.wiki ?? [], ai: trip.packLang && trip.ai ? trip.ai : [],
  };
}

/** 8-point compass key for a bearing in degrees. */
export function compassKey(deg: number): 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw' {
  return (['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const)[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}
