import type { Country, Difficulty, Question, QuestionKind, Region } from '../types';
import { CURATED } from '../content/questions';
import { LANDMARKS } from '../content/landmarks';
import { EVENTS, formatYear } from '../content/events';
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
export type Gen = (data: GameData, rnd: Rng, focus?: Country) => Question | null;

const genCapital: Gen = (data, rnd, focus) => {
  const ok = (x: Country) => eligible(x) && !!x.capital && !CAPITAL_EXCLUDE.has(x.iso3);
  const c = focus && ok(focus) ? focus : pick(data.countries.filter(ok), rnd);
  const pool = neighbours(data, c, rnd, ok).slice(0, 12).map((x) => x.capital);
  const { options, answer } = optionsFor(c.capital, pool, rnd);
  const multi = c.capitals.length > 1 ? ` ${c.name} has more than one capital: ${c.capitals.join(', ')}.` : '';
  return { id: `cap-${c.iso3}`, kind: 'capital', category: 'capitals', difficulty: difficultyOf(c),
    prompt: `What is the capital of ${c.name}?`, options, answer,
    explanation: `${c.capital} is the capital of ${c.name}.${multi}`, source: W(c.capital), countries: [c.iso3] };
};

const genCapitalReverse: Gen = (data, rnd, focus) => {
  const ok = (x: Country) => eligible(x) && !!x.capital && !CAPITAL_EXCLUDE.has(x.iso3);
  const c = focus && ok(focus) ? focus : pick(data.countries.filter(ok), rnd);
  const pool = neighbours(data, c, rnd, ok).slice(0, 12).map((x) => x.name);
  const { options, answer } = optionsFor(c.name, pool, rnd);
  return { id: `capr-${c.iso3}`, kind: 'capital', category: 'capitals', difficulty: Math.min(3, difficultyOf(c) + 1) as Difficulty,
    prompt: `${c.capital} is the capital of which country?`, options, answer,
    explanation: `${c.capital} is the capital of ${c.name} (${c.subregion}).`, source: W(c.capital), countries: [c.iso3] };
};

const genFlag: Gen = (data, rnd, focus) => {
  if (!data.flagsOk) return null;
  const ok = (x: Country) => eligible(x) && !!x.flag;
  const c = focus && ok(focus) ? focus : pick(data.countries.filter(ok), rnd);
  const pool = neighbours(data, c, rnd, ok).slice(0, 10).map((x) => x.name);
  const { options, answer } = optionsFor(c.name, pool, rnd);
  return { id: `flag-${c.iso3}`, kind: 'observation', category: 'flags', difficulty: difficultyOf(c),
    prompt: `Look closely! Which country does this flag belong to?  ${c.flag}`, options, answer,
    explanation: `${c.flag} is the flag of ${c.name}.`, source: W(`Flag of ${c.name}`), countries: [c.iso3] };
};

const genBorderTF: Gen = (data, rnd, focus) => {
  const ok = (x: Country) => eligible(x) && x.borders.length > 0 && !CONTESTED.has(x.iso3);
  const c = focus && ok(focus) ? focus : pick(data.countries.filter(ok), rnd);
  const truth = rnd() < 0.5;
  let other: Country | undefined;
  if (truth) other = data.byIso3.get(pick(c.borders, rnd));
  else other = neighbours(data, c, rnd, (x) => eligible(x) && !c.borders.includes(x.iso3) && !CONTESTED.has(x.iso3))[0];
  if (!other || CONTESTED.has(other.iso3)) return null;
  const names = c.borders.map((b) => data.byIso3.get(b)?.name).filter(Boolean).join(', ');
  return { id: `bord-${c.iso3}-${other.iso3}`, kind: 'truefalse', category: 'geography', difficulty: 2,
    prompt: `True or false: ${c.name} shares a land border with ${other.name}.`, options: ['True', 'False'], answer: truth ? 0 : 1,
    explanation: `${truth ? 'True' : 'False'}. ${c.name} has land borders with: ${names}.`, source: DATA_SRC, countries: [c.iso3, other.iso3] };
};

const genLandlocked: Gen = (data, rnd, focus) => {
  const ok = (x: Country) => eligible(x) && x.area > 20000;
  const c = focus && ok(focus) ? focus : pick(data.countries.filter(ok), rnd);
  return { id: `land-${c.iso3}`, kind: 'truefalse', category: 'geography', difficulty: 2,
    prompt: `True or false: ${c.name} is landlocked (it has no coastline on the open sea).`, options: ['True', 'False'], answer: c.landlocked ? 0 : 1,
    explanation: c.landlocked ? `True — ${c.name} is landlocked.` : `False — ${c.name} has a coastline.`, source: DATA_SRC, countries: [c.iso3] };
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
  const options = shuffle(set.map((x) => x.name), rnd);
  const fmt = (n: number) => n.toLocaleString('en-US');
  return { id: `area-${set.map((x) => x.iso3).sort().join('')}`, kind: 'observation', category: 'geography', difficulty: 2,
    prompt: 'Which of these countries is the LARGEST by area?', options, answer: options.indexOf(largest.name),
    explanation: set.sort((a, b) => b.area - a.area).map((x) => `${x.name}: ${fmt(x.area)} km²`).join(' · '), source: DATA_SRC, countries: set.map((x) => x.iso3) };
};

const genRegion: Gen = (data, rnd, focus) => {
  const ok = (x: Country) => eligible(x) && !!x.subregion;
  const c = focus && ok(focus) ? focus : pick(data.countries.filter(ok), rnd);
  const subs = [...new Set(data.countries.map((x) => x.subregion).filter(Boolean))];
  const { options, answer } = optionsFor(c.subregion, subs, rnd);
  return { id: `reg-${c.iso3}`, kind: 'mcq', category: 'geography', difficulty: 2,
    prompt: `In which world region (UN geoscheme) is ${c.name}?`, options, answer,
    explanation: `${c.name} is in ${c.subregion} (${c.region}).`, source: { label: 'UN M49 geoscheme', url: 'https://unstats.un.org/unsd/methodology/m49/' }, countries: [c.iso3] };
};

const genMapFind: Gen = (data, rnd, focus) => {
  const ok = (x: Country) => eligible(x) && x.area > 25000 && (!data.mapNums || data.mapNums.has(x.num)) && !CAPITAL_EXCLUDE.has(x.iso3);
  const c = focus && ok(focus) ? focus : pick(data.countries.filter(ok), rnd);
  if (!ok(c)) return null;
  return { id: `map-${c.iso3}`, kind: 'mapfind', category: 'geography', difficulty: difficultyOf(c),
    prompt: `Tap ${c.name} on the map!`, targetNum: c.num, targetName: c.name,
    explanation: `${c.name} is in ${c.subregion}. Its neighbours include ${c.borders.slice(0, 4).map((b) => data.byIso3.get(b)?.name).filter(Boolean).join(', ') || 'only the sea'}.`,
    source: { label: 'Natural Earth (public domain)', url: 'https://www.naturalearthdata.com/' }, countries: [c.iso3] };
};

const genCurrency: Gen = (data, rnd, focus) => {
  const ok = (x: Country) => eligible(x) && x.currencies.length === 1;
  const c = focus && ok(focus) ? focus : pick(data.countries.filter(ok), rnd);
  if (!ok(c)) return null;
  const pool = neighbours(data, c, rnd, ok).slice(0, 14).map((x) => x.currencies[0]);
  const { options, answer } = optionsFor(c.currencies[0], pool, rnd);
  if (new Set(options).size < 4) return null;
  return { id: `cur-${c.iso3}`, kind: 'mcq', category: 'culture', difficulty: 2,
    prompt: `Travel tip! Which currency do you need in ${c.name}?`, options, answer,
    explanation: `The official currency of ${c.name} is the ${c.currencies[0]}.`, source: DATA_SRC, countries: [c.iso3] };
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
  const pool = neighbours(data, c, rnd, eligible).slice(0, 10).map((x) => x.name);
  const { options, answer } = optionsFor(c.name, pool, rnd);
  return { id: `lmc-${l.id}`, kind: 'monument', category: 'landmarks', difficulty: 1,
    prompt: `${l.emoji} In which country can you visit ${l.name}?`, options, answer,
    explanation: `${l.name} is in ${l.city}, ${c.name}. ${l.fact}`, source: W(decodeURIComponent(l.wiki)), countries: [l.iso3], imageTitle: l.wiki };
};

const genMonument: Gen = (_data, rnd, focus) => {
  const l = pick(landmarkPool(focus), rnd);
  const others = shuffle(LANDMARKS.filter((x) => x.id !== l.id && x.kind === l.kind), rnd);
  const pool = [...others, ...shuffle(LANDMARKS.filter((x) => x.id !== l.id && x.kind !== l.kind), rnd)].slice(0, 8).map((x) => x.name);
  const { options, answer } = optionsFor(l.name, pool, rnd);
  return { id: `mon-${l.id}`, kind: 'monument', category: 'landmarks', difficulty: 2,
    prompt: 'Recognise this landmark!', clue: l.clue, imageTitle: l.wiki, options, answer,
    explanation: `${l.emoji} ${l.name} — ${l.city}. ${l.fact}`, source: W(decodeURIComponent(l.wiki)), countries: [l.iso3, ...(l.shared ?? [])] };
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
    prompt: 'Put these events in order — oldest first!', order: order.map((e) => ({ label: e.label, year: e.year })),
    explanation: order.map((e) => `${formatYear(e.year)}: ${e.label}`).join(' · '), source: W(order[0].wiki),
    countries: [...new Set(order.flatMap((e) => e.tags ?? []))] };
};

const curatedFor = (focus?: Country) => (focus ? CURATED.filter((q) => q.countries?.includes(focus.iso3)) : CURATED);

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

export const KIND_LABEL: Record<QuestionKind, string> = {
  mcq: 'Quiz', truefalse: 'True or false', mapfind: 'Find it on the map', monument: 'Landmark', chronology: 'Timeline',
  capital: 'Capitals', blitz: 'Blitz', history: 'History', observation: 'Sharp eyes', surprise: 'Surprise!',
};
