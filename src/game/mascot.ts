import { tc } from '../i18n';
/**
 * The Supreme Guide: slightly pompous, always kind. Lines are drawn from shuffle-bags so the
 * same line never repeats until the whole pool has been used.
 */
import { MASCOT_LINES as LINES, type Mood } from '../content/mascotLines';
export type { Mood };

const bags = new Map<Mood, number[]>();

/** Index of the next line for a mood. Indexes are shuffled so a line never repeats until all were used. */
export function nextLine(mood: Mood): number {
  let bag = bags.get(mood);
  if (!bag || bag.length === 0) {
    bag = LINES[mood].map((_, i) => i).sort(() => Math.random() - 0.5);
    bags.set(mood, bag);
  }
  return bag.pop()!;
}

/** A mascot line in the CURRENT language (translate at render time, so a language switch updates it). */
export const lineText = (mood: Mood, i: number) => tc(`mascot.${mood}.${i}`, LINES[mood][i]);

/** Next line for a mood, in the current language. */
export const say = (mood: Mood): string => lineText(mood, nextLine(mood));

export const allLines = () => LINES;
