import type { Country, Difficulty, Question, QuestionKind, Region } from '../types';
import { LANDMARKS } from '../content/landmarks';
import { EVENTS } from '../content/events';
import { fmtNum, fwd, listJoin, tc, type Key, t } from '../i18n';
import { compassKey, type RouteCtx, type RoutePlace } from './route';
import { haversineKm } from '../geo/geo';
import { journeyStop, capitalName, capitalsList, countryName, curatedQuestions, currencyLabel, eventLabel, formatYearL, lmCity, lmClue, lmFact, lmName, regionLabel, subregionLabel } from '../i18n/content';
import { type Rng, pick, shuffle, weightedPick } from './rng';

/**
 * Generated questions use structured data (mledoze/countries, ODbL) — never free text —
 * so the correct answer always comes from the dataset and is never invented.
 */

/** Countries with disputed land borders — excluded from generated border true/false questions. */
const CONTESTED = new Set(['ISR', 'PSE', 'TWN', 'UNK', 'ESH', 'CYP', 'XKX', 'SOM', 'ARM', 'AZE', 'IND', 'PAK', 'CHN', 'KOR', 'PRK', 'GEO', 'RUS', 'UKR', 'MAR', 'SRB']);
/** Capital & map questions: a small explicit exclusion list of politically sensitive cases. */
const CAPITAL_EXCLUDE = new Set(['ISR', 'PSE', 'TWN', 'UNK', 'ESH']);
const FAMOUS = new Set(['USA', 'FRA', 'GBR', 'DEU', 'ITA', 'ESP', 'JPN', 'CHN', 'IND', 'BRA', 'CAN', 'AUS', 'RUS', 'MEX', 'EGY', 'ARG', 'ZAF', 'GRC', 'PRT', 'IRL', 'NLD', 'BEL', 'CHE', 'AUT', 'SWE', 'NOR', 'TUR', 'THA', 'KOR', 'NZL']);

const W = (t: string) => ({ label: 'Wikipedia', url: `https://en.wikipedia.org/wiki/${encodeURI(t.replace(/ /g, '_'))}` });
const DATA_SRC = { label: 'mledoze/countries (ODbL)', url: 'https://github.com/mledoze/countries' };

export interface GameData {
  countries: Country[];
  byIso3: Map<string, Country>;
  /** ISO numeric ids drawn in the quiz map (Natural Earth 1:110m). */
  mapNums?: Set<string>;
  /** Whether this device renders flag emoji (Windows does not). */
  flagsOk: boolean;
}

export function makeGameData(countries: Country[], flagsOk: boolean, mapNums?: Set<string>): GameData {
  return { countries, byIso3: new Map(countries.map((c) => [c.iso3, c])), flagsOk, mapNums };
}

function difficultyOf(c: Country): Difficulty {
  if (FAMOUS.has(c.iso3)) return 1;
  if (c.area < 30000) return 3;
  return 2;
}

/** Options: correct + 3 distractors, preferring same subregion/region and similar length. */
function optionsFor(correct: string, pool: string[], rnd: Rng, n = 4): { options: string[]; answer: number } {
  const uniq = [...new Set(pool.filter((p) => p && p !== correct))];
  const byLen = uniq.sort((a, b) => Math.abs(a.length - correct.length) - Math.abs(b.length - correct.length));
  const distractors = shuffle(byLen.slice(0, Math.max(n + 3, 8)), rnd).slice(0, n - 1);
  const options = shuffle([correct, ...distractors], rnd);
  return { options, answer: options.indexOf(correct) };
}

function neighbours(data: GameData, c: Country, rnd: Rng, filter: (x: Country) => boolean): Country[] {
  const same = data.countries.filter((x) => x.iso3 !== c.iso3 && filter(x) && x.subregion === c.subregion);
  const region = data.countries.filter((x) => x.iso3 !== c.iso3 && filter(x) && x.region === c.region && x.subregion !== c.subregion);
  const world = data.countries.filter((x) => x.iso3 !== c.iso3 && filter(x) && x.region !== c.region);
  return [...shuffle(same, rnd), ...shuffle(region, rnd), ...shuffle(world, rnd)];
}

const eligible = (c: Country) => c.un;

// ------------------------------------------------------------------ generators
// Every visible string goes through the catalog (gen.* keys) and CLDR names, so generated
// questions come out in the player's language. Answers still come from structured data only.
export type Gen = (data: GameData, rnd: Rng, focus?: Country, route?: RouteCtx) => Question | null;
const cn = countryName;

const genCapital: Gen = (data, rnd, focus) => {
  const ok = (x: Country) => eligible(x) && !!x.capital && !CAPITAL_EXCLUDE.has(x.iso3);
  const c = focus && ok(focus) ? focus : pick(data.countries.filter(ok), rnd);
  const pool = neighbours(data, c, rnd, ok).slice(0, 12).map((x) => capitalName(x));
  const { options, answer } = optionsFor(capitalName(c), pool, rnd);
  const multi = c.capitals.length > 1 ? ' ' + tc('gen.capital.multi', '{country} has more than one capital: {list}.', { country: cn(c), list: listJoin(capitalsList(c)) }) : '';
  return { id: `cap-${c.iso3}`, kind: 'capital', category: 'capitals', difficulty: difficultyOf(c),
    prompt: tc('gen.capital.q', 'What is the capital of {country}?', { country: cn(c) }), options, answer,
    explanation: tc('gen.capital.e', '{capital} is the capital of {country}.', { capital: capitalName(c), country: cn(c) }) + multi,
    source: W(c.capital), countries: [c.iso3] };
};

const genCapitalReverse: Gen = (data, rnd, focus) => {
  const ok = (x: Country) => eligible(x) && !!x.capital && !CAPITAL_EXCLUDE.has(x.iso3);
  const c = focus && ok(focus) ? focus : pick(data.countries.filter(ok), rnd);
  const pool = neighbours(data, c, rnd, ok).slice(0, 12).map((x) => cn(x));
  const { options, answer } = optionsFor(cn(c), pool, rnd);
  return { id: `capr-${c.iso3}`, kind: 'capital', category: 'capitals', difficulty: Math.min(3, difficultyOf(c) + 1) as Difficulty,
    prompt: tc('gen.capr.q', '{capital} is the capital of which country?', { capital: capitalName(c) }), options, answer,
    explanation: tc('gen.capr.e', '{capital} is the capital of {country} ({subregion}).', { capital: capitalName(c), country: cn(c), subregion: subregionLabel(c.subregion) }),
    source: W(c.capital), countries: [c.iso3] };
};

const genFlag: Gen = (data, rnd, focus) => {
  if (!data.flagsOk) return null;
  const ok = (x: Country) => eligible(x) && !!x.flag;
  const c = focus && ok(focus) ? focus : pick(data.countries.filter(ok), rnd);
  const pool = neighbours(data, c, rnd, ok).slice(0, 10).map((x) => cn(x));
  const { options, answer } = optionsFor(cn(c), pool, rnd);
  return { id: `flag-${c.iso3}`, kind: 'observation', category: 'flags', difficulty: difficultyOf(c),
    prompt: tc('gen.flag.q', 'Look closely! Which country does this flag belong to?  {flag}', { flag: c.flag }), options, answer,
    explanation: tc('gen.flag.e', '{flag} is the flag of {country}.', { flag: c.flag, country: cn(c) }), source: W(`Flag of ${c.name}`), countries: [c.iso3] };
};

const tf = () => [tc('common.true', 'True'), tc('common.false', 'False')];

const genBorderTF: Gen = (data, rnd, focus) => {
  const ok = (x: Country) => eligible(x) && x.borders.length > 0 && !CONTESTED.has(x.iso3);
  const c = focus && ok(focus) ? focus : pick(data.countries.filter(ok), rnd);
  const truth = rnd() < 0.5;
  let other: Country | undefined;
  if (truth) other = data.byIso3.get(pick(c.borders, rnd));
  else other = neighbours(data, c, rnd, (x) => eligible(x) && !c.borders.includes(x.iso3) && !CONTESTED.has(x.iso3))[0];
  if (!other || CONTESTED.has(other.iso3)) return null;
  const list = listJoin(c.borders.map((b) => data.byIso3.get(b)).filter((x): x is Country => !!x).map(cn));
  return { id: `bord-${c.iso3}-${other.iso3}`, kind: 'truefalse', category: 'geography', difficulty: 2,
    prompt: tc('gen.border.q', 'True or false: {a} shares a land border with {b}.', { a: cn(c), b: cn(other) }), options: tf(), answer: truth ? 0 : 1,
    explanation: truth ? tc('gen.border.yes', 'True. {a} has land borders with: {list}.', { a: cn(c), list }) : tc('gen.border.no', 'False. {a} has land borders with: {list}.', { a: cn(c), list }),
    source: DATA_SRC, countries: [c.iso3, other.iso3] };
};

const genLandlocked: Gen = (data, rnd, focus) => {
  const ok = (x: Country) => eligible(x) && x.area > 20000;
  const c = focus && ok(focus) ? focus : pick(data.countries.filter(ok), rnd);
  return { id: `land-${c.iso3}`, kind: 'truefalse', category: 'geography', difficulty: 2,
    prompt: tc('gen.land.q', 'True or false: {country} is landlocked (it has no coastline on the open sea).', { country: cn(c) }), options: tf(), answer: c.landlocked ? 0 : 1,
    explanation: c.landlocked ? tc('gen.land.yes', 'True — {country} is landlocked.', { country: cn(c) }) : tc('gen.land.no', 'False — {country} has a coastline.', { country: cn(c) }),
    source: DATA_SRC, countries: [c.iso3] };
};

const genArea: Gen = (data, rnd, focus) => {
  const base = focus && eligible(focus) ? focus : pick(data.countries.filter(eligible), rnd);
  const pool = shuffle(data.countries.filter((x) => eligible(x) && x.region === base.region && x.iso3 !== base.iso3), rnd);
  const set: Country[] = [base];
  for (const x of pool) {
    if (set.every((y) => Math.max(x.area, y.area) / Math.min(x.area, y.area) > 1.25)) set.push(x);
    if (set.length === 4) break;
  }
  if (set.length < 4) return null;
  const largest = set.reduce((a, b) => (a.area > b.area ? a : b));
  const options = shuffle(set.map(cn), rnd);
  return { id: `area-${set.map((x) => x.iso3).sort().join('')}`, kind: 'observation', category: 'geography', difficulty: 2,
    prompt: tc('gen.area.q', 'Which of these countries is the LARGEST by area?'), options, answer: options.indexOf(cn(largest)),
    explanation: set.sort((a, b) => b.area - a.area).map((x) => tc('gen.area.item', '{country}: {area} km²', { country: cn(x), area: Math.round(x.area) })).join(' · '),
    source: DATA_SRC, countries: set.map((x) => x.iso3) };
};

const genRegion: Gen = (data, rnd, focus) => {
  const ok = (x: Country) => eligible(x) && !!x.subregion;
  const c = focus && ok(focus) ? focus : pick(data.countries.filter(ok), rnd);
  const subs = [...new Set(data.countries.map((x) => x.subregion).filter(Boolean))].map(subregionLabel);
  const { options, answer } = optionsFor(subregionLabel(c.subregion), subs, rnd);
  return { id: `reg-${c.iso3}`, kind: 'mcq', category: 'geography', difficulty: 2,
    prompt: tc('gen.region.q', 'In which world region (UN geoscheme) is {country}?', { country: cn(c) }), options, answer,
    explanation: tc('gen.region.e', '{country} is in {subregion} ({region}).', { country: cn(c), subregion: subregionLabel(c.subregion), region: regionLabel(c.region) }),
    source: { label: 'UN M49', url: 'https://unstats.un.org/unsd/methodology/m49/' }, countries: [c.iso3] };
};

const genMapFind: Gen = (data, rnd, focus) => {
  const ok = (x: Country) => eligible(x) && x.area > 25000 && (!data.mapNums || data.mapNums.has(x.num)) && !CAPITAL_EXCLUDE.has(x.iso3);
  const c = focus && ok(focus) ? focus : pick(data.countries.filter(ok), rnd);
  if (!ok(c)) return null;
  const near = c.borders.slice(0, 4).map((b) => data.byIso3.get(b)).filter((x): x is Country => !!x).map(cn);
  return { id: `map-${c.iso3}`, kind: 'mapfind', category: 'geography', difficulty: difficultyOf(c),
    prompt: tc('gen.map.q', 'Tap {country} on the map!', { country: cn(c) }), targetNum: c.num, targetName: cn(c),
    explanation: tc('gen.map.e', '{country} is in {subregion}. Its neighbours include {list}.', { country: cn(c), subregion: subregionLabel(c.subregion), list: near.length ? listJoin(near) : tc('gen.map.sea', 'only the sea') }),
    source: { label: 'Natural Earth', url: 'https://www.naturalearthdata.com/' }, countries: [c.iso3] };
};

const genCurrency: Gen = (data, rnd, focus) => {
  const ok = (x: Country) => eligible(x) && x.currencies.length === 1;
  const c = focus && ok(focus) ? focus : pick(data.countries.filter(ok), rnd);
  if (!ok(c)) return null;
  const pool = neighbours(data, c, rnd, ok).slice(0, 14).map((x) => currencyLabel(x));
  const { options, answer } = optionsFor(currencyLabel(c), pool, rnd);
  if (new Set(options).size < 4) return null;
  return { id: `cur-${c.iso3}`, kind: 'mcq', category: 'culture', difficulty: 2,
    prompt: tc('gen.cur.q', 'Travel tip! Which currency do you need in {country}?', { country: cn(c) }), options, answer,
    explanation: tc('gen.cur.e', 'The official currency of {country}: {currency}.', { country: cn(c), currency: currencyLabel(c) }), source: DATA_SRC, countries: [c.iso3] };
};

/** Landmarks to ask about. On a trip: landmarks near the route, else in the route's countries — never the whole world. */
function landmarkPool(focus?: Country, route?: RouteCtx) {
  if (route?.landmarks.length) return route.landmarks.map((x) => x.l);
  const local = focus ? LANDMARKS.filter((l) => l.iso3 === focus.iso3 || l.shared?.includes(focus.iso3)) : [];
  if (route) return local;
  return local.length ? local : LANDMARKS;
}

const genLandmarkCountry: Gen = (data, rnd, focus, route) => {
  const pool0 = landmarkPool(focus, route).filter((x) => !x.shared);
  if (!pool0.length) return null;
  const l = pick(pool0, rnd);
  if (!l) return null;
  const c = data.byIso3.get(l.iso3);
  if (!c) return null;
  const pool = neighbours(data, c, rnd, eligible).slice(0, 10).map(cn);
  const { options, answer } = optionsFor(cn(c), pool, rnd);
  return { id: `lmc-${l.id}`, kind: 'monument', category: 'landmarks', difficulty: 1,
    prompt: tc('gen.lmc.q', '{emoji} In which country can you visit {landmark}?', { emoji: l.emoji, landmark: lmName(l) }), options, answer,
    explanation: tc('gen.lmc.e', '{landmark} is in {city}, {country}. {fact}', { landmark: lmName(l), city: lmCity(l), country: cn(c), fact: lmFact(l) }),
    source: W(decodeURIComponent(l.wiki)), countries: [l.iso3], imageTitle: l.wiki };
};

const genMonument: Gen = (_data, rnd, focus, route) => {
  const lp = landmarkPool(focus, route);
  if (!lp.length) return null;
  const l = pick(lp, rnd);
  const others = shuffle(LANDMARKS.filter((x) => x.id !== l.id && x.kind === l.kind), rnd);
  const pool = [...others, ...shuffle(LANDMARKS.filter((x) => x.id !== l.id && x.kind !== l.kind), rnd)].slice(0, 8).map(lmName);
  const { options, answer } = optionsFor(lmName(l), pool, rnd);
  return { id: `mon-${l.id}`, kind: 'monument', category: 'landmarks', difficulty: 2,
    prompt: tc('gen.mon.q', 'Recognise this landmark!'), clue: lmClue(l), imageTitle: l.wiki, options, answer,
    explanation: tc('gen.mon.e', '{emoji} {landmark} — {city}. {fact}', { emoji: l.emoji, landmark: lmName(l), city: lmCity(l), fact: lmFact(l) }),
    source: W(decodeURIComponent(l.wiki)), countries: [l.iso3, ...(l.shared ?? [])] };
};

const genChronology: Gen = (_data, rnd, focus, route) => {
  const local = focus ? EVENTS.filter((e) => e.tags?.includes(focus.iso3)) : [];
  if (route && local.length < 3) return null; // on a trip, only timelines about the route's countries
  const pool = shuffle(route ? local : EVENTS, rnd);
  const set = [...shuffle(local, rnd).slice(0, route ? 4 : 2)];
  for (const e of pool) {
    if (set.length >= 4) break;
    if (!set.some((x) => x.label === e.label || Math.abs(x.year - e.year) < 3)) set.push(e);
  }
  if (set.length < 4) return null;
  const order = set.slice().sort((a, b) => a.year - b.year);
  return { id: `chr-${order.map((e) => e.year).join('-')}`, kind: 'chronology', category: 'history', difficulty: 2,
    prompt: tc('gen.chr.q', 'Put these events in order — oldest first!'), order: order.map((e) => ({ label: eventLabel(e), year: e.year })),
    explanation: order.map((e) => `${formatYearL(e.year)}: ${eventLabel(e)}`).join(' · '), source: W(order[0].wiki),
    countries: [...new Set(order.flatMap((e) => e.tags ?? []))] };
};

const curatedFor = (focus?: Country) => {
  const all = curatedQuestions();
  return focus ? all.filter((q) => q.countries?.includes(focus.iso3)) : all;
};

const genCurated: Gen = (_d, rnd, focus, route) => {
  if (route && !focus) return null;
  const pool = curatedFor(focus);
  return pool.length ? { ...pick(pool, rnd) } : null;
};

// ------------------------------------------------------------------ route generators
// Built only from the trip's own stops, towns (GeoNames), landmarks and countries.
function placeName(p: RoutePlace, route: RouteCtx) {
  return route.curatedId && p.stopIndex !== undefined ? journeyStop(route.curatedId, p.stopIndex, { name: p.name }) : p.name;
}
const GEONAMES_SRC = { label: 'GeoNames (CC BY 4.0)', url: 'https://www.geonames.org/' };
const routeIsos = (route: RouteCtx) => route.countries.map((c) => c.iso3);
const uniqueByName = (ps: RoutePlace[], route: RouteCtx) => {
  const seen = new Set<string>();
  return ps.filter((p) => { const n = placeName(p, route); if (seen.has(n)) return false; seen.add(n); return true; });
};
/** Pick up to n places whose positions along the route are clearly apart. */
function spaced(ps: RoutePlace[], n: number, rnd: Rng, gap = 0.04) {
  const out: RoutePlace[] = [];
  for (const p of shuffle(ps, rnd)) { if (out.every((q) => Math.abs(q.at - p.at) >= gap)) out.push(p); if (out.length === n) break; }
  return out;
}
const roundKm = (km: number) => (km < 100 ? Math.max(5, Math.round(km / 5) * 5) : km < 1000 ? Math.round(km / 10) * 10 : Math.round(km / 50) * 50);

const rOrder: Gen = (_d, rnd, _f, route) => {
  if (!route || route.explore) return null;
  const pool = uniqueByName(route.places, route).filter((p) => p !== route.from && p !== route.to);
  const upcoming = pool.filter((p) => p.at > (route.progress ?? 0) + 0.01);
  const set = spaced(upcoming.length >= 4 ? upcoming : pool, 4, rnd);
  if (set.length < 4) return null;
  const sorted = set.slice().sort((a, b) => a.at - b.at);
  const names = sorted.map((p) => placeName(p, route));
  const options = shuffle(names, rnd);
  return { id: `r-order-${names.join('|')}`, kind: 'mcq', category: 'geography', difficulty: 2,
    prompt: tc('gen.r.order.q', 'Starting from {from}, which of these places do you reach first?', { from: placeName(route.from, route) }),
    options, answer: options.indexOf(names[0]),
    explanation: tc('gen.r.order.e', 'In order along your route: {list}.', { list: names.join(` ${fwd()} `) }), source: GEONAMES_SRC, countries: routeIsos(route) };
};

const rOnRoute: Gen = (_d, rnd, _f, route) => {
  if (!route || route.explore || route.offRoute.length < 3) return null;
  const towns = uniqueByName(route.places, route).filter((p) => p.cc && p !== route.from && p !== route.to);
  if (!towns.length) return null;
  const p = pick(towns, rnd);
  const name = placeName(p, route);
  const onNames = new Set(route.places.map((x) => placeName(x, route)));
  const same = route.offRoute.filter((c) => c.cc === p.cc && !onNames.has(c.name));
  const pool = (same.length >= 3 ? same : route.offRoute.filter((c) => !onNames.has(c.name)))
    .sort((a, b) => Math.abs(Math.log((a.pop || 1) / (p.pop || 1e5))) - Math.abs(Math.log((b.pop || 1) / (p.pop || 1e5))));
  const distract = shuffle(pool.slice(0, 8), rnd).slice(0, 3).map((c) => c.name);
  if (new Set([name, ...distract]).size < 4) return null;
  const options = shuffle([name, ...distract], rnd);
  return { id: `r-on-${name}`, kind: 'mcq', category: 'geography', difficulty: 2,
    prompt: tc('gen.r.on.q', 'Which of these places is on your route?'), options, answer: options.indexOf(name),
    explanation: tc('gen.r.on.e', '{place} is on your route, about {km} km from {from}. The others are well away from it.', { place: name, km: Math.round(p.at * route.pathKm), from: placeName(route.from, route) }),
    source: GEONAMES_SRC, countries: routeIsos(route) };
};

const rLargest: Gen = (_d, rnd, _f, route) => {
  if (!route || route.explore) return null;
  const withPop = shuffle(uniqueByName(route.places, route).filter((p) => p.pop > 0), rnd).filter((p, i, arr) => arr.findIndex((q) => (q.town ?? q.name) === (p.town ?? p.name)) === i);
  const set: RoutePlace[] = [];
  for (const p of withPop) { if (set.every((q) => Math.max(p.pop, q.pop) / Math.min(p.pop, q.pop) > 1.4)) set.push(p); if (set.length === 4) break; }
  if (set.length < 4) return null;
  const top = set.reduce((a, b) => (a.pop > b.pop ? a : b));
  const label = (x: RoutePlace) => x.town ?? placeName(x, route);
  const options = shuffle(set.map(label), rnd);
  const approx = (n: number) => fmtNum(Number(n.toPrecision(2)));
  return { id: `r-big-${options.slice().sort().join('|')}`, kind: 'observation', category: 'geography', difficulty: 2,
    prompt: tc('gen.r.big.q', 'Which of these places on your route has the most inhabitants?'), options, answer: options.indexOf(label(top)),
    explanation: set.sort((a, b) => b.pop - a.pop).map((x) => tc('gen.r.big.item', '{place}: about {pop}', { place: label(x), pop: approx(x.pop) })).join(' · '),
    source: GEONAMES_SRC, countries: routeIsos(route) };
};

const rDistance: Gen = (_d, rnd, _f, route) => {
  if (!route || route.explore || route.distanceKm < 10) return null;
  const km = roundKm(route.distanceKm);
  const values = [...new Set([km, roundKm(km * 0.55), roundKm(km * 1.6), roundKm(km * 2.4)])];
  if (values.length < 4) return null;
  const label = (v: number) => tc('gen.r.km', '{km} km', { km: v });
  const options = shuffle(values.map(label), rnd);
  return { id: `r-dist-${km}`, kind: 'mcq', category: 'geography', difficulty: 2,
    prompt: tc('gen.r.dist.q', 'As the crow flies, how far is it from {from} to {to}?', { from: placeName(route.from, route), to: placeName(route.to, route) }),
    options, answer: options.indexOf(label(km)),
    explanation: tc('gen.r.dist.e', 'About {km} km in a straight line (great-circle distance). The line of your trip is about {path} km.', { km, path: roundKm(route.pathKm) }),
    source: { label: 'Great-circle distance', url: 'https://en.wikipedia.org/wiki/Great-circle_distance' }, countries: routeIsos(route) };
};

const DIRS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
const rDirection: Gen = (_d, rnd, _f, route) => {
  if (!route || route.explore || route.distanceKm < 20) return null;
  const k = compassKey(route.bearingDeg);
  const i = DIRS.indexOf(k);
  const far = DIRS.filter((_, j) => Math.min(Math.abs(j - i), 8 - Math.abs(j - i)) >= 2);
  const keys = shuffle([k, ...shuffle(far, rnd).slice(0, 3)], rnd);
  const options = keys.map((x) => t(`dir.${x}` as Key));
  return { id: `r-dir-${k}-${Math.round(route.distanceKm)}`, kind: 'mcq', category: 'geography', difficulty: 1,
    prompt: tc('gen.r.dir.q', 'Going from {from} to {to}, which direction are you mainly heading?', { from: placeName(route.from, route), to: placeName(route.to, route) }),
    options, answer: keys.indexOf(k),
    explanation: tc('gen.r.dir.e', 'Mainly {dir}: the initial compass bearing is about {deg}°.', { dir: t(`dir.${k}` as Key), deg: Math.round(route.bearingDeg) }),
    source: { label: 'Bearing', url: 'https://en.wikipedia.org/wiki/Bearing_(navigation)' }, countries: routeIsos(route) };
};

const rCountryOf: Gen = (data, rnd, _f, route) => {
  if (!route || route.countries.length < 2) return null;
  const towns = route.places.filter((p) => p.cc && p !== route.from);
  if (!towns.length) return null;
  const p = pick(towns, rnd);
  const c = data.countries.find((x) => x.iso2 === p.cc);
  if (!c) return null;
  const pool = [...route.countries.map((x) => data.byIso3.get(x.iso3)), ...neighbours(data, c, rnd, eligible).slice(0, 6)]
    .filter((x): x is Country => !!x && x.iso3 !== c.iso3).map(cn);
  const { options, answer } = optionsFor(cn(c), pool, rnd);
  if (new Set(options).size < 4) return null;
  return { id: `r-cc-${p.name}`, kind: 'mcq', category: 'geography', difficulty: 2,
    prompt: tc('gen.r.cc.q', '{place} is on your route. Which country is it in?', { place: placeName(p, route) }), options, answer,
    explanation: tc('gen.r.cc.e', '{place} is in {country}.', { place: placeName(p, route), country: cn(c) }), source: GEONAMES_SRC, countries: [c.iso3] };
};

const rNextCountry: Gen = (data, rnd, _f, route) => {
  if (!route || route.countries.length < 2) return null;
  const i = 1 + Math.floor(rnd() * (route.countries.length - 1));
  const a = data.byIso3.get(route.countries[i - 1].iso3), b = data.byIso3.get(route.countries[i].iso3);
  if (!a || !b) return null;
  const pool = [...route.countries.map((x) => data.byIso3.get(x.iso3)), ...neighbours(data, a, rnd, eligible).slice(0, 6)]
    .filter((x): x is Country => !!x && x.iso3 !== a.iso3 && x.iso3 !== b.iso3).map(cn);
  const { options, answer } = optionsFor(cn(b), pool, rnd);
  if (new Set(options).size < 4) return null;
  const order = route.countries.map((x) => data.byIso3.get(x.iso3)).filter((x): x is Country => !!x).map(cn).join(` ${fwd()} `);
  return { id: `r-next-${a.iso3}-${b.iso3}`, kind: 'mcq', category: 'geography', difficulty: 2,
    prompt: tc('gen.r.next.q', 'After {country}, which country does your route enter next?', { country: cn(a) }), options, answer,
    explanation: tc('gen.r.next.e', 'Countries in order along your route: {list}.', { list: order }), source: DATA_SRC, countries: [a.iso3, b.iso3] };
};

const rLandmarkNear: Gen = (_d, rnd, _f, route) => {
  if (!route || route.explore || !route.landmarks.length) return null;
  const { l } = pick(route.landmarks, rnd);
  const places = uniqueByName(route.places, route);
  const dist = places.map((p) => ({ p, d: haversineKm([p.lng, p.lat], [l.lng, l.lat]) })).sort((a, b) => a.d - b.d);
  if (dist.length < 4 || dist[0].d > 60 || dist[1].d < dist[0].d * 1.5) return null;
  const correct = placeName(dist[0].p, route);
  const others = shuffle(dist.slice(1).filter((x) => x.d > dist[0].d * 1.5), rnd).slice(0, 3).map((x) => placeName(x.p, route));
  if (others.length < 3) return null;
  const options = shuffle([correct, ...others], rnd);
  return { id: `r-lm-${l.id}`, kind: 'monument', category: 'landmarks', difficulty: 2,
    prompt: tc('gen.r.lm.q', '{emoji} {landmark} is near your route. Which place on your route is it closest to?', { emoji: l.emoji, landmark: lmName(l) }),
    options, answer: options.indexOf(correct),
    explanation: tc('gen.r.lm.e', '{landmark} is about {km} km from {place}. {fact}', { landmark: lmName(l), km: Math.max(1, Math.round(dist[0].d)), place: correct, fact: lmFact(l) }),
    source: W(decodeURIComponent(l.wiki)), countries: [l.iso3], imageTitle: l.wiki };
};

export const GENERATORS: Record<string, Gen> = {
  rOrder, rOnRoute, rLargest, rDistance, rDirection, rCountryOf, rNextCountry, rLandmarkNear,
  curated: genCurated, capital: genCapital, capitalReverse: genCapitalReverse, flag: genFlag, border: genBorderTF,
  landlocked: genLandlocked, area: genArea, region: genRegion, mapfind: genMapFind, currency: genCurrency,
  landmarkCountry: genLandmarkCountry, monument: genMonument, chronology: genChronology,
};

/** On a trip: mostly questions about the route itself, then about the route's countries. */
export const ROUTE_WEIGHTS: Partial<Record<keyof typeof GENERATORS, number>> = {
  rOrder: 2, rOnRoute: 2, rLargest: 1.2, rDistance: 0.8, rDirection: 0.7, rCountryOf: 1, rNextCountry: 1, rLandmarkNear: 1.6,
  monument: 1.4, landmarkCountry: 0.6, curated: 1.4, capital: 0.6, currency: 0.4, flag: 0.4, mapfind: 0.5, border: 0.3, chronology: 0.4,
};

const DEFAULT_WEIGHTS: Partial<Record<keyof typeof GENERATORS, number>> = {
  curated: 3, capital: 2, capitalReverse: 1, flag: 1.2, border: 1, landlocked: 0.5, area: 1, region: 0.5,
  mapfind: 1.3, currency: 0.6, landmarkCountry: 1, monument: 1.5, chronology: 0.7,
};

export const BLITZ_WEIGHTS: Partial<Record<keyof typeof GENERATORS, number>> = { capital: 3, flag: 2, capitalReverse: 1, landlocked: 1, border: 1 };

export interface SessionOptions {
  count: number;
  rnd: Rng;
  /** Prefer questions about these ISO3 countries (e.g. countries along the route). */
  focus?: string[];
  region?: Region;
  weights?: Partial<Record<keyof typeof GENERATORS, number>>;
  maxDifficulty?: Difficulty;
  timeLimit?: number;
  surpriseRate?: number;
  exclude?: Set<string>;
  /** Share of questions targeted at `focus` countries (default 0.75). */
  focusRate?: number;
  /** Trip context: questions are then strictly about the route and its countries. */
  route?: RouteCtx;
}

export function buildSession(data: GameData, o: SessionOptions): Question[] {
  const weights = Object.entries(o.weights ?? (o.route ? ROUTE_WEIGHTS : DEFAULT_WEIGHTS)) as [string, number][];
  let focusCountries = (o.focus ?? []).map((i) => data.byIso3.get(i)).filter((c): c is Country => !!c);
  const routeSet = o.route ? new Set(o.route.countries.map((c) => c.iso3)) : null;
  if (o.route && !focusCountries.length) focusCountries = o.route.countries.map((c) => data.byIso3.get(c.iso3)).filter((c): c is Country => !!c);
  if (o.region) focusCountries = data.countries.filter((c) => c.region === o.region && c.un);
  const out: Question[] = [];
  const seen = new Set<string>(o.exclude ?? []);
  let guard = 0;
  // Variety: in short sessions each question type appears once (relaxed if the pool runs dry).
  const perGen = new Map<string, number>();
  const cap = () => (guard > o.count * 20 ? Infinity : o.count <= 8 ? 1 : 2);
  while (out.length < o.count && guard++ < o.count * 40) {
    const genName = weightedPick(weights, o.rnd);
    if ((perGen.get(genName) ?? 0) >= cap()) continue;
    const gen = GENERATORS[genName];
    const useFocus = focusCountries.length > 0 && o.rnd() < (o.region || o.route ? 1 : o.focusRate ?? 0.75);
    const focus = useFocus ? pick(focusCountries, o.rnd) : undefined;
    const q = gen(data, o.rnd, focus, o.route);
    if (!q || seen.has(q.id)) continue;
    // On a trip, never keep a question unrelated to the route's countries.
    if (routeSet && !(q.countries ?? []).some((iso) => routeSet.has(iso))) continue;
    if (o.region && q.countries && !q.countries.some((iso) => data.byIso3.get(iso)?.region === o.region)) continue;
    if (o.maxDifficulty && q.difficulty > o.maxDifficulty) continue;
    seen.add(q.id);
    perGen.set(genName, (perGen.get(genName) ?? 0) + 1);
    if (o.timeLimit && q.kind !== 'chronology' && q.kind !== 'mapfind') q.timeLimit = o.timeLimit;
    if (o.surpriseRate && out.length > 1 && o.rnd() < o.surpriseRate) q.bonus = true;
    out.push(q);
  }
  return out;
}

/** Validate a question's internal consistency (used by tests over thousands of samples). */
export function validateQuestion(q: Question): string[] {
  const errs: string[] = [];
  if (!q.prompt) errs.push('missing prompt');
  if (!q.explanation) errs.push('missing explanation');
  if (q.kind === 'chronology') {
    if (!q.order || q.order.length < 3) errs.push('chronology needs >=3 items');
    else if (q.order.some((e, i) => i && e.year < q.order![i - 1].year)) errs.push('chronology not sorted');
  } else if (q.kind === 'mapfind') {
    if (!q.targetNum) errs.push('mapfind needs targetNum');
  } else {
    if (!q.options || q.options.length < 2) errs.push('needs options');
    else {
      if (new Set(q.options).size !== q.options.length) errs.push('duplicate options');
      if (q.answer === undefined || q.answer < 0 || q.answer >= q.options.length) errs.push('answer out of range');
    }
  }
  return errs;
}

export const kindLabel = (k: QuestionKind) => t(`kind.${k}` as Key);
