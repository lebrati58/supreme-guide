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

export function newProfile(name: string, avatar = '🧭', kidMode = false): Profile {
  return {
    id: `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    name, avatar, kidMode, createdAt: Date.now(), xp: 0,
    stats: { answered: 0, correct: 0, bestStreak: 0, mapCorrect: 0, chronoCorrect: 0, bonusCorrect: 0, perfectRounds: 0, tripsCompleted: 0 },
    modesUsed: [], stamps: {}, badges: {},
    daily: { streak: 0, best: 0, scores: {} }, tourStars: {},
    settings: { sound: true, reducedMotion: false, gpsConsent: false, lang: 'en' },
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

const TITLES: [number, string][] = [
  [1, 'Lost Tourist'], [3, 'Map Holder'], [5, 'Backpacker'], [8, 'Globetrotter'], [12, 'Explorer'],
  [16, 'Navigator'], [20, 'Cartographer'], [25, 'World Expert'], [32, 'Legendary Voyager'], [40, 'Supreme Guide'],
];
export function titleFor(level: number) { return TITLES.filter(([l]) => level >= l).pop()![1]; }

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
  return [
    { id: 'first-answer', emoji: '🐣', name: 'First Steps', desc: 'Answer your first question.', test: (p) => p.stats.answered >= 1 },
    { id: 'first-trip', emoji: '🎒', name: 'Bon Voyage', desc: 'Complete your first journey.', test: (p) => p.stats.tripsCompleted >= 1 },
    { id: 'streak-5', emoji: '🔥', name: 'On Fire', desc: 'Get 5 correct answers in a row.', test: (p) => p.stats.bestStreak >= 5 },
    { id: 'streak-15', emoji: '☄️', name: 'Unstoppable', desc: 'Get 15 correct answers in a row.', test: (p) => p.stats.bestStreak >= 15 },
    { id: 'perfect', emoji: '💯', name: 'Flawless', desc: 'Finish a round of 8+ questions with no mistakes.', test: (p) => p.stats.perfectRounds >= 1 },
    { id: 'stamps-10', emoji: '🛂', name: 'Stamp Collector', desc: 'Collect 10 passport stamps.', test: (p) => Object.keys(p.stamps).length >= 10 },
    { id: 'stamps-30', emoji: '📕', name: 'Full Passport', desc: 'Collect 30 passport stamps.', test: (p) => Object.keys(p.stamps).length >= 30 },
    { id: 'stamps-75', emoji: '🌐', name: 'Citizen of the World', desc: 'Collect 75 passport stamps.', test: (p) => Object.keys(p.stamps).length >= 75 },
    { id: 'five-regions', emoji: '🗺️', name: 'Five Regions', desc: 'Get a stamp in Africa, the Americas, Asia, Europe and Oceania.',
      test: (p) => ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'].every((r) => stampsIn(p, regionOf, r)) },
    { id: 'all-modes', emoji: '🚀', name: 'Every Ride', desc: 'Travel by plane, train, bus, car, on foot and by boat.', test: (p) => p.modesUsed.length >= 6 },
    { id: 'map-10', emoji: '📍', name: 'Sharp Finger', desc: 'Find 10 countries on the map.', test: (p) => p.stats.mapCorrect >= 10 },
    { id: 'chrono-5', emoji: '⏳', name: 'Time Traveller', desc: 'Solve 5 timelines.', test: (p) => p.stats.chronoCorrect >= 5 },
    { id: 'bonus-3', emoji: '🎁', name: 'Surprise Master', desc: 'Win 3 surprise challenges.', test: (p) => p.stats.bonusCorrect >= 3 },
    { id: 'daily-7', emoji: '📅', name: 'Daily Habit', desc: 'Play the daily challenge 7 days in a row.', test: (p) => p.daily.best >= 7 },
    { id: 'level-10', emoji: '👑', name: 'Royal Traveller', desc: 'Reach level 10.', test: (p) => levelFromXp(p.xp).level >= 10 },
  ];
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
