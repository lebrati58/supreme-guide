import type { Question } from '../types';
import { buildSession, type GameData } from '../game/engine';
import { hashString, mulberry32 } from '../game/rng';

/** Question types that work in a live race: one tap among options, nothing device-dependent. */
const LIVE_WEIGHTS = {
  curated: 3, knowledge: 2, capital: 1.5, capitalReverse: 1, currency: 1, area: 1, region: 0.5,
  landlocked: 0.5, monument: 1, landmarkCountry: 1, math: 0.7,
};

/**
 * The same quiz on every phone from the same seed (each in its own language). Flags are left out
 * (emoji flags render differently across devices), like in friend challenges.
 */
export function liveQuestions(game: GameData, seed: string, count: number): Question[] {
  const det = { ...game, flagsOk: false };
  return buildSession(det, { count, rnd: mulberry32(hashString(`live-${seed}`)), weights: LIVE_WEIGHTS, surpriseRate: 0 })
    .filter((q) => q.options && q.answer !== undefined);
}
