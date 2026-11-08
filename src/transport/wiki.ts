import type { LngLat, WikiCard } from '../types';
import { haversineKm, pathLengthKm, pointAlong } from '../geo/geo';

/**
 * Wikipedia (CC BY-SA) “Did you know?” cards. Text is shown as-is with a link to the article;
 * it is never turned into quiz answers automatically.
 */
const API = 'https://en.wikipedia.org/w/api.php';
const REST = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

async function getJson(url: string, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try { const r = await fetch(url, { signal: ctrl.signal }); return r.ok ? r.json() : null; } catch { return null; } finally { clearTimeout(t); }
}

export async function wikiSummary(title: string): Promise<WikiCard | null> {
  const j = await getJson(REST + encodeURIComponent(decodeURIComponent(title).replace(/ /g, '_')));
  if (!j?.extract || j.type === 'disambiguation') return null;
  return { title: j.title, extract: j.extract, url: j.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(j.title)}`,
    thumb: j.thumbnail?.source, lat: j.coordinates?.lat, lng: j.coordinates?.lon };
}

export async function wikiNearby(p: LngLat, radiusM = 10000, limit = 5): Promise<{ title: string; lat: number; lng: number; dist: number }[]> {
  const j = await getJson(`${API}?action=query&list=geosearch&gscoord=${p[1]}|${p[0]}&gsradius=${Math.min(10000, radiusM)}&gslimit=${limit}&format=json&origin=*`);
  return (j?.query?.geosearch ?? []).map((g: { title: string; lat: number; lon: number; dist: number }) => ({ title: g.title, lat: g.lat, lng: g.lon, dist: g.dist }));
}

/** Collect cards along a route for offline use. */
export async function buildWikiPack(path: LngLat[], extraTitles: string[], onProgress?: (done: number, total: number) => void, maxCards = 24): Promise<WikiCard[]> {
  const km = pathLengthKm(path);
  const samples = Math.min(16, Math.max(2, Math.round(km / 120)));
  const points: LngLat[] = Array.from({ length: samples + 1 }, (_, i) => pointAlong(path, i / samples));
  const titles = new Set(extraTitles);
  let done = 0;
  const total = points.length + 1;
  for (const p of points) {
    const near = await wikiNearby(p, 10000, 3);
    near.slice(0, 2).forEach((n) => titles.add(n.title));
    onProgress?.(++done, total);
    if (titles.size >= maxCards) break;
  }
  const cards = (await Promise.all([...titles].slice(0, maxCards).map(wikiSummary))).filter((c): c is WikiCard => !!c);
  // Warm the image cache (served offline by the service worker afterwards).
  await Promise.all(cards.filter((c) => c.thumb).map((c) => fetch(c.thumb!, { mode: 'no-cors' }).catch(() => null)));
  onProgress?.(total, total);
  return cards;
}

export function nearestCard(cards: WikiCard[], p: LngLat): WikiCard | null {
  let best: WikiCard | null = null, d = Infinity;
  for (const c of cards) if (c.lat !== undefined && c.lng !== undefined) {
    const x = haversineKm([c.lng, c.lat], p);
    if (x < d) { d = x; best = c; }
  }
  return best;
}
