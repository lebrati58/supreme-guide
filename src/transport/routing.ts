import type { LngLat, Stop } from '../types';

/**
 * Optional online routing on OpenStreetMap data via public OSRM servers.
 * These are community demo servers with fair-use policies: one request per user action,
 * no bulk use. Production scale should self-host OSRM/Valhalla or use a paid provider.
 */
const ENDPOINTS = {
  car: 'https://router.project-osrm.org/route/v1/driving/',
  foot: 'https://routing.openstreetmap.de/routed-foot/route/v1/driving/',
};

export async function routeOnNetwork(stops: Stop[], profile: 'car' | 'foot', timeoutMs = 9000): Promise<LngLat[] | null> {
  if (!navigator.onLine || stops.length < 2 || stops.length > 25) return null;
  const coords = stops.map((s) => `${s.lng.toFixed(5)},${s.lat.toFixed(5)}`).join(';');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${ENDPOINTS[profile]}${coords}?overview=simplified&geometries=geojson`, { signal: ctrl.signal });
    if (!r.ok) return null;
    const j = await r.json();
    const g = j?.routes?.[0]?.geometry?.coordinates as LngLat[] | undefined;
    return g && g.length > 1 ? g : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
