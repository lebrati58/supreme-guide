import { describe, expect, it } from 'vitest';
import { Hotseat } from '../../src/live/hotseat';
import type { ToGuest } from '../../src/live/logic';

const P = [{ id: 'a', name: 'Ana', avatar: '🦊' }, { id: 'b', name: 'Ben', avatar: '🐼' }, { id: 'c', name: 'Cy', avatar: '🐯' }];

function setup(mode: 'classic' | 'elimination' | 'teams' = 'classic', n = 3) {
  const s = new Hotseat(P.map((p, k) => ({ ...p, team: (k % 2) as 0 | 1 })), mode);
  const log: ToGuest[] = [];
  s.on((m) => log.push(m));
  s.start(Array.from({ length: n }, (_, k) => `q${k}`), Array.from({ length: n }, () => 1));
  return { s, log };
}

describe('duel on one phone', () => {
  it('every player answers in turn; the answer is revealed only after the last one', () => {
    const { s, log } = setup();
    expect(s.queue().map((p) => p.id)).toEqual(['a', 'b', 'c']);
    s.answer('a', 1, 2000);
    expect(log.some((m) => m.t === 'reveal')).toBe(false);
    expect(s.queue().map((p) => p.id)).toEqual(['b', 'c']);
    s.answer('b', 0, 1000);
    s.answer('c', -1, 20000); // time is up
    const r = log.filter((m) => m.t === 'reveal');
    expect(r.length).toBe(1);
    const ps = (r[0] as Extract<ToGuest, { t: 'reveal' }>).players;
    expect(ps.find((p) => p.id === 'a')!.score).toBeGreaterThan(500);
    expect(ps.find((p) => p.id === 'b')!.score).toBe(0);
    expect(ps.find((p) => p.id === 'c')!.score).toBe(0);
    expect(s.queue()).toEqual([]);
  });

  it('a player cannot answer twice', () => {
    const { s } = setup();
    s.answer('a', 1, 1000);
    s.answer('a', 1, 500);
    expect(s.game.answers.size).toBe(1);
  });

  it('the first player rotates with each question', () => {
    const { s } = setup();
    for (const id of ['a', 'b', 'c']) s.answer(id, 1, 1000);
    s.next();
    expect(s.queue().map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });

  it('elimination: whoever misses is out and no longer has a turn; the game ends with one left', () => {
    const { s, log } = setup('elimination', 5);
    s.answer('a', 1, 1000); s.answer('b', 0, 1000); s.answer('c', 1, 1000);
    s.next();
    expect(s.queue().map((p) => p.id).sort()).toEqual(['a', 'c']);
    s.answer('c', 0, 1000); s.answer('a', 1, 1000);
    s.next();
    expect(log.at(-1)!.t).toBe('end');
  });

  it('a slow answer is capped at the time limit', () => {
    const { s } = setup();
    s.answer('a', 1, 999_999);
    expect(s.game.answers.get('a')!.ms).toBe(20_000);
  });
});
