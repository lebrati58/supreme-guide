import { t, type Key } from '../i18n';
import type { FlightInfo, GeometrySource, LngLat, Mode, Stop, Trip } from '../types';
import { densify, pathLengthKm } from '../geo/geo';
import type { CountryIndex } from '../geo/countryIndex';
import { routeOnNetwork } from './routing';
import { greatCircle } from '../geo/geo';

export const MODE_META: Record<Mode, { emoji: string; label: string; verb: string; color: string }> = {
  flight: { emoji: '✈️', label: 'Flight', verb: 'Fly', color: '#4aa8ff' },
  train: { emoji: '🚆', label: 'Train', verb: 'Ride', color: '#ff7a59' },
  bus: { emoji: '🚌', label: 'Bus', verb: 'Ride', color: '#2ec4b6' },
  car: { emoji: '🚗', label: 'Road Trip', verb: 'Drive', color: '#ffb703' },
  walk: { emoji: '🚶', label: 'Walk', verb: 'Walk', color: '#8ac926' },
  cruise: { emoji: '🚢', label: 'Cruise', verb: 'Sail', color: '#9b5de5' },
};

export const modeLabel = (m: Mode) => t(`mode.${m}` as Key);
/** “Fly this route →”, “Ride this route →”… */
export const useRouteLabel = (m: Mode) => t(`plan.useRoute.${m}` as Key);
export const geometryNote = (g: GeometrySource) => t(`geom.${g}` as Key);

/** English source of the geometry notes (catalog keys geom.*). */
export const GEOMETRY_NOTE: Record<GeometrySource, string> = {
  'great-circle': 'Shortest great-circle path — the real flight track will differ (winds, airways).',
  'stop-to-stop': 'Stop-to-stop lines — not the exact track, road or sailing route.',
  'road-network': 'Road route computed on OpenStreetMap data (OSRM).',
  'walking-network': 'Walking route computed on OpenStreetMap data.',
  'gps-trace': 'Your recorded GPS trace.',
};

export async function buildGeometry(mode: Mode, stops: Stop[]): Promise<{ geometry: LngLat[]; source: GeometrySource }> {
  const pts: LngLat[] = stops.map((s) => [s.lng, s.lat]);
  if (mode === 'flight') return { geometry: greatCircle(pts[0], pts[pts.length - 1], 40), source: 'great-circle' };
  if (mode === 'car' || mode === 'bus' || mode === 'walk') {
    const g = await routeOnNetwork(stops, mode === 'walk' ? 'foot' : 'car');
    if (g) return { geometry: g, source: mode === 'walk' ? 'walking-network' : 'road-network' };
  }
  return { geometry: densify(pts, 20), source: 'stop-to-stop' };
}

export async function createTrip(args: { mode: Mode; title: string; stops: Stop[]; index: CountryIndex; label?: string; flight?: FlightInfo; role?: Trip['role']; curatedId?: string; depUtc?: number; arrUtc?: number }): Promise<Trip> {
  const { geometry, source } = await buildGeometry(args.mode, args.stops);
  return {
    id: `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    mode: args.mode, title: args.title, stops: args.stops, geometry, geometrySource: source,
    distanceKm: Math.round(pathLengthKm(geometry)),
    countries: args.index.alongPath(geometry, args.mode === 'walk' ? 0.5 : 15),
    createdAt: Date.now(), label: args.label, flight: args.flight, role: args.role, curatedId: args.curatedId,
    depUtc: args.flight?.depUtc ?? args.depUtc, arrUtc: args.flight?.arrUtc ?? args.arrUtc,
    progress: 0, answeredIds: [],
  };
}

/** Fraction of the route at which each stop lies (by cumulative distance between stops). */
export function stopFractions(trip: Trip): number[] {
  const pts: LngLat[] = trip.stops.map((s) => [s.lng, s.lat]);
  const total = pathLengthKm(pts) || 1;
  let acc = 0;
  return pts.map((p, i) => (i ? (acc += pathLengthKm([pts[i - 1], p])) / total : 0));
}
