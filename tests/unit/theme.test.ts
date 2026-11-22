import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isNight, isNightHour } from '../../src/game/theme';

describe('night mode', () => {
  it('auto: phone dark mode, or 21:00–06:59', () => {
    expect([20, 21, 23, 0, 3, 6, 7, 12].map(isNightHour)).toEqual([false, true, true, true, true, true, false, false]);
    expect(isNight(undefined, false, 12)).toBe(false);
    expect(isNight('auto', true, 12)).toBe(true);
    expect(isNight('auto', false, 22)).toBe(true);
  });
  it('a manual choice wins', () => {
    expect(isNight('day', true, 23)).toBe(false);
    expect(isNight('night', false, 12)).toBe(true);
  });

  // WCAG contrast of the night palette: text on cards and on the sky must stay readable (≥ 4.5:1).
  const css = readFileSync(join(__dirname, '..', '..', 'src', 'styles', 'app.css'), 'utf8');
  const night = css.slice(css.indexOf(':root[data-theme="night"] {'));
  const v = (name: string) => night.match(new RegExp(`--${name}: (#[0-9a-f]{6});`))![1];
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  it.each([
    ['ink', 'paper'], ['ink', 'paper-2'], ['ink-2', 'paper'], ['ink', 'ok-bg'], ['ink', 'ko-bg'], ['ink', 'hover-bg'],
    ['text', 'sky-0'], ['text-dim', 'sky-0'], ['ink', 'gold-card-2'], ['notice-ink', 'notice-bg'], ['sky-2', 'paper'],
  ])('contrast %s on %s ≥ 4.5', (fg, bg) => {
    expect(ratio(v(fg), v(bg))).toBeGreaterThanOrEqual(4.5);
  });
});
