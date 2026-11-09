import { beforeAll, describe, expect, it } from 'vitest';
import { loadCountries, loadWorld110 } from '../../src/data/loaders';
import { buildGeneral, makeGameData, validateQuestion, GENERATORS, type GameData } from '../../src/game/engine';
import { mulberry32 } from '../../src/game/rng';
import { KNOWLEDGE, DOMAIN_CATEGORIES, type Domain } from '../../src/content/knowledge';

let data: GameData;
beforeAll(async () => {
  const [c, w] = await Promise.all([loadCountries(), loadWorld110()]);
  data = makeGameData(c, true, new Set(w.features.map((f) => f.properties.num)));
});

describe('knowledge domains', () => {
  it('banks are well-formed', () => {
    expect(new Set(KNOWLEDGE.map((q) => q.id)).size).toBe(KNOWLEDGE.length);
    for (const q of KNOWLEDGE) {
      expect(validateQuestion(q), q.id).toEqual([]);
      expect(new Set(q.options).size, q.id).toBe(4);
    }
  });

  it.each(['history', 'geography', 'biology', 'science', 'math', 'philosophy', 'culture'] as Domain[])('%s: sessions stay in the chosen domain', (d) => {
    const cats = new Set(DOMAIN_CATEGORIES[d]);
    for (let seed = 1; seed <= 8; seed++) {
      const qs = buildGeneral(data, { count: 8, rnd: mulberry32(seed), domains: [d] });
      expect(qs.length).toBe(8);
      for (const q of qs) {
        expect(validateQuestion(q)).toEqual([]);
        // geography & culture also use world generators (capitals, flags, monuments)
        if (!['geography', 'culture', 'history'].includes(d)) expect(cats.has(q.category), `${d}: ${q.category} ${q.prompt}`).toBe(true);
      }
    }
  });

  it('math answers are computed correctly', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const q = GENERATORS.math(data, mulberry32(seed))!;
      expect(validateQuestion(q)).toEqual([]);
      expect(new Set(q.options).size).toBe(4);
      const n = (s: string) => Number(s.replace(/[^\d.]/g, ''));
      const m = q.prompt.match(/[\d,]+/g)!.map((x) => Number(x.replace(/,/g, '')));
      const right = n(q.options![q.answer!]);
      if (/× /.test(q.prompt)) expect(right).toBe(m[0] * m[1]);
      else if (/%/.test(q.prompt)) expect(right).toBe((m[0] * m[1]) / 100);
      else if (/average speed/.test(q.prompt)) expect(right).toBe(m[0] / m[1]);
      else expect(right).toBe(m[0] / m[1]);
    }
  });
});
