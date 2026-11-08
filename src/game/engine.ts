import type { Country, Difficulty, Question, QuestionKind, Region } from '../types';
import { LANDMARKS } from '../content/landmarks';
import { EVENTS } from '../content/events';
import { listJoin, tc, type Key, t } from '../i18n';
import { capitalName, capitalsList, countryName, curatedQuestions, currencyLabel, eventLabel, formatYearL, lmCity, lmClue, lmFact, lmName, regionLabel, subregionLabel } from '../i18n/content';
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
export type Gen = (data: GameData, rnd: Rng, focus?: Country) => Question | null;
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

function landmarkPool(focus?: Country) {
  const local = focus ? LANDMARKS.filter((l) => l.iso3 === focus.iso3 || l.shared?.includes(focus.iso3)) : [];
  return local.length ? local : LANDMARKS;
}

const genLandmarkCountry: Gen = (data, rnd, focus) => {
  const l = pick(landmarkPool(focus).filter((x) => !x.shared), rnd);
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

const genMonument: Gen = (_data, rnd, focus) => {
  const l = pick(landmarkPool(focus), rnd);
  const others = shuffle(LANDMARKS.filter((x) => x.id !== l.id && x.kind === l.kind), rnd);
  const pool = [...others, ...shuffle(LANDMARKS.filter((x) => x.id !== l.id && x.kind !== l.kind), rnd)].slice(0, 8).map(lmName);
  const { options, answer } = optionsFor(lmName(l), pool, rnd);
  return { id: `mon-${l.id}`, kind: 'monument', category: 'landmarks', difficulty: 2,
    prompt: tc('gen.mon.q', 'Recognise this landmark!'), clue: lmClue(l), imageTitle: l.wiki, options, answer,
    explanation: tc('gen.mon.e', '{emoji} {landmark} — {city}. {fact}', { emoji: l.emoji, landmark: lmName(l), city: lmCity(l), fact: lmFact(l) }),
    source: W(decodeURIComponent(l.wiki)), countries: [l.iso3, ...(l.shared ?? [])] };
};

const genChronology: Gen = (_data, rnd, focus) => {
  const local = focus ? EVENTS.filter((e) => e.tags?.includes(focus.iso3)) : [];
  const pool = shuffle(EVENTS, rnd);
  const set = [...shuffle(local, rnd).slice(0, 2)];
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

const genCurated: Gen = (_d, rnd, focus) => {
  const pool = curatedFor(focus);
  return pool.length ? { ...pick(pool, rnd) } : null;
};

export const GENERATORS: Record<string, Gen> = {
  curated: genCurated, capital: genCapital, capitalReverse: genCapitalReverse, flag: genFlag, border: genBorderTF,
  landlocked: genLandlocked, area: genArea, region: genRegion, mapfind: genMapFind, currency: genCurrency,
  landmarkCountry: genLandmarkCountry, monument: genMonument, chronology: genChronology,
};

const DEFAULT_WEIGHTS: Record<keyof typeof GENERATORS, number> = {
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
}

export function buildSession(data: GameData, o: SessionOptions): Question[] {
  const weights = Object.entries(o.weights ?? DEFAULT_WEIGHTS) as [string, number][];
  let focusCountries = (o.focus ?? []).map((i) => data.byIso3.get(i)).filter((c): c is Country => !!c);
  if (o.region) focusCountries = data.countries.filter((c) => c.region === o.region && c.un);
  const out: Question[] = [];
  const seen = new Set<string>(o.exclude ?? []);
  let guard = 0;
  while (out.length < o.count && guard++ < o.count * 40) {
    const gen = GENERATORS[weightedPick(weights, o.rnd)];
    const useFocus = focusCountries.length > 0 && o.rnd() < (o.region ? 1 : o.focusRate ?? 0.75);
    const focus = useFocus ? pick(focusCountries, o.rnd) : undefined;
    const q = gen(data, o.rnd, focus);
    if (!q || seen.has(q.id)) continue;
    if (o.region && q.countries && !q.countries.some((iso) => data.byIso3.get(iso)?.region === o.region)) continue;
    if (o.maxDifficulty && q.difficulty > o.maxDifficulty) continue;
    seen.add(q.id);
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
