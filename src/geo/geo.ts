import type { LngLat } from '../types';

const R = 6371.0088; // mean Earth radius, km
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in km (haversine). */
export function haversineKm(a: LngLat, b: LngLat): number {
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathLengthKm(path: LngLat[]): number {
  let d = 0;
  for (let i = 1; i < path.length; i++) d += haversineKm(path[i - 1], path[i]);
  return d;
}

/** Points along the great circle between a and b (inclusive), roughly every `stepKm`. */
export function greatCircle(a: LngLat, b: LngLat, stepKm = 50): LngLat[] {
  const d = haversineKm(a, b) / R; // angular distance
  if (d < 1e-9) return [a, b];
  const n = Math.max(2, Math.ceil((d * R) / stepKm));
  const [l1, p1, l2, p2] = [rad(a[0]), rad(a[1]), rad(b[0]), rad(b[1])];
  const out: LngLat[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    out.push([deg(Math.atan2(y, x)), deg(Math.atan2(z, Math.sqrt(x * x + y * y)))]);
  }
  return out;
}

/** Make longitudes continuous so MapLibre draws antimeridian-crossing lines the short way. */
export function unwrap(path: LngLat[]): LngLat[] {
  const out: LngLat[] = [];
  let offset = 0;
  path.forEach((p, i) => {
    if (i > 0) {
      const prev = path[i - 1][0];
      const delta = p[0] - prev;
      if (delta > 180) offset -= 360;
      else if (delta < -180) offset += 360;
    }
    out.push([p[0] + offset, p[1]]);
  });
  return out;
}

/** Split long straight segments into short pieces (for sampling / progress). */
export function densify(path: LngLat[], stepKm = 25): LngLat[] {
  if (path.length < 2) return path.slice();
  const out: LngLat[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const seg = greatCircle(path[i - 1], path[i], stepKm);
    out.push(...seg.slice(1));
  }
  return out;
}

/** Point located at `fraction` (0..1) of the path length. */
export function pointAlong(path: LngLat[], fraction: number): LngLat {
  if (path.length === 0) return [0, 0];
  if (path.length === 1 || fraction <= 0) return path[0];
  const total = pathLengthKm(path);
  let target = Math.min(1, fraction) * total;
  for (let i = 1; i < path.length; i++) {
    const seg = haversineKm(path[i - 1], path[i]);
    if (target <= seg) {
      const g = greatCircle(path[i - 1], path[i], Math.max(0.05, seg / 64));
      return g[Math.round((target / (seg || 1)) * (g.length - 1))];
    }
    target -= seg;
  }
  return path[path.length - 1];
}

/** Sub-path from start up to `fraction`. */
export function slicePath(path: LngLat[], fraction: number): LngLat[] {
  if (fraction <= 0) return [path[0]];
  if (fraction >= 1) return path.slice();
  const total = pathLengthKm(path);
  let target = fraction * total;
  const out: LngLat[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const seg = haversineKm(path[i - 1], path[i]);
    if (target <= seg) { out.push(pointAlong([path[i - 1], path[i]], target / (seg || 1))); return out; }
    out.push(path[i]);
    target -= seg;
  }
  return out;
}

/** Closest position on the path to `p`: returns route fraction and distance off-route (km). */
export function locateOnPath(path: LngLat[], p: LngLat): { fraction: number; offKm: number } {
  const dense = densify(path, 5);
  const total = pathLengthKm(dense) || 1;
  let best = Infinity, bestAcc = 0, acc = 0;
  for (let i = 0; i < dense.length; i++) {
    if (i > 0) acc += haversineKm(dense[i - 1], dense[i]);
    const d = haversineKm(dense[i], p);
    if (d < best) { best = d; bestAcc = acc; }
  }
  return { fraction: bestAcc / total, offKm: best };
}

export function bearing(a: LngLat, b: LngLat): number {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
  const x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) - Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

export function bbox(path: LngLat[]): [number, number, number, number] {
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of path) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }
  return [w, s, e, n];
}
