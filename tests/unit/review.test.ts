import { describe, expect, it } from 'vitest';
import { MAX_MISTAKES, newProfile, trackMistake } from '../../src/game/progression';
import type { Question } from '../../src/types';

const q = (id: string): Question => ({ id, kind: 'mcq', category: 'geography', difficulty: 1, prompt: id, options: ['a', 'b'], answer: 0, explanation: '', timeLimit: 10, bonus: true });

describe('review my mistakes', () => {
  it('keeps wrong answers (without timer/bonus), drops them once right, caps the list', () => {
    const p = newProfile('t');
    trackMistake(p, q('x'), false);
    expect(p.mistakes!.map((m) => m.id)).toEqual(['x']);
    expect(p.mistakes![0].timeLimit).toBeUndefined();
    expect(p.mistakes![0].bonus).toBeUndefined();
    trackMistake(p, q('x'), false);
    expect(p.mistakes).toHaveLength(1);
    trackMistake(p, q('x'), true);
    expect(p.mistakes).toHaveLength(0);
    for (let k = 0; k < MAX_MISTAKES + 5; k++) trackMistake(p, q(`k${k}`), false);
    expect(p.mistakes).toHaveLength(MAX_MISTAKES);
    expect(p.mistakes!.at(-1)!.id).toBe(`k${MAX_MISTAKES + 4}`);
  });
  it('ignores question types that cannot be replayed (no options)', () => {
    const p = newProfile('t');
    trackMistake(p, { ...q('c'), kind: 'chronology', options: undefined, answer: undefined }, false);
    expect(p.mistakes).toHaveLength(0);
  });
});
