import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';
import type { LngLat } from '../types';
import type { CountryProps, WorldFC } from '../data/loaders';
import { densify, haversineKm } from './geo';

interface Entry { f: Feature<Polygon | MultiPolygon, CountryProps>; box: [number, number, number, number] }

function ringContains(ring: Position[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function polyContains(poly: Position[][], x: number, y: number): boolean {
  if (!ringContains(poly[0], x, y)) return false;
  for (let h = 1; h < poly.length; h++) if (ringContains(poly[h], x, y)) return false;
  return true;
}

/** Point-in-country lookup with bounding-box prefilter. Works fully offline. */
export class CountryIndex {
  private entries: Entry[];
  constructor(world: WorldFC) {
    this.entries = world.features.map((f) => {
      let box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const p of polys) for (const [x, y] of p[0]) box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)];
      return { f, box };
    });
  }

  at(p: LngLat): CountryProps | null {
    let [x] = p;
    const y = p[1];
    x = ((((x + 180) % 360) + 360) % 360) - 180;
    for (const { f, box } of this.entries) {
      if (x < box[0] || x > box[2] || y < box[1] || y > box[3]) continue;
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      if (polys.some((poly) => polyContains(poly, x, y))) return f.properties;
    }
    return null;
  }

  /**
   * Countries crossed by a path, in order, with the route fraction where each is first entered.
   * Sampling every `stepKm` means very small territories can be skipped — it is an estimate.
   */
  alongPath(path: LngLat[], stepKm = 15): { iso3: string; at: number }[] {
    const dense = densify(path, stepKm);
    const total = dense.reduce((s, p, i) => (i ? s + haversineKm(dense[i - 1], p) : 0), 0) || 1;
    const out: { iso3: string; at: number }[] = [];
    const seen = new Set<string>();
    let acc = 0;
    dense.forEach((p, i) => {
      if (i) acc += haversineKm(dense[i - 1], p);
      const c = this.at(p);
      if (c?.iso3 && !seen.has(c.iso3)) { seen.add(c.iso3); out.push({ iso3: c.iso3, at: acc / total }); }
    });
    return out;
  }
}
