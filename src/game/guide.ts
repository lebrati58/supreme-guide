import type { Country, LngLat, WikiCard } from '../types';
import type { GameData } from './engine';
import { nearestOnPath, compassKey, type RouteCtx, type RoutePlace } from './route';
import { EVENTS } from '../content/events';
import { fmtNum, listJoin, t, type Key } from '../i18n';
import { capitalName, cityName, countryName, curatedQuestions, currencyLabel, eventLabel, formatYearL, journeyStop, languagesLabel, lmFact, lmName } from '../i18n/content';
import { haversineKm } from '../geo/geo';
import { featureName, type Side } from './nature';
import { legendFor } from '../content/legendary';
import { JOURNEYS } from '../content/journeys';
import { legendFact } from '../i18n/content';

/**
 * Guide mode: statements instead of questions. Every fact comes from verified data (dataset,
 * curated content, GeoNames) or from Wikipedia (shown as such), positioned along the route.
 */
export interface GuideFact {
  id: string;
  at: number;          // position on the route (0..1); explore mode uses distance order
  icon: string;
  title: string;
  text: string;
  source?: { label: string; url: string };
  /** Which side to look (from the direction of travel). */
  side?: Side;
  /** The place's name in its local language, to hear it pronounced by a local voice. */
  say?: { text: string; lang: string };
}

/** BCP-47 voices for the local languages we have names for (single-language countries only, plus Israel). */
const ISO3_TO_LANG: Record<string, string> = { eng: 'en', fra: 'fr', spa: 'es', deu: 'de', ita: 'it', por: 'pt', rus: 'ru', heb: 'he', ara: 'ar', zho: 'zh' };
const VOICE: Record<string, string> = { en: 'en-GB', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', ru: 'ru-RU', he: 'he-IL', ar: 'ar-SA', zh: 'zh-CN' };
const NAME_INDEX: Record<string, number> = { en: 0, fr: 1, es: 2, de: 3, it: 4, pt: 5, ru: 6, he: 7, ar: 8, zh: 9 };
export function localSay(country: Country | undefined, name: string, names?: string[]): GuideFact['say'] {
  if (!country) return undefined;
  const codes = country.iso3 === 'ISR' ? ['heb'] : country.languageCodes ?? [];
  if (codes.length !== 1) return undefined; // several official languages: we can't tell which one locals use here
  const lang = ISO3_TO_LANG[codes[0]];
  if (!lang) return undefined;
  const local = names?.[NAME_INDEX[lang]] || (['ru', 'he', 'ar', 'zh'].includes(lang) ? '' : name);
  return local ? { text: local, lang: VOICE[lang] } : undefined;
}
const sideText = (side?: Side) => (side ? ` ${t(side === 'left' ? 'guide.side.left' : 'guide.side.right')}` : '');

const placeName = (p: RoutePlace, route: RouteCtx) =>
  (route.curatedId && p.stopIndex !== undefined ? journeyStop(route.curatedId, p.stopIndex, { name: p.name }) : p.stop ? p.name : cityName(p));

function countrySummary(c: Country): string {
  const kv = (k: string, v: string) => t('guide.kv', { k, v });
  const parts: string[] = [];
  if (c.capitals.length) parts.push(kv(c.capitals.length > 1 ? t('country.capitals') : t('country.capital'), listJoin(c.capitals.map((_, i) => capitalName(c, i)))));
  const langs = languagesLabel(c);
  if (langs.length) parts.push(kv(t('country.languages'), listJoin(langs)));
  if (c.currencies.length) parts.push(kv(t('country.currency'), listJoin(c.currencies.map((_, i) => currencyLabel(c, i)))));
  parts.push(kv(t('country.area'), `${fmtNum(Math.round(c.area))} km²`));
  return parts.join(' · ');
}

export function buildGuide(route: RouteCtx, data: GameData, wiki: WikiCard[] = [], modeEmoji = '🚆'): GuideFact[] {
  const facts: GuideFact[] = [];
  const iso2 = new Map(data.countries.map((c) => [c.iso2, c]));
  const from = placeName(route.from, route), to = placeName(route.to, route);

  // Departure
  if (!route.explore) {
    facts.push({ id: 'start', at: 0, icon: '🚀', title: t('guide.start.t', { from }),
      text: route.distanceKm >= 10
        ? t('guide.start.e', { to, km: Math.round(route.distanceKm), dir: t(`dir.${compassKey(route.bearingDeg)}` as Key) })
        : t('guide.start.loop', { from }) });
  }

  // Countries entered, with a few verified facts about each
  const used = new Set<string>();
  route.countries.forEach(({ iso3, at }, k) => {
    const c = data.byIso3.get(iso3);
    if (!c) return;
    facts.push({ id: `country-${iso3}`, at: k === 0 ? 0 : at, icon: c.flag || '🏳️',
      title: k === 0 ? t('guide.country.first', { country: countryName(c) }) : t('guide.country.enter', { country: countryName(c) }),
      text: countrySummary(c), source: { label: 'mledoze/countries · Unicode CLDR', url: 'https://github.com/mledoze/countries' } });
    const curated = curatedQuestions().filter((q) => q.kind !== 'truefalse' && q.countries?.[0] === iso3 && !used.has(q.id)).slice(0, 2);
    curated.forEach((q, i) => { used.add(q.id); facts.push({ id: `fact-${q.id}`, at: Math.min(1, at + 0.004 * (i + 1)), icon: '💡', title: t('trip.didYouKnow').replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, ''), text: q.explanation, source: q.source }); });
    EVENTS.filter((e) => e.tags?.[0] === iso3).slice(0, 2).forEach((e, i) => facts.push({
      id: `ev-${e.wiki}`, at: Math.min(1, at + 0.01 + 0.004 * i), icon: '📜', title: formatYearL(e.year), text: eventLabel(e),
      source: { label: 'Wikipedia', url: `https://en.wikipedia.org/wiki/${e.wiki}` },
    }));
  });

  // Towns and stops along the way (all stops + the biggest towns)
  const towns = route.places.filter((p) => !p.stop).sort((a, b) => b.pop - a.pop).slice(0, 18);
  for (const p of [...route.places.filter((x) => x.stop), ...towns]) {
    if (p === route.from || p === route.to) continue;
    const c = p.cc ? iso2.get(p.cc) : undefined;
    const name = placeName(p, route);
    const bits: string[] = [];
    const pop = fmtNum(Number(p.pop.toPrecision(2)));
    const town = p.town ? cityName({ name: p.town, names: p.names }) : undefined;
    if (p.pop > 0 && c && town && !name.includes(town)) bits.push(t('guide.place.stopTown', { place: name, town, country: countryName(c), pop }));
    else if (p.pop > 0 && c) bits.push(t('guide.place.pop', { place: town ?? name, country: countryName(c), pop }));
    else if (c) bits.push(t('guide.place.in', { place: name, country: countryName(c) }));
    if (p.capital && c) bits.push(t('guide.place.capital', { country: countryName(c) }));
    facts.push({ id: `place-${p.name}`, at: p.at, icon: p.stop ? modeEmoji : '🏙️', title: name,
      text: bits.join(' ') || t('guide.place.stop', { place: name }), source: { label: 'GeoNames', url: 'https://www.geonames.org/' },
      say: p.stop && !p.town ? undefined : localSay(c, p.town ?? p.name, p.names) });
  }

  // Legendary journeys: verified stories told at the right stop
  const legend = legendFor(route.curatedId);
  legend?.facts.forEach((f, i) => {
    const p = route.places.find((x) => x.stop && x.name === f.stop);
    const s = JOURNEYS.find((j) => j.id === legend.journey)?.stops.find((x) => x.name === f.stop);
    if (!p && !s) return;
    const at = p ? p.at : nearestOnPath(route.path, [s!.lng, s!.lat]).at;
    const title = route.curatedId ? journeyStop(route.curatedId, 0, { name: f.stop }) : f.stop;
    facts.push({ id: `legend-${i}`, at: Math.min(1, at + 0.0005 * (i + 1)), icon: legend.emoji, title, text: legendFact(legend, i),
      source: { label: 'Wikipedia', url: `https://en.wikipedia.org/wiki/${legend.wiki}` } });
  });

  // Nature: rivers crossed, ranges/deserts entered, peaks in view (Natural Earth, GeoNames names)
  const NE_SRC = { label: 'Natural Earth · GeoNames', url: 'https://www.naturalearthdata.com/' };
  for (const r of route.nature.rivers) facts.push({ id: `river-${r.name}`, at: r.at, icon: '🌊', title: featureName(r), text: t('guide.river', { name: featureName(r) }), source: NE_SRC });
  for (const g of route.nature.regions) facts.push({ id: `region-${g.name}`, at: g.at, icon: g.kind === 'desert' ? '🏜️' : g.kind === 'plateau' ? '🟫' : '⛰️', title: featureName(g),
    text: t(`guide.region.${g.kind}` as Key, { name: featureName(g) }), source: NE_SRC });
  const nearLandmark = (_c: { at: number }, name: string) => route.landmarks.some((x) => (x.l.name.includes(name) || name.includes(x.l.name) || lmName(x.l) === name));
  for (const pk of route.nature.peaks.filter((x) => !nearLandmark(x, x.name) && !nearLandmark(x, featureName(x)))) facts.push({ id: `peak-${pk.name}`, at: pk.at, icon: pk.volcano ? '🌋' : '🏔️', title: featureName(pk), side: pk.side,
    text: `${t(pk.volcano ? 'guide.volcano' : 'guide.peak', { name: featureName(pk), m: fmtNum(pk.elevation), km: Math.max(1, Math.round(pk.offKm)) })}${sideText(pk.side)}`, source: NE_SRC });

  // Landmarks near the route
  for (const { l, at, offKm, side } of route.landmarks) {
    facts.push({ id: `lm-${l.id}`, at, icon: l.emoji, title: lmName(l), side: route.explore ? undefined : side,
      text: `${lmFact(l)} ${route.explore ? t('guide.lm.around', { km: offKm < 1 ? '<1' : Math.round(offKm) }) : t('guide.lm.near', { km: Math.max(1, Math.round(offKm)) })}${route.explore ? '' : sideText(side)}`,
      source: { label: 'Wikipedia', url: `https://en.wikipedia.org/wiki/${l.wiki}` } });
  }

  // Wikipedia cards (downloaded pack or explore mode) — shown as Wikipedia text
  for (const w of wiki) {
    if (w.lat === undefined || w.lng === undefined) continue;
    const pt: LngLat = [w.lng, w.lat];
    const at = route.explore ? Math.min(1, haversineKm(route.path[0].p, pt) / 5) : nearestOnPath(route.path, pt).at;
    facts.push({ id: `wiki-${w.title}`, at, icon: '📖', title: w.title, text: w.extract, source: { label: 'Wikipedia (CC BY-SA)', url: w.url } });
  }

  // Arrival
  if (!route.explore) facts.push({ id: 'end', at: 1, icon: '🏁', title: t('guide.end.t', { to }), text: t('guide.end.e', { to }) });

  // De-duplicate by id, order along the route (explore: by distance)
  // Same position: departure, then country, facts, towns, landmarks, Wikipedia, arrival.
  const rank = (f: GuideFact) => ['start', 'country', 'fact', 'ev', 'place', 'legend', 'river', 'region', 'peak', 'lm', 'wiki', 'end'].indexOf(f.id.split('-')[0]);
  const seen = new Set<string>();
  return facts.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)))
    .sort((a, b) => a.at - b.at || rank(a) - rank(b));
}

/** Index of the fact the traveller has just reached. */
export function currentFactIndex(facts: GuideFact[], progress: number): number {
  let k = 0;
  facts.forEach((f, i) => { if (f.at <= progress + 1e-6) k = i; });
  return k;
}

