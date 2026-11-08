import type { Airport, FlightInfo, LngLat } from '../types';
import { greatCircle, haversineKm, pointAlong } from '../geo/geo';
import { zonedToUtc } from './time';

export const FLIGHT_NO = /^([A-Z0-9]{2}|[A-Z]{3})\s?(\d{1,4}[A-Z]?)$/;

export function normaliseFlightNumber(s: string): string | null {
  const m = s.trim().toUpperCase().match(FLIGHT_NO);
  return m ? `${m[1]}${m[2]}` : null;
}

/** Typical block time estimate: ~830 km/h cruise + 30 min for taxi/climb/descent. Clearly an estimate. */
export function estimateBlockMinutes(km: number): number {
  return Math.round((km / 830) * 60 + 30);
}

export function flightPath(a: Airport, b: Airport): LngLat[] {
  return greatCircle([a.lng, a.lat], [b.lng, b.lat], 40);
}

export interface ScheduleInput { date: string; depLocal: string; arrLocal?: string; durationMin?: number }

/** Build UTC schedule from local times at each airport. Arrival is rolled forward to after departure. */
export function buildSchedule(from: Airport, to: Airport, s: ScheduleInput): { depUtc: number; arrUtc: number; estimated: boolean } {
  const depUtc = zonedToUtc(s.date, s.depLocal, from.tz);
  if (s.arrLocal) {
    let arrUtc = zonedToUtc(s.date, s.arrLocal, to.tz);
    let guard = 0;
    while (arrUtc <= depUtc && guard++ < 3) arrUtc += 86400000;
    // If arrival landed on a previous day (westbound date line), pull back while > 24h.
    while (arrUtc - depUtc > 86400000 * 1.05 && guard++ < 6) arrUtc -= 86400000;
    return { depUtc, arrUtc, estimated: false };
  }
  const minutes = s.durationMin ?? estimateBlockMinutes(haversineKm([from.lng, from.lat], [to.lng, to.lat]));
  return { depUtc, arrUtc: depUtc + minutes * 60000, estimated: !s.durationMin };
}

export type FlightPhase = 'before' | 'enroute' | 'arrived';

export interface FlightStatus { phase: FlightPhase; fraction: number; position: LngLat; remainingMs: number; elapsedMs: number }

/**
 * Schedule-based ESTIMATE of where the aircraft is. Real tracks deviate from great circles
 * (winds, airways, holding), so the UI must always label this as an estimate.
 */
export function flightStatus(f: FlightInfo, path: LngLat[], now = Date.now()): FlightStatus {
  const dep = f.depUtc + f.delayMin * 60000;
  const arr = f.arrUtc + f.delayMin * 60000;
  const dur = Math.max(1, arr - dep);
  const fraction = Math.min(1, Math.max(0, (now - dep) / dur));
  const phase: FlightPhase = now < dep ? 'before' : now >= arr ? 'arrived' : 'enroute';
  return { phase, fraction, position: pointAlong(path, fraction), remainingMs: Math.max(0, arr - now), elapsedMs: Math.max(0, now - dep) };
}

export function searchAirports(all: Airport[], q: string, limit = 8): Airport[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const up = s.toUpperCase();
  const exact = all.filter((a) => a.iata === up || a.icao === up);
  const rest = all.filter((a) => !exact.includes(a) && (a.name.toLowerCase().includes(s) || a.iata.toLowerCase().startsWith(s)));
  rest.sort((a, b) => (a.size === b.size ? 0 : a.size === 'L' ? -1 : 1));
  return [...exact, ...rest].slice(0, limit);
}
