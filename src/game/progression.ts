import { tc } from '../i18n';
import { TITLES } from '../content/ranks';
import { BADGES } from '../content/badges';
import type { Mode, Question, Region } from '../types';

export interface Stamp { iso3: string; at: number; mode: Mode | 'quiz' }

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  kidMode: boolean;
  createdAt: number;
  xp: number;
  stats: { answered: number; correct: number; bestStreak: number; mapCorrect: number; chronoCorrect: number; bonusCorrect: number; perfectRounds: number; tripsCompleted: number };
  modesUsed: Mode[];
  stamps: Record<string, Stamp>;
  badges: Record<string, number>;
  daily: { last?: string; streak: number; best: number; scores: Record<string, number> };
  tourStars: Partial<Record<Region, number>>;
  settings: { sound: boolean; reducedMotion: boolean; gpsConsent: boolean; lang: string };
}

export function newProfile(name: string, avatar = '🧭', kidMode = false, lang = 'en'): Profile {
  return {
    id: `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    name, avatar, kidMode, createdAt: Date.now(), xp: 0,
    stats: { answered: 0, correct: 0, bestStreak: 0, mapCorrect: 0, chronoCorrect: 0, bonusCorrect: 0, perfectRounds: 0, tripsCompleted: 0 },
    modesUsed: [], stamps: {}, badges: {},
    daily: { streak: 0, best: 0, scores: {} }, tourStars: {},
    settings: { sound: true, reducedMotion: false, gpsConsent: false, lang },
  };
}

// ------------------------------------------------------------- XP & levels
export function xpForAnswer(q: Question, correct: boolean, streak: number, timeLeftRatio?: number): number {
  if (!correct) return 2; // a little consolation: learning counts
  let xp = 10 * q.difficulty;
  xp += Math.min(10, Math.max(0, streak - 1) * 2);
  if (timeLeftRatio !== undefined) xp += Math.round(10 * timeLeftRatio);
  if (q.bonus) xp *= 2;
  return xp;
}

/** XP needed to go from level n to n+1. */
export const levelStep = (n: number) => 100 + 60 * (n - 1);

export function levelFromXp(xp: number) {
  let level = 1, floor = 0;
  while (xp >= floor + levelStep(level)) { floor += levelStep(level); level++; }
  const need = levelStep(level);
  return { level, into: xp - floor, need, title: titleFor(level) };
}

export function titleFor(level: number) {
  const i = TITLES.filter(([l]) => level >= l).length - 1;
  return tc(`rank.${i}`, TITLES[i][1]);
}
export const RANK_TITLES = TITLES.map(([, name]) => name);

// ------------------------------------------------------------- world tour
export const TOUR: { region: Region; unlockLevel: number; emoji: string }[] = [
  { region: 'Europe', unlockLevel: 1, emoji: '🏰' },
  { region: 'Americas', unlockLevel: 2, emoji: '🗽' },
  { region: 'Asia', unlockLevel: 4, emoji: '⛩️' },
  { region: 'Africa', unlockLevel: 6, emoji: '🦁' },
  { region: 'Oceania', unlockLevel: 8, emoji: '🦘' },
];
export const isRegionUnlocked = (p: Profile, r: Region) => levelFromXp(p.xp).level >= (TOUR.find((t) => t.region === r)?.unlockLevel ?? 99);

// ------------------------------------------------------------- badges
export interface BadgeDef { id: string; emoji: string; name: string; desc: string; test: (p: Profile) => boolean }
const stampsIn = (p: Profile, regionOf: (iso: string) => string | undefined, r: string) => Object.keys(p.stamps).some((i) => regionOf(i) === r);

export function badgeDefs(regionOf: (iso3: string) => string | undefined): BadgeDef[] {
  const tests: Record<string, (p: Profile) => boolean> = {
    'first-answer': (p) => p.stats.answered >= 1,
    'first-trip': (p) => p.stats.tripsCompleted >= 1,
    'streak-5': (p) => p.stats.bestStreak >= 5,
    'streak-15': (p) => p.stats.bestStreak >= 15,
    'perfect': (p) => p.stats.perfectRounds >= 1,
    'stamps-10': (p) => Object.keys(p.stamps).length >= 10,
    'stamps-30': (p) => Object.keys(p.stamps).length >= 30,
    'stamps-75': (p) => Object.keys(p.stamps).length >= 75,
    'five-regions': (p) => ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'].every((r) => stampsIn(p, regionOf, r)),
    'all-modes': (p) => p.modesUsed.length >= 6,
    'map-10': (p) => p.stats.mapCorrect >= 10,
    'chrono-5': (p) => p.stats.chronoCorrect >= 5,
    'bonus-3': (p) => p.stats.bonusCorrect >= 3,
    'daily-7': (p) => p.daily.best >= 7,
    'level-10': (p) => levelFromXp(p.xp).level >= 10,
  };
  return BADGES.map((b) => ({ ...b, test: tests[b.id] }));
}

/** Returns ids of badges newly earned. Mutates profile. */
export function awardBadges(p: Profile, defs: BadgeDef[]): BadgeDef[] {
  const earned: BadgeDef[] = [];
  for (const b of defs) if (!p.badges[b.id] && b.test(p)) { p.badges[b.id] = Date.now(); earned.push(b); }
  return earned;
}

export function addStamp(p: Profile, iso3: string, mode: Stamp['mode']): boolean {
  if (p.stamps[iso3]) return false;
  p.stamps[iso3] = { iso3, at: Date.now(), mode };
  return true;
}

/** Daily streak update; returns the new streak. */
export function recordDaily(p: Profile, day: string, score: number, yesterday: string): number {
  if (p.daily.scores[day] !== undefined) return p.daily.streak;
  p.daily.scores[day] = score;
  p.daily.streak = p.daily.last === yesterday ? p.daily.streak + 1 : 1;
  p.daily.best = Math.max(p.daily.best, p.daily.streak);
  p.daily.last = day;
  return p.daily.streak;
}
