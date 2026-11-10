import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadCountries, loadWorld110 } from '../../src/data/loaders';
import { makeGameData, type GameData } from '../../src/game/engine';
import { liveQuestions } from '../../src/live/questions';
import { LOCALES, setLocale } from '../../src/i18n';

let data: GameData;
beforeAll(async () => {
  const [c, w] = await Promise.all([loadCountries(), loadWorld110()]);
  data = makeGameData(c, true, new Set(w.features.map((f) => f.properties.num)));
});
afterAll(() => setLocale('en'));

describe('live: identical quiz in every language, for many seeds', () => {
  it('ids and right answers match across all 10 languages', async () => {
    const seeds = Array.from({ length: 60 }, (_, k) => `seed-${k}`);
    const ref = new Map<string, string>();
    for (const l of LOCALES) {
      await setLocale(l.code);
      for (const s of seeds) {
        const sig = liveQuestions(data, s, 12).map((q) => `${q.id}:${q.answer}`).join('|');
        if (!ref.has(s)) ref.set(s, sig);
        else expect(sig, `${l.code} / ${s}`).toBe(ref.get(s));
      }
    }
  }, 120000);
});
