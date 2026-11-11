import type { GeometrySource, LngLat, Mode } from '../types';
import { bearing } from '../geo/geo';
import { locale } from '../i18n';

/**
 * Natural features along a route — rivers crossed, mountain ranges / deserts / plateaus entered,
 * peaks in view — from Natural Earth (public domain) with GeoNames names (see
 * scripts/build_geo_features.py). Works offline once public/data/geo-features.json is cached.
 */
export interface GeoFeatures {
  rivers: { name: string; n: string[]; r: number; l: LngLat[][] }[];
  regions: { name: string; n: string[]; k: 'range' | 'desert' | 'plateau'; r: number; p: LngLat[][] }[];
  peaks: { name: string; n: string[]; e: number; v: boolean; c: LngLat }[];
}
export type Side = 'left' | 'right';
export interface NatureAlong {
  rivers: { name: string; names: string[]; at: number }[];
  regions: { name: string; names: string[]; kind: 'range' | 'desert' | 'plateau'; at: number }[];
  peaks: { name: string; names: string[]; elevation: number; volcano: boolean; at: number; offKm: number; side?: Side }[];
  /** Same kinds of features near the route but NOT on it (wrong options for questions). */
  nearRivers: { name: string; names: string[] }[];
  nearRegions: { name: string; names: string[]; kind: 'range' | 'desert' | 'plateau' }[];
}

const LANG_INDEX: Record<string, number> = { en: 0, fr: 1, es: 2, de: 3, it: 4, pt: 5, ru: 6, he: 7, ar: 8, zh: 9 };
/** Name in the current language when known, else the usual (English) name. */
export const featureName = (f: { name: string; names?: string[] }) => f.names?.[LANG_INDEX[locale()] ?? -1] || f.name;

type Path = { p: LngLat; at: number }[];

function approxKm(a: LngLat, b: LngLat) {
  const x = ((b[0] - a[0]) * Math.PI / 180) * Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180);
  const y = ((b[1] - a[1]) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * 6371;
}

function nearestIndex(path: Path, p: LngLat) {
  let best = Infinity, k = 0;
  path.forEach((q, i) => { const d = approxKm(q.p, p); if (d < best) { best = d; k = i; } });
  return { k, offKm: best };
}

/**
 * Which side of the traveller a place is on, from the direction of travel at the nearest point of
 * the path. Undefined when it is (almost) straight ahead/behind or right on the path.
 */
export function sideOf(path: Path, p: LngLat): Side | undefined {
  if (path.length < 2) return undefined;
  const { k, offKm } = nearestIndex(path, p);
  if (offKm < 0.5) return undefined;
  const a = path[Math.max(0, k - 1)].p, b = path[Math.min(path.length - 1, k + 1)].p;
  if (a[0] === b[0] && a[1] === b[1]) return undefined;
  const diff = ((bearing(path[k].p, p) - bearing(a, b) + 540) % 360) - 180;
  if (Math.abs(diff) < 20 || Math.abs(diff) > 160) return undefined;
  return diff > 0 ? 'right' : 'left';
}

const cross = (o: LngLat, a: LngLat, b: LngLat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
function segmentsCross(p1: LngLat, p2: LngLat, q1: LngLat, q2: LngLat) {
  const d1 = cross(q1, q2, p1), d2 = cross(q1, q2, p2), d3 = cross(p1, p2, q1), d4 = cross(p1, p2, q2);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
function inRing(pt: LngLat, ring: LngLat[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
type BBox = [number, number, number, number];
const bboxOf = (pts: LngLat[]): BBox => {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [x, y] of pts) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }
  return [w, s, e, n];
};
const overlap = (a: BBox, b: BBox, pad = 0) => a[0] - pad <= b[2] && b[0] - pad <= a[2] && a[1] - pad <= b[3] && b[1] - pad <= a[3];

const PEAK_RADIUS: Record<Mode, number> = { flight: 100, train: 40, bus: 35, car: 35, cruise: 40, walk: 6 };
const RIVER_RANK: Record<Mode, number> = { flight: 4, train: 7, bus: 7, car: 7, cruise: 6, walk: 7 };

/**
 * Minimum distance (km) from the drawn path for a left/right cue to be trustworthy. Real road,
 * walking or GPS tracks are exact; stop-to-stop lines and great circles only approximate the real
 * track (a train follows valleys, a plane deviates from the great circle), so near features could be
 * on the wrong side — no cue then rather than a wrong one.
 */
export function sideThresholdKm(source: GeometrySource | undefined): number {
  return source === 'road-network' || source === 'walking-network' || source === 'gps-trace' ? 0.5 : source === 'great-circle' ? 60 : 25;
}

export function natureAlong(path: Path, mode: Mode, data: GeoFeatures, source?: GeometrySource): NatureAlong {
  const out: NatureAlong = { rivers: [], regions: [], peaks: [], nearRivers: [], nearRegions: [] };
  if (path.length < 2) return out;
  const pts = path.map((q) => q.p);
  const pathBox = bboxOf(pts);

  // Rivers: first crossing of the path.
  for (const r of data.rivers) {
    if (r.r > RIVER_RANK[mode]) continue;
    let at = -1;
    for (const line of r.l) {
      if (!overlap(bboxOf(line), pathBox)) continue;
      for (let j = 1; j < line.length && at < 0; j++) {
        const sb = bboxOf([line[j - 1], line[j]]);
        for (let i = 1; i < path.length; i++) {
          const pa = path[i - 1].p, pb = path[i].p;
          if (!overlap(sb, [Math.min(pa[0], pb[0]), Math.min(pa[1], pb[1]), Math.max(pa[0], pb[0]), Math.max(pa[1], pb[1])])) continue;
          if (segmentsCross(pa, pb, line[j - 1], line[j])) { at = path[i].at; break; }
        }
      }
      if (at >= 0) break;
    }
    if (at >= 0) out.rivers.push({ name: r.name, names: r.n, at });
    else if (r.l.some((line) => overlap(bboxOf(line), pathBox, 4))) out.nearRivers.push({ name: r.name, names: r.n });
  }

  // Ranges, deserts, plateaus: where the path enters them.
  const step = Math.max(1, Math.floor(path.length / 400));
  for (const g of data.regions) {
    let at = -1;
    for (const ring of g.p) {
      if (!overlap(bboxOf(ring), pathBox)) continue;
      for (let i = 0; i < path.length; i += step) if (inRing(path[i].p, ring)) { at = at < 0 ? path[i].at : Math.min(at, path[i].at); break; }
    }
    if (at >= 0) out.regions.push({ name: g.name, names: g.n, kind: g.k, at });
    else if (g.p.some((ring) => overlap(bboxOf(ring), pathBox, 6))) out.nearRegions.push({ name: g.name, names: g.n, kind: g.k });
  }

  // Peaks in view of the route, with the side to look at.
  const radius = PEAK_RADIUS[mode];
  for (const pk of data.peaks) {
    if (mode !== 'walk' && pk.e < 1000) continue;
    if (!overlap([pk.c[0], pk.c[1], pk.c[0], pk.c[1]], pathBox, radius / 80 + 0.2)) continue;
    const { k, offKm } = nearestIndex(path, pk.c);
    if (offKm > radius) continue;
    out.peaks.push({ name: pk.name, names: pk.n, elevation: pk.e, volcano: pk.v, at: path[k].at, offKm, side: offKm >= sideThresholdKm(source) ? sideOf(path, pk.c) : undefined });
  }
  out.peaks.sort((a, b) => b.elevation - a.elevation).splice(8);
  for (const list of [out.rivers, out.regions, out.peaks]) list.sort((a, b) => a.at - b.at);
  return out;
}
