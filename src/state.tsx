import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Country, Mode, Question } from './types';
import { loadCountries, loadWorld110, loadWorld50, type WorldFC } from './data/loaders';
import { makeGameData, type GameData } from './game/engine';
import { supportsFlagEmoji } from './data/flags';
import { store } from './storage/db';
import { addStamp, awardBadges, badgeDefs, levelFromXp, newProfile, xpForAnswer, type BadgeDef, type Profile } from './game/progression';
import { CountryIndex } from './geo/countryIndex';
import { setLocale } from './i18n';

export interface Toast { id: number; icon: string; title: string; body?: string }
export interface AnswerResult { xp: number; levelUp: number | null; badges: BadgeDef[] }

interface Ctx {
  ready: boolean;
  error: string | null;
  countries: Country[];
  byIso3: Map<string, Country>;
  game: GameData;
  world110: WorldFC | null;
  getIndex: () => Promise<CountryIndex>;
  getWorld50: () => Promise<WorldFC>;
  profile: Profile;
  profiles: Profile[];
  switchProfile: (id: string) => void;
  createProfile: (name: string, avatar: string, kid: boolean) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  update: (fn: (p: Profile) => void) => void;
  recordAnswer: (q: Question, correct: boolean, streak: number, timeRatio?: number) => AnswerResult;
  stamp: (iso3s: string[], mode: Profile['stamps'][string]['mode']) => string[];
  useMode: (m: Mode) => void;
  online: boolean;
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  badges: BadgeDef[];
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [world110, setWorld110] = useState<WorldFC | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const indexRef = useRef<Promise<CountryIndex> | null>(null);
  const profilesRef = useRef<Profile[]>([]);
  profilesRef.current = profiles;
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [c, w, ps, active] = await Promise.all([loadCountries(), loadWorld110(), store.getProfiles(), store.get<string>('activeProfile')]);
        setCountries(c);
        setWorld110(w);
        let list = ps;
        if (!list.length) {
          const p = newProfile('Traveller');
          await store.putProfile(p);
          list = [p];
        }
        setProfiles(list);
        setActiveId(list.find((p) => p.id === active)?.id ?? list[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const byIso3 = useMemo(() => new Map(countries.map((c) => [c.iso3, c])), [countries]);
  const game = useMemo(() => {
    const nums = world110 ? new Set(world110.features.map((f) => f.properties.num).filter(Boolean)) : undefined;
    return makeGameData(countries, typeof document !== 'undefined' ? supportsFlagEmoji() : false, nums);
  }, [countries, world110]);
  const badges = useMemo(() => badgeDefs((iso) => byIso3.get(iso)?.region), [byIso3]);
  const profile = profiles.find((p) => p.id === activeId) ?? profiles[0];

  useEffect(() => { if (profile) setLocale(profile.settings.lang); }, [profile]);

  const persist = useCallback((p: Profile) => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { void store.putProfile(p); }, 150);
  }, []);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x, { ...t, id }]);
    window.setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 4200);
  }, []);

  /** Mutate a copy of the active profile, persist it, and announce new badges. */
  const mutate = useCallback((fn: (p: Profile) => void): { next: Profile; earned: BadgeDef[] } => {
    const list = profilesRef.current;
    const cur = list.find((p) => p.id === activeRef.current) ?? list[0];
    const next = structuredClone(cur);
    fn(next);
    const earned = awardBadges(next, badges);
    earned.forEach((b) => toast({ icon: b.emoji, title: `Badge unlocked: ${b.name}`, body: b.desc }));
    profilesRef.current = list.map((p) => (p.id === next.id ? next : p));
    setProfiles(profilesRef.current);
    persist(next);
    return { next, earned };
  }, [badges, persist, toast]);

  const update = useCallback((fn: (p: Profile) => void) => { mutate(fn); }, [mutate]);

  const recordAnswer = useCallback((q: Question, correct: boolean, streak: number, timeRatio?: number): AnswerResult => {
    const xp = xpForAnswer(q, correct, streak, timeRatio);
    let before = 0, after = 0;
    const { next, earned } = mutate((p) => {
      before = levelFromXp(p.xp).level;
      p.xp += xp;
      after = levelFromXp(p.xp).level;
      p.stats.answered++;
      if (correct) {
        p.stats.correct++;
        if (q.kind === 'mapfind') p.stats.mapCorrect++;
        if (q.kind === 'chronology') p.stats.chronoCorrect++;
        if (q.bonus) p.stats.bonusCorrect++;
      }
      p.stats.bestStreak = Math.max(p.stats.bestStreak, streak);
    });
    void store.enqueue('answer', { q: q.id, correct, xp, at: Date.now() });
    const levelUp = after > before ? after : null;
    if (levelUp) toast({ icon: '⭐', title: `Level ${levelUp}!`, body: `You are now a ${levelFromXp(next.xp).title}.` });
    return { xp, levelUp, badges: earned };
  }, [mutate, toast]);

  const stamp = useCallback((iso3s: string[], mode: Profile['stamps'][string]['mode']) => {
    const added: string[] = [];
    mutate((p) => { for (const i of iso3s) if (addStamp(p, i, mode)) added.push(i); });
    return added;
  }, [mutate]);

  const useMode = useCallback((m: Mode) => mutate((p) => { if (!p.modesUsed.includes(m)) p.modesUsed.push(m); }), [mutate]);

  const switchProfile = useCallback((id: string) => { setActiveId(id); void store.set('activeProfile', id); }, []);
  const createProfile = useCallback(async (name: string, avatar: string, kid: boolean) => {
    const p = newProfile(name, avatar, kid);
    await store.putProfile(p);
    setProfiles((ps) => [...ps, p]);
    switchProfile(p.id);
  }, [switchProfile]);
  const removeProfile = useCallback(async (id: string) => {
    if (profiles.length <= 1) return;
    await store.deleteProfile(id);
    const rest = profiles.filter((p) => p.id !== id);
    setProfiles(rest);
    if (activeId === id) switchProfile(rest[0].id);
  }, [profiles, activeId, switchProfile]);

  const getIndex = useCallback(() => {
    if (!indexRef.current) indexRef.current = loadWorld50().then((w) => new CountryIndex(w)).catch((e) => { indexRef.current = null; throw e; });
    return indexRef.current;
  }, []);

  const value: Ctx | null = profile ? {
    ready: countries.length > 0 && !!profile, error, countries, byIso3, game, world110, getIndex, getWorld50: loadWorld50,
    profile, profiles, switchProfile, createProfile, removeProfile, update, recordAnswer, stamp, useMode,
    online, toasts, toast, badges,
  } : null;

  if (error) return <div className="fatal"><img src={`${import.meta.env.BASE_URL}brand/mascot-round-256.webp`} alt="" width={120} height={120} /><h1>Oops — the map fell out of my backpack.</h1><p>{error}</p><button className="btn" onClick={() => location.reload()}>Try again</button></div>;
  if (!value || !value.ready) return null; // the boot splash stays visible
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
