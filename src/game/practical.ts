import type { Airport, LngLat } from '../types';

/**
 * Practical info along a route: time-zone changes and driving side.
 * Time zones: the local zone along the path is the one of the nearest airport (OurAirports data,
 * already in the app), confirmed on two consecutive samples so a border airport can't make the
 * clock flicker; offsets come from the device's time-zone database for the trip's date.
 */
export interface TzChange { at: number; fromMin: number; toMin: number; tz: string }
export interface Practical { tz: TzChange[]; drive: Record<string, 'l' | 'r'> }

/** UTC offset in minutes of a time zone at a given instant (handles daylight saving time). */
export function tzOffsetMin(tz: string, when: number): number | null {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date(when)).find((p) => p.type === 'timeZoneName')?.value ?? '';
    if (part === 'GMT' || part === 'UTC') return 0;
    const m = part.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return null;
    return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
  } catch { return null; }
}

function approxKm(a: LngLat, b: LngLat) {
  const x = ((b[0] - a[0]) * Math.PI / 180) * Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180);
  const y = ((b[1] - a[1]) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * 6371;
}

/**
 * `countryAt(at)` (ISO2) restricts the search to airports of the country being crossed, so an airport
 * just across a border (e.g. China along the Amur) can't give the wrong time.
 */
export function timeZonesAlong(path: { p: LngLat; at: number }[], airports: Airport[], when: number, countryAt?: (at: number) => string | undefined, maxKm = 250): TzChange[] {
  if (path.length < 2 || !airports.length) return [];
  const step = Math.max(1, Math.floor(path.length / 200));
  const samples: { at: number; tz: string; off: number }[] = [];
  for (let i = 0; i < path.length; i += step) {
    const p = path[i].p;
    const cc = countryAt?.(path[i].at);
    let best: Airport | null = null, d = Infinity;
    for (const a of airports) {
      if (Math.abs(a.lat - p[1]) > 3 || Math.abs(a.lng - p[0]) > 4) continue;
      if (cc && a.cc !== cc) continue;
      const k = approxKm(p, [a.lng, a.lat]);
      if (k < d) { d = k; best = a; }
    }
    if (!best || d > maxKm || !best.tz) continue;
    const off = tzOffsetMin(best.tz, when);
    if (off !== null) samples.push({ at: path[i].at, tz: best.tz, off });
  }
  const out: TzChange[] = [];
  let cur = samples[0]?.off;
  for (let i = 1; i < samples.length; i++) {
    const s = samples[i];
    // A change counts only when the next sample agrees (no flicker at borders).
    if (s.off !== cur && (i + 1 >= samples.length || samples[i + 1].off === s.off)) {
      out.push({ at: s.at, fromMin: cur!, toMin: s.off, tz: s.tz });
      cur = s.off;
    }
  }
  return out;
}

/** “+1 h”, “−30 min”, “+5 h 30” */
export function formatShift(min: number): string {
  const sign = min > 0 ? '+' : '−';
  const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
  return `${sign}${h ? `${h} h` : ''}${h && m ? ' ' : ''}${m ? `${m}${h ? '' : ' min'}` : ''}`;
}
export function formatUtc(min: number): string {
  const sign = min >= 0 ? '+' : '−';
  const a = Math.abs(min);
  return `UTC${sign}${Math.floor(a / 60)}${a % 60 ? `:${String(a % 60).padStart(2, '0')}` : ''}`;
}
