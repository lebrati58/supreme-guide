import type { LngLat, WikiCard } from '../types';
import { haversineKm, pathLengthKm, pointAlong } from '../geo/geo';
import { locale } from '../i18n';

/**
 * Wikipedia (CC BY-SA) “Did you know?” cards, in the player's language when that Wikipedia has
 * the article (via interlanguage links), otherwise in English. Text is shown as-is with a link to
 * the article; it is never turned into quiz answers automatically.
 */
const wikiLang = () => locale();
const host = (lang: string) => `https://${lang}.wikipedia.org`;
const enc = (title: string) => encodeURIComponent(decodeURIComponent(title).replace(/ /g, '_'));

async function getJson(url: string, timeoutMs = 8000, headers?: Record<string, string>) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try { const r = await fetch(url, { signal: ctrl.signal, headers }); return r.ok ? r.json() : null; } catch { return null; } finally { clearTimeout(id); }
}

/** Title of the same article in another language Wikipedia, if it exists. */
async function langLink(title: string, from: string, to: string): Promise<string | null> {
  const j = await getJson(`${host(from)}/w/api.php?action=query&prop=langlinks&titles=${enc(title)}&lllang=${to}&redirects=1&format=json&origin=*`);
  const pages = j?.query?.pages as Record<string, { langlinks?: { '*': string }[] }> | undefined;
  const page = pages ? Object.values(pages)[0] : undefined;
  return page?.langlinks?.[0]?.['*'] ?? null;
}

async function summaryFrom(lang: string, title: string): Promise<WikiCard | null> {
  // zh.wikipedia serves one article in several scripts: ask for Simplified Chinese.
  const j = await getJson(`${host(lang)}/api/rest_v1/page/summary/${enc(title)}`, 8000, lang === 'zh' ? { 'Accept-Language': 'zh-hans' } : undefined);
  if (!j?.extract || j.type === 'disambiguation') return null;
  return { title: j.title, extract: j.extract, url: j.content_urls?.desktop?.page ?? `${host(lang)}/wiki/${enc(j.title)}`,
    thumb: j.thumbnail?.source, lat: j.coordinates?.lat, lng: j.coordinates?.lon };
}

/**
 * Summary card for `title` (written in language `from`), translated to the player's language when
 * possible. `translate: false` keeps the source language (used for landmark photos).
 */
export async function wikiSummary(title: string, from = 'en', translate = true): Promise<WikiCard | null> {
  const to = wikiLang();
  if (translate && to !== from) {
    const local = await langLink(title, from, to);
    if (local) {
      const card = await summaryFrom(to, local);
      if (card) return card;
    }
  }
  return summaryFrom(from, title);
}

/** Articles near a point, from the player's language Wikipedia. */
export async function wikiNearby(p: LngLat, radiusM = 10000, limit = 5): Promise<{ title: string; lat: number; lng: number; dist: number; lang: string }[]> {
  const lang = wikiLang();
  const j = await getJson(`${host(lang)}/w/api.php?action=query&list=geosearch&gscoord=${p[1]}|${p[0]}&gsradius=${Math.min(10000, radiusM)}&gslimit=${limit}&format=json&origin=*`);
  return (j?.query?.geosearch ?? []).map((g: { title: string; lat: number; lon: number; dist: number }) => ({ title: g.title, lat: g.lat, lng: g.lon, dist: g.dist, lang }));
}

/** Collect cards along a route for offline use. `extraTitles` are English article titles (landmarks). */
export async function buildWikiPack(path: LngLat[], extraTitles: string[], onProgress?: (done: number, total: number) => void, maxCards = 24): Promise<WikiCard[]> {
  const km = pathLengthKm(path);
  const samples = Math.min(16, Math.max(2, Math.round(km / 120)));
  const points: LngLat[] = Array.from({ length: samples + 1 }, (_, i) => pointAlong(path, i / samples));
  const titles = new Map<string, string>(extraTitles.map((x) => [x, 'en']));
  let done = 0;
  const total = points.length + 1;
  for (const p of points) {
    const near = await wikiNearby(p, 10000, 3);
    near.slice(0, 2).forEach((n) => titles.set(n.title, n.lang));
    onProgress?.(++done, total);
    if (titles.size >= maxCards) break;
  }
  const cards = (await Promise.all([...titles].slice(0, maxCards).map(([title, lang]) => wikiSummary(title, lang)))).filter((c): c is WikiCard => !!c);
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
