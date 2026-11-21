import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCountries } from '../../src/data/loaders';
import { makeGameData, type GameData } from '../../src/game/engine';
import { buildKidQuiz } from '../../src/game/kids';
import { mulberry32 } from '../../src/game/rng';
import { KID_ANIMAL_FACTS, KID_ANIMALS, STICKERS } from '../../src/content/kids';
import { mergeProfile, parseBackup } from '../../src/storage/backup';
import { newProfile } from '../../src/game/progression';

const photos = JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'data', 'landmark-photos.json'), 'utf8'));
let data: GameData;
beforeAll(async () => { data = makeGameData(await loadCountries(), true); });

describe('little travellers', () => {
  it('animal facts: known animals and countries, the right animal never among the wrong ones', () => {
    const ids = new Set(KID_ANIMALS.map((a) => a.id));
    for (const [iso, right, wrong] of KID_ANIMAL_FACTS) {
      expect(data.byIso3.has(iso), iso).toBe(true);
      expect(ids.has(right), right).toBe(true);
      for (const w of wrong) { expect(ids.has(w), w).toBe(true); expect(w).not.toBe(right); }
    }
    // A distractor must never be an animal said to live in that same country by another fact.
    for (const [iso, , wrong] of KID_ANIMAL_FACTS) {
      const lives = KID_ANIMAL_FACTS.filter(([i]) => i === iso).map(([, a]) => a);
      for (const w of wrong) expect(lives.includes(w), `${iso} ${w}`).toBe(false);
    }
  });

  it('builds picture questions with one right answer, a source, and no duplicates', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const qs = buildKidQuiz(data, photos, { count: 6, rnd: mulberry32(seed) });
      expect(qs.length).toBe(6);
      expect(new Set(qs.map((q) => q.id)).size).toBe(6);
      for (const q of qs) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.options.every((o) => o.label && (o.emoji || o.img))).toBe(true);
        expect(new Set(q.options.map((o) => o.label)).size).toBe(q.options.length);
        expect(q.source.url).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
        if (q.kind === 'sea') {
          const c = data.byIso3.get(q.countries[0])!;
          expect(q.options[q.answer].emoji).toBe(c.landlocked ? '⛰️' : '🏖️');
          expect(['KAZ', 'TKM', 'AZE']).not.toContain(c.iso3);
        }
        if (q.kind === 'landmark') expect(q.options.every((o) => o.img?.includes('photos/landmarks/'))).toBe(true);
      }
    }
  });

  it('no flag questions when the device cannot show flag emoji', () => {
    const noFlags = { ...data, flagsOk: false };
    const qs = Array.from({ length: 20 }, (_, s) => buildKidQuiz(noFlags, photos, { count: 6, rnd: mulberry32(s + 100) })).flat();
    expect(qs.some((q) => q.kind === 'flag')).toBe(false);
  });

  it('on a trip, questions are mostly about the trip countries', () => {
    const qs = Array.from({ length: 20 }, (_, s) => buildKidQuiz(data, photos, { count: 5, rnd: mulberry32(s + 7), focus: ['AUS'] })).flat();
    const local = qs.filter((q) => q.countries.includes('AUS')).length;
    expect(local / qs.length).toBeGreaterThan(0.5);
  });

  it('stickers survive a backup and are merged', () => {
    const a = newProfile('A'); a.stickers = [STICKERS[0], STICKERS[1]];
    const b = { ...a, stickers: [STICKERS[1], STICKERS[2], 'not-a-sticker'] };
    const parsed = parseBackup(JSON.stringify({ app: 'supreme-guide', kind: 'backup', version: 1, exportedAt: Date.now(), profiles: [b], trips: [] }));
    expect(typeof parsed).toBe('object');
    const back = typeof parsed === 'object' ? parsed.profiles[0] : null;
    expect(back?.stickers).toEqual([STICKERS[1], STICKERS[2]]);
    expect(mergeProfile(a, back!).stickers?.sort()).toEqual([STICKERS[0], STICKERS[1], STICKERS[2]].sort());
  });
});
