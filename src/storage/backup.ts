import type { Profile } from '../game/progression';
import { MAX_MISTAKES } from '../game/progression';
import { MODES, type Trip } from '../types';

/**
 * Backups of the player's progress (profiles + trips): export, strict validation, merge.
 * A backup file comes from outside the app (a file, another phone), so nothing in it is trusted:
 * every field is type-checked, sizes are capped and links must be http(s).
 */
export const BACKUP_VERSION = 1;
export interface Backup { app: 'supreme-guide'; v: number; exportedAt: string; profiles: Profile[]; trips: Trip[] }
export type BackupError = 'notJson' | 'notBackup' | 'tooBig' | 'empty';

const MAX_BYTES = 30 * 1024 * 1024;
const MAX_PROFILES = 20;
const MAX_TRIPS = 1000;

export function makeBackup(profiles: Profile[], trips: Trip[]): Backup {
  return { app: 'supreme-guide', v: BACKUP_VERSION, exportedAt: new Date().toISOString(), profiles, trips };
}

// ---------------------------------------------------------------- validation helpers
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const num = (x: unknown, d = 0, max = 1e12) => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.min(max, x)) : d);
const str = (x: unknown, max = 200, d = '') => (typeof x === 'string' ? x.slice(0, max) : d);
const optStr = (x: unknown, max = 200) => (typeof x === 'string' ? x.slice(0, max) : undefined);
const safeUrl = (x: unknown) => (typeof x === 'string' && /^https?:\/\//i.test(x) ? x.slice(0, 2000) : undefined);
const lat = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 90;
const lng = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 360;
const record = <T,>(x: unknown, val: (v: unknown) => T | undefined, maxKeys = 500): Record<string, T> => {
  const out: Record<string, T> = {};
  if (!isObj(x)) return out;
  for (const [k, v] of Object.entries(x).slice(0, maxKeys)) { const ok = val(v); if (ok !== undefined) out[k.slice(0, 40)] = ok; }
  return out;
};

function cleanProfile(x: unknown): Profile | null {
  if (!isObj(x) || typeof x.id !== 'string' || typeof x.name !== 'string') return null;
  const s = isObj(x.stats) ? x.stats : {};
  const st = isObj(x.settings) ? x.settings : {};
  const daily = isObj(x.daily) ? x.daily : {};
  const p: Profile = {
    id: x.id.slice(0, 60), name: str(x.name, 24) || '?', avatar: str(x.avatar, 8, '🧭'), kidMode: x.kidMode === true,
    createdAt: num(x.createdAt), xp: num(x.xp, 0, 1e9),
    stats: {
      answered: num(s.answered), correct: num(s.correct), bestStreak: num(s.bestStreak), mapCorrect: num(s.mapCorrect), chronoCorrect: num(s.chronoCorrect),
      bonusCorrect: num(s.bonusCorrect), perfectRounds: num(s.perfectRounds), tripsCompleted: num(s.tripsCompleted),
    },
    modesUsed: Array.isArray(x.modesUsed) ? x.modesUsed.filter((m): m is Profile['modesUsed'][number] => (MODES as readonly string[]).includes(m as string)) : [],
    stamps: record(x.stamps, (v) => (isObj(v) && typeof v.iso3 === 'string' ? { iso3: v.iso3.slice(0, 3), at: num(v.at), mode: (str(v.mode, 10) || 'quiz') as Profile['stamps'][string]['mode'] } : undefined)),
    badges: record(x.badges, (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)),
    daily: { last: optStr(daily.last, 12), streak: num(daily.streak), best: num(daily.best), scores: record(daily.scores, (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined), 4000) },
    tourStars: record(x.tourStars, (v) => (typeof v === 'number' && v >= 0 && v <= 3 ? v : undefined)) as Profile['tourStars'],
    settings: {
      sound: st.sound !== false, haptics: st.haptics !== false, reducedMotion: st.reducedMotion === true, gpsConsent: st.gpsConsent === true,
      lang: str(st.lang, 10, 'en'), interests: Array.isArray(st.interests) ? (st.interests.filter((i) => typeof i === 'string').slice(0, 10) as Profile['settings']['interests']) : undefined,
    },
  };
  if (Array.isArray(x.mistakes)) p.mistakes = x.mistakes.slice(-MAX_MISTAKES).filter((q) => isObj(q) && typeof q.id === 'string' && typeof q.prompt === 'string' && Array.isArray(q.options)) as Profile['mistakes'];
  if (isObj(x.records)) p.records = { survival: num(x.records.survival) };
  return p;
}

function cleanTrip(x: unknown): Trip | null {
  if (!isObj(x) || typeof x.id !== 'string' || !(MODES as readonly string[]).includes(x.mode as string)) return null;
  const stops = Array.isArray(x.stops) ? x.stops.filter((s) => isObj(s) && lat(s.lat) && lng(s.lng)).slice(0, 200).map((s) => {
    const o = s as Record<string, unknown>;
    return { name: str(o.name, 120) || '?', lat: o.lat as number, lng: o.lng as number, cc: optStr(o.cc, 3), note: optStr(o.note, 60) };
  }) : [];
  const geometry = Array.isArray(x.geometry) ? x.geometry.filter((p) => Array.isArray(p) && lng(p[0]) && lat(p[1])).slice(0, 50000).map((p) => [p[0], p[1]] as [number, number]) : [];
  if (stops.length < 1 || geometry.length < 1) return null;
  const t: Trip = {
    id: x.id.slice(0, 60), mode: x.mode as Trip['mode'], title: str(x.title, 200) || '?', stops, geometry,
    geometrySource: (['great-circle', 'stop-to-stop', 'road-network', 'walking-network', 'gps-trace'].includes(x.geometrySource as string) ? x.geometrySource : 'stop-to-stop') as Trip['geometrySource'],
    distanceKm: num(x.distanceKm, 0, 50000),
    countries: Array.isArray(x.countries) ? x.countries.filter((c) => isObj(c) && typeof c.iso3 === 'string').slice(0, 100).map((c) => ({ iso3: str((c as Record<string, unknown>).iso3, 3), at: Math.min(1, num((c as Record<string, unknown>).at)) })) : [],
    createdAt: num(x.createdAt),
  };
  if (typeof x.label === 'string') t.label = x.label.slice(0, 80);
  if (typeof x.depUtc === 'number') t.depUtc = num(x.depUtc);
  if (typeof x.arrUtc === 'number') t.arrUtc = num(x.arrUtc);
  if (x.role === 'passenger' || x.role === 'driver') t.role = x.role;
  if (typeof x.progress === 'number') t.progress = Math.min(1, num(x.progress));
  if (typeof x.completedAt === 'number') t.completedAt = num(x.completedAt);
  if (typeof x.curatedId === 'string') t.curatedId = x.curatedId.slice(0, 60);
  if (Array.isArray(x.answeredIds)) t.answeredIds = x.answeredIds.filter((i) => typeof i === 'string').slice(-2000).map((i) => (i as string).slice(0, 200));
  if (typeof x.packAt === 'number') t.packAt = num(x.packAt);
  if (typeof x.packLang === 'string') t.packLang = x.packLang.slice(0, 10);
  if (Array.isArray(x.wiki)) {
    t.wiki = x.wiki.filter(isObj).slice(0, 60).flatMap((w) => {
      const url = safeUrl(w.url);
      if (!url || typeof w.title !== 'string' || typeof w.extract !== 'string') return [];
      return [{ title: w.title.slice(0, 200), extract: w.extract.slice(0, 4000), url, thumb: safeUrl(w.thumb), lat: lat(w.lat) ? w.lat as number : undefined, lng: lng(w.lng) ? w.lng as number : undefined }];
    });
  }
  if (isObj(x.flight) && typeof x.flight.from === 'string' && typeof x.flight.to === 'string') {
    const f = x.flight;
    const src = ['player', 'provider', 'estimated'].includes(f.scheduleSource as string) ? f.scheduleSource as 'player' : 'estimated';
    t.flight = { number: optStr(f.number, 10), from: str(f.from, 4), to: str(f.to, 4), date: str(f.date, 10), depLocal: str(f.depLocal, 5), arrLocal: str(f.arrLocal, 5),
      depUtc: num(f.depUtc), arrUtc: num(f.arrUtc), delayMin: num(f.delayMin, 0, 10000), scheduleSource: src };
  }
  // AI questions are not restored (they are rebuilt from Wikipedia when the AI guide is on).
  return t;
}

/** Parse and validate a backup file's text. */
export function parseBackup(text: string): Backup | BackupError {
  if (text.length > MAX_BYTES) return 'tooBig';
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return 'notJson'; }
  if (!isObj(raw) || raw.app !== 'supreme-guide' || !Array.isArray(raw.profiles)) return 'notBackup';
  const profiles = raw.profiles.slice(0, MAX_PROFILES).map(cleanProfile).filter((p): p is Profile => !!p);
  const trips = (Array.isArray(raw.trips) ? raw.trips : []).slice(0, MAX_TRIPS).map(cleanTrip).filter((t): t is Trip => !!t);
  if (!profiles.length) return 'empty';
  return { app: 'supreme-guide', v: num(raw.v, 1), exportedAt: str(raw.exportedAt, 40), profiles, trips };
}

// ---------------------------------------------------------------- merge (keep the best of both)
const maxRec = (a: Record<string, number>, b: Record<string, number>) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? -Infinity, v);
  return out;
};

export function mergeProfile(local: Profile, incoming: Profile): Profile {
  const p = structuredClone(local);
  p.xp = Math.max(local.xp, incoming.xp);
  for (const k of Object.keys(p.stats) as (keyof Profile['stats'])[]) p.stats[k] = Math.max(local.stats[k] ?? 0, incoming.stats[k] ?? 0);
  p.modesUsed = [...new Set([...local.modesUsed, ...incoming.modesUsed])];
  for (const [k, s] of Object.entries(incoming.stamps)) if (!p.stamps[k] || s.at < p.stamps[k].at) p.stamps[k] = s;
  for (const [k, at] of Object.entries(incoming.badges)) p.badges[k] = p.badges[k] ? Math.min(p.badges[k], at) : at;
  p.daily = { last: [local.daily.last, incoming.daily.last].filter(Boolean).sort().pop(), streak: Math.max(local.daily.streak, incoming.daily.streak), best: Math.max(local.daily.best, incoming.daily.best), scores: maxRec(local.daily.scores, incoming.daily.scores) };
  p.tourStars = maxRec(local.tourStars as Record<string, number>, incoming.tourStars as Record<string, number>) as Profile['tourStars'];
  p.records = { survival: Math.max(local.records?.survival ?? 0, incoming.records?.survival ?? 0) };
  const seen = new Set<string>();
  p.mistakes = [...(incoming.mistakes ?? []), ...(local.mistakes ?? [])].filter((q) => (seen.has(q.id) ? false : (seen.add(q.id), true))).slice(-MAX_MISTAKES);
  return p; // name, avatar and settings stay as on this phone
}

export function mergeTrip(local: Trip, incoming: Trip): Trip {
  // Keep the copy that went further; add any answers the other one has.
  const further = (incoming.completedAt && !local.completedAt) || (incoming.progress ?? 0) > (local.progress ?? 0) ? incoming : local;
  const t = structuredClone(further);
  t.answeredIds = [...new Set([...(local.answeredIds ?? []), ...(incoming.answeredIds ?? [])])];
  if (!t.wiki?.length && (local.wiki?.length || incoming.wiki?.length)) { t.wiki = local.wiki?.length ? local.wiki : incoming.wiki; t.packAt = local.packAt ?? incoming.packAt; t.packLang = local.packLang ?? incoming.packLang; }
  return t;
}

export interface RestorePlan { profiles: Profile[]; trips: Trip[]; added: { profiles: number; trips: number }; merged: { profiles: number; trips: number } }

/** What the phone will contain after a merge (nothing is lost) or a replace (the backup wins). */
export function planRestore(local: { profiles: Profile[]; trips: Trip[] }, b: Backup, mode: 'merge' | 'replace'): RestorePlan {
  if (mode === 'replace') return { profiles: b.profiles, trips: b.trips, added: { profiles: b.profiles.length, trips: b.trips.length }, merged: { profiles: 0, trips: 0 } };
  const lp = new Map(local.profiles.map((p) => [p.id, p]));
  const lt = new Map(local.trips.map((t) => [t.id, t]));
  const plan: RestorePlan = { profiles: [...local.profiles], trips: [...local.trips], added: { profiles: 0, trips: 0 }, merged: { profiles: 0, trips: 0 } };
  for (const p of b.profiles) {
    const cur = lp.get(p.id);
    if (cur) { plan.profiles = plan.profiles.map((x) => (x.id === p.id ? mergeProfile(cur, p) : x)); plan.merged.profiles++; } else { plan.profiles.push(p); plan.added.profiles++; }
  }
  for (const t of b.trips) {
    const cur = lt.get(t.id);
    if (cur) { plan.trips = plan.trips.map((x) => (x.id === t.id ? mergeTrip(cur, t) : x)); plan.merged.trips++; } else { plan.trips.push(t); plan.added.trips++; }
  }
  return plan;
}
