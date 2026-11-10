import type { Country, Question, Stop } from '../types';
import type { Landmark } from '../content/landmarks';
import type { HistoricEvent } from '../content/events';
import type { CuratedJourney } from '../content/journeys';
import type { LegendPack, LegendQuestion } from '../content/legendary';
import { CURATED } from '../content/questions';
import { KNOWLEDGE } from '../content/knowledge';
import { currencyName, languageName, locale, regionName, tc } from './index';

/**
 * Localised accessors for game content. English lives in the TypeScript content files (source of
 * truth); translations live in the locale catalogs under stable keys. Anything missing falls back
 * to English, so a partially translated catalog never breaks the game.
 */
import { slug } from './slug';
export { slug };

// ---------------------------------------------------------------- countries (CLDR + catalog)
export const countryName = (c: Pick<Country, 'iso2' | 'name'>) => regionName(c.iso2, c.name);
export const capitalName = (c: Country, i = 0) => tc(`cap.${c.iso3}.${i}`, c.capitals[i] ?? c.capital);
export const capitalsList = (c: Country) => c.capitals.map((_, i) => capitalName(c, i));
export const regionLabel = (r: string) => tc(`region.${slug(r)}`, r);
export const subregionLabel = (s: string) => tc(`subregion.${slug(s)}`, s);
export const currencyLabel = (c: Country, i = 0) => currencyName(c.currencyCodes?.[i], c.currencies[i] ?? '');
export const languagesLabel = (c: Country) => c.languages.map((n, i) => languageName(c.languageCodes?.[i], n));

// ---------------------------------------------------------------- landmarks & events
export const lmName = (l: Landmark) => tc(`lm.${l.id}.name`, l.name);
export const lmCity = (l: Landmark) => tc(`lm.${l.id}.city`, l.city);
export const lmFact = (l: Landmark) => tc(`lm.${l.id}.fact`, l.fact);
export const lmClue = (l: Landmark) => tc(`lm.${l.id}.clue`, l.clue);
export const eventKey = (e: HistoricEvent) => `ev.${slug(e.wiki)}`;
export const eventLabel = (e: HistoricEvent) => tc(eventKey(e), e.label);

/** Year label (negative = BC) in the current language. */
export function formatYearL(y: number): string {
  return y < 0 ? tc('year.bc', '{year} BC', { year: String(-y) }) : String(y);
}

// ---------------------------------------------------------------- journeys
export const journeyTitle = (j: Pick<CuratedJourney, 'id' | 'title'>) => tc(`jr.${j.id}.title`, j.title);
export const journeyBlurb = (j: CuratedJourney) => tc(`jr.${j.id}.blurb`, j.blurb);
/** Stop names are keyed by their English slug (stable when stops are added or reordered). */
export const journeyStop = (journeyId: string, _i: number, s: Pick<Stop, 'name'>) => tc(`jr.${journeyId}.${slug(s.name)}`, s.name);
export const stopNote = (note: string) => tc(`stopnote.${slug(note)}`, note);

// ---------------------------------------------------------------- curated questions
const cache = new Map<string, Question[]>();
/** Curated question bank in the current language (memoised per locale). */
export function curatedQuestions(bank: 'curated' | 'knowledge' = 'curated'): Question[] {
  const lang = locale();
  const ck = `${bank}:${lang}`;
  let list = cache.get(ck);
  if (!list) {
    list = (bank === 'curated' ? CURATED : KNOWLEDGE).map((q) => ({
      ...q,
      prompt: tc(`q.${q.id}.q`, q.prompt),
      options: q.options?.map((o, i) => tc(`q.${q.id}.o${i}`, o)),
      explanation: tc(`q.${q.id}.e`, q.explanation),
    }));
    cache.set(ck, list);
  }
  return list;
}

// ---------------------------------------------------------------- legendary journeys
export const legendFact = (l: LegendPack, i: number) => tc(`legend.${l.journey}.f${i}`, l.facts[i].text);
export const legendQuestion = (l: LegendPack, q: LegendQuestion) => ({
  prompt: tc(`legend.${l.journey}.${q.id}.q`, q.q),
  options: q.o.map((o, i) => tc(`legend.${l.journey}.${q.id}.o${i}`, o)),
  explanation: tc(`legend.${l.journey}.${q.id}.e`, q.e),
});

// ---------------------------------------------------------------- cities (GeoNames names per language)
const CITY_LANG_INDEX: Record<string, number> = { en: 0, fr: 1, es: 2, de: 3, it: 4, pt: 5, ru: 6, he: 7, ar: 8, zh: 9 };
/** A city's name in the current language (GeoNames), or its default name. */
export const cityName = (c: { name: string; names?: string[] }) => c.names?.[CITY_LANG_INDEX[locale()] ?? -1] || c.name;
/** Every known name of a city, for search in any language. */
export const cityAllNames = (c: { name: string; names?: string[] }) => [c.name, ...(c.names ?? []).filter(Boolean)];
