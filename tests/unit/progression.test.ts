import { describe, expect, it } from 'vitest';
import { awardBadges, badgeDefs, levelFromXp, newProfile, recordDaily, xpForAnswer } from '../../src/game/progression';
import { say } from '../../src/game/mascot';
import { store } from '../../src/storage/db';
import type { Question } from '../../src/types';

const q = (d: 1 | 2 | 3, bonus = false): Question => ({ id: 'x', kind: 'mcq', category: 'geography', difficulty: d, prompt: '?', options: ['a', 'b'], answer: 0, explanation: '', bonus });

describe('progression', () => {
  it('levels grow with XP', () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(100 + 160).level).toBe(3);
    expect(levelFromXp(1e6).title).toBe('Supreme Guide');
  });
  it('XP rewards difficulty, streaks, speed and surprises', () => {
    expect(xpForAnswer(q(1), false, 0)).toBe(2);
    expect(xpForAnswer(q(2), true, 1)).toBe(20);
    expect(xpForAnswer(q(2), true, 4)).toBe(26);
    expect(xpForAnswer(q(1), true, 1, 1)).toBe(20);
    expect(xpForAnswer(q(1, true), true, 1)).toBe(20);
  });
  it('awards badges once', () => {
    const p = newProfile('T');
    const defs = badgeDefs(() => 'Europe');
    p.stats.answered = 1;
    expect(awardBadges(p, defs).map((b) => b.id)).toContain('first-answer');
    expect(awardBadges(p, defs)).toEqual([]);
  });
  it('tracks the daily streak', () => {
    const p = newProfile('T');
    expect(recordDaily(p, '2026-11-01', 3, '2026-10-31')).toBe(1);
    expect(recordDaily(p, '2026-11-02', 4, '2026-11-01')).toBe(2);
    expect(recordDaily(p, '2026-11-02', 5, '2026-11-01')).toBe(2); // only once a day
    expect(recordDaily(p, '2026-11-05', 5, '2026-11-04')).toBe(1);
    expect(p.daily.best).toBe(2);
  });
  it('mascot does not repeat a line until the pool is used', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) seen.add(say('wrong'));
    expect(seen.size).toBe(6);
  });
  it('persists profiles in IndexedDB', async () => {
    const p = newProfile('Ada', '🦊', true);
    await store.putProfile(p);
    const all = await store.getProfiles();
    expect(all.find((x) => x.id === p.id)?.name).toBe('Ada');
    expect(store.isPersistent()).toBe(true);
  });
});
