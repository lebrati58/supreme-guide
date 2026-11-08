import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { LOCALES, setLocale, t, tn, locale, detectLocale } from '../../src/i18n';
import { loadCountries, loadWorld110 } from '../../src/data/loaders';
import { buildSession, GENERATORS, makeGameData, validateQuestion, type GameData } from '../../src/game/engine';
import { mulberry32 } from '../../src/game/rng';
import { capitalName, countryName, curatedQuestions } from '../../src/i18n/content';
import { say } from '../../src/game/mascot';

let data: GameData;
const available = LOCALES.filter((l) => existsSync(resolve(__dirname, `../../src/i18n/locales/${l.code}.json`)));

beforeAll(async () => {
  const [c, w] = await Promise.all([loadCountries(), loadWorld110()]);
  data = makeGameData(c, true, new Set(w.features.map((f) => f.properties.num)));
});
afterAll(() => setLocale('en'));

describe('i18n core', () => {
  it('ships 10 languages, two of them right-to-left', () => {
    expect(LOCALES.map((l) => l.code).sort()).toEqual(['ar', 'de', 'en', 'es', 'fr', 'he', 'it', 'pt', 'ru', 'zh']);
    expect(LOCALES.filter((l) => l.dir === 'rtl').map((l) => l.code).sort()).toEqual(['ar', 'he']);
  });
  it('interpolates and pluralises', async () => {
    await setLocale('en');
    expect(t('plan.stopN', { n: 2 })).toBe('Stop 2');
    expect(tn('trips.countries', 1)).toBe('1 country');
    expect(tn('trips.countries', 3)).toBe('3 countries');
  });
  it('detects the browser language', () => {
    Object.defineProperty(navigator, 'languages', { value: ['pt-BR', 'en'], configurable: true });
    expect(detectLocale()).toBe('pt');
    Object.defineProperty(navigator, 'languages', { value: ['iw-IL'], configurable: true });
    expect(detectLocale()).toBe('he');
    Object.defineProperty(navigator, 'languages', { value: ['ja-JP'], configurable: true });
    expect(detectLocale()).toBe('en');
  });
});

describe.each(available.map((l) => [l.code, l.dir] as const))('locale %s', (code, dir) => {
  beforeAll(() => setLocale(code));

  it('applies language and direction to the document', () => {
    expect(locale()).toBe(code);
    expect(document.documentElement.dir).toBe(dir);
  });

  it('names countries from CLDR and translates capitals', () => {
    // "Germany" is spelled differently in all 10 languages (Deutschland, Allemagne, Германия…).
    const de = data.byIso3.get('DEU')!;
    expect(countryName(de)).toBeTruthy();
    if (code !== 'en') expect(countryName(de)).not.toBe('Germany');
    expect(capitalName(de)).toBeTruthy();
  });

  it('generates valid, fully-interpolated questions', () => {
    const rnd = mulberry32(2026);
    for (const gen of Object.values(GENERATORS)) {
      for (let i = 0; i < 60; i++) {
        const q = gen(data, rnd);
        if (!q) continue;
        expect(validateQuestion(q), `${code}: ${q.id} ${q.prompt}`).toEqual([]);
        expect(q.prompt + q.explanation + (q.options ?? []).join('|'), `${code}: ${q.id}`).not.toMatch(/\{\w+\}/);
      }
    }
    const qs = buildSession(data, { count: 12, rnd: mulberry32(7), focus: ['FRA'] });
    expect(qs).toHaveLength(12);
  });

  it('translates curated questions without breaking options', () => {
    for (const q of curatedQuestions()) expect(validateQuestion(q), `${code}: ${q.id}`).toEqual([]);
  });

  it('has mascot lines in this language', () => {
    expect(say('welcome').length).toBeGreaterThan(5);
  });
});
