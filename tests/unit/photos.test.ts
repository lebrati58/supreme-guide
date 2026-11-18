import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { LANDMARKS } from '../../src/content/landmarks';

const ROOT = join(__dirname, '..', '..');
const photos: Record<string, { f: string; a: string; l: string; u: string; lu?: string }> =
  JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'landmark-photos.json'), 'utf8'));
const FREE = /^(public domain|cc0|cc by(-sa)? \d(\.\d)?( [a-z]{2})?|fal|kogl type 1)$/i;

describe('offline landmark photos', () => {
  it('cover most landmarks', () => {
    expect(Object.keys(photos).length).toBeGreaterThanOrEqual(65);
  });

  it('every photo is a small JPEG of a known landmark, under a clearly free licence, with its credit', () => {
    const ids = new Set(LANDMARKS.map((l) => l.id));
    let total = 0;
    for (const [id, p] of Object.entries(photos)) {
      expect(ids.has(id), id).toBe(true);
      expect(p.f).toBe(`photos/landmarks/${id}.jpg`);
      const file = join(ROOT, 'public', p.f);
      const head = readFileSync(file).subarray(0, 2);
      expect([head[0], head[1]], id).toEqual([0xff, 0xd8]);
      const size = statSync(file).size;
      expect(size, id).toBeLessThan(60_000);
      total += size;
      expect(p.l, id).toMatch(FREE);
      expect(p.l, id).not.toMatch(/\b(nc|nd)\b/i);
      expect(p.a.trim().length, id).toBeGreaterThan(1);
      expect(p.u, id).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      if (/^cc by/i.test(p.l)) expect(p.lu, id).toMatch(/^https?:\/\/creativecommons\.org\//);
    }
    expect(total).toBeLessThan(2_500_000); // stays light in the offline precache
  });
});
