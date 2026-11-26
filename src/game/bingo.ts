import type { Mode } from '../types';
import type { GameData } from './engine';
import type { RouteCtx } from './route';
import { featureName } from './nature';
import { shuffle, type Rng } from './rng';
import { SPOT_BY_MODE, SPOT_ITEMS } from '../content/bingo';
import { countryName, lmName } from '../i18n/content';
import { tc } from '../i18n';

/**
 * Road bingo — spot things through the window. A card is size×size cells; on a trip, up to `size − 1`
 * cells are about the actual route (a river crossed, a summit with its side, a border, a landmark —
 * the guide's sourced data) and unlock when you get close (`at`, position on the route 0..1).
 */
export interface BingoCell { id: string; emoji: string; label: string; at?: number; side?: 'left' | 'right' }

export const spotName = (id: string) => tc(`bingo.item.${id}`, SPOT_ITEMS.find((s) => s.id === id)?.name ?? id);

export function routeCells(route: RouteCtx, data: GameData): BingoCell[] {
  if (route.explore) return [];
  const out: BingoCell[] = [];
  for (const r of route.nature.rivers.slice(0, 2)) out.push({ id: `r-river-${r.name}`, emoji: '🏞️', label: featureName(r), at: r.at });
  for (const p of route.nature.peaks.filter((x) => x.side).slice(0, 2)) out.push({ id: `r-peak-${p.name}`, emoji: p.volcano ? '🌋' : '🏔️', label: featureName(p), at: p.at, side: p.side });
  for (const { l, at, side } of route.landmarks.slice(0, 2)) out.push({ id: `r-lm-${l.id}`, emoji: l.emoji, label: lmName(l), at, side });
  route.countries.slice(1, 3).forEach(({ iso3, at }) => {
    const c = data.byIso3.get(iso3);
    if (c) out.push({ id: `r-border-${iso3}`, emoji: c.flag || '🛂', label: tc('bingo.border', 'Border: {country}', { country: countryName(c) }), at });
  });
  return out;
}

export function buildCard(mode: Mode, size: 3 | 4, rnd: Rng, route?: BingoCell[]): BingoCell[] {
  const n = size * size;
  const fromRoute = shuffle(route ?? [], rnd).slice(0, size - 1);
  const generic = shuffle(SPOT_BY_MODE[mode] ?? SPOT_BY_MODE.car, rnd).slice(0, n - fromRoute.length)
    .map((id) => ({ id, emoji: SPOT_ITEMS.find((s) => s.id === id)!.emoji, label: spotName(id) }));
  return shuffle([...generic, ...fromRoute], rnd);
}

/** Completed lines (rows, columns, both diagonals) given the marked cell indexes. */
export function lines(size: number, marked: Set<number>): number[][] {
  const all: number[][] = [];
  for (let r = 0; r < size; r++) all.push(Array.from({ length: size }, (_, c) => r * size + c));
  for (let c = 0; c < size; c++) all.push(Array.from({ length: size }, (_, r) => r * size + c));
  all.push(Array.from({ length: size }, (_, i) => i * size + i));
  all.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)));
  return all.filter((l) => l.every((i) => marked.has(i)));
}

/** A route cell can be ticked once we are within ~3 % of the route before it (or anywhere when no progress). */
export const unlocked = (cell: BingoCell, progress?: number) => cell.at === undefined || progress === undefined || progress >= cell.at - 0.03;
