import { tc } from '../i18n';
/**
 * The Supreme Guide: slightly pompous, always kind. Lines are drawn from shuffle-bags so the
 * same line never repeats until the whole pool has been used.
 */
import { MASCOT_LINES as LINES, type Mood } from '../content/mascotLines';
export type { Mood };

const bags = new Map<Mood, number[]>();

/** Next line for a mood, in the current language. Indexes are shuffled so a line never repeats until all were used. */
export function say(mood: Mood): string {
  let bag = bags.get(mood);
  if (!bag || bag.length === 0) {
    bag = LINES[mood].map((_, i) => i).sort(() => Math.random() - 0.5);
    bags.set(mood, bag);
  }
  const i = bag.pop()!;
  return tc(`mascot.${mood}.${i}`, LINES[mood][i]);
}

export const allLines = () => LINES;
