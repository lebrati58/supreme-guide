import { describe, expect, it } from 'vitest';
import { aiConfigured, validAi } from '../../src/transport/aiGuide';

const src = ['https://en.wikipedia.org/wiki/Lyon'];
const good = { prompt: 'Which two rivers meet in Lyon?', options: ['Rhône and Saône', 'Seine and Marne', 'Loire and Cher', 'Garonne and Tarn'], answer: 0, explanation: 'Lyon lies where the Rhône and Saône meet.', source: src[0] };

describe('optional AI questions', () => {
  it('is off unless configured', () => expect(aiConfigured()).toBe(false));
  it('accepts a well-formed, sourced question', () => expect(validAi(good, src)).toBe(true));
  it('rejects unsourced or malformed questions', () => {
    expect(validAi({ ...good, source: 'https://example.com' }, src)).toBe(false);
    expect(validAi({ ...good, answer: 4 }, src)).toBe(false);
    expect(validAi({ ...good, options: ['a', 'a', 'b', 'c'] }, src)).toBe(false);
    expect(validAi({ ...good, options: ['a', 'b', 'c'] }, src)).toBe(false);
    expect(validAi(null, src)).toBe(false);
  });
});
