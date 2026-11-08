import { useSyncExternalStore } from 'react';
import en from './locales/en.json';

/**
 * Supreme Guide i18n.
 * - One flat JSON catalog per locale (src/i18n/locales/<code>.json). English is bundled; the
 *   others load on demand and are precached by the service worker, so every language works offline.
 * - Country, currency and language NAMES come from the browser's CLDR data (Intl.DisplayNames):
 *   official translations, offline, no maintenance.
 * - `{name}` placeholders; plurals via `key.one` / `key.other` (+ `.two`, `.few`, `.many` where a
 *   language needs them) selected with Intl.PluralRules.
 */
export type LocaleCode = 'en' | 'fr' | 'es' | 'de' | 'he' | 'ar' | 'pt' | 'it' | 'ru' | 'zh';
export interface LocaleInfo { code: LocaleCode; name: string; english: string; dir: 'ltr' | 'rtl' }

export const LOCALES: LocaleInfo[] = [
  { code: 'en', name: 'English', english: 'English', dir: 'ltr' },
  { code: 'fr', name: 'Français', english: 'French', dir: 'ltr' },
  { code: 'es', name: 'Español', english: 'Spanish', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', english: 'German', dir: 'ltr' },
  { code: 'it', name: 'Italiano', english: 'Italian', dir: 'ltr' },
  { code: 'pt', name: 'Português', english: 'Portuguese', dir: 'ltr' },
  { code: 'ru', name: 'Русский', english: 'Russian', dir: 'ltr' },
  { code: 'he', name: 'עברית', english: 'Hebrew', dir: 'rtl' },
  { code: 'ar', name: 'العربية', english: 'Arabic', dir: 'rtl' },
  { code: 'zh', name: '中文（简体）', english: 'Chinese (Simplified)', dir: 'ltr' },
];

export type Key = keyof typeof en;
type Dict = Record<string, string>;

const EN = en as Dict;
const loaders = import.meta.glob<Dict>(['./locales/*.json', '!./locales/en.json'], { import: 'default' });

let current: LocaleCode = 'en';
let dict: Dict = EN;
let version = 0;
const listeners = new Set<() => void>();

export const isLocale = (c: unknown): c is LocaleCode => LOCALES.some((l) => l.code === c);
export const localeInfo = (c: LocaleCode = current) => LOCALES.find((l) => l.code === c)!;
export const locale = () => current;

/** Best match from the browser's preferred languages (e.g. "pt-BR" → "pt", "zh-CN" → "zh"). */
export function detectLocale(): LocaleCode {
  const prefs = typeof navigator === 'undefined' ? [] : [...(navigator.languages ?? []), navigator.language];
  for (const p of prefs) {
    const base = (p ?? '').toLowerCase().split('-')[0];
    if (base === 'iw') return 'he';
    if (isLocale(base)) return base;
  }
  return 'en';
}

export async function setLocale(code: string): Promise<void> {
  const target: LocaleCode = isLocale(code) ? code : 'en';
  let next: Dict = EN;
  if (target !== 'en') {
    const load = loaders[`./locales/${target}.json`];
    try { next = { ...EN, ...(load ? await load() : {}) }; } catch (e) { console.warn('Locale load failed', e); }
  }
  current = target;
  dict = next;
  names.clear();
  if (typeof document !== 'undefined') {
    document.documentElement.lang = target === 'zh' ? 'zh-Hans' : target;
    document.documentElement.dir = localeInfo(target).dir;
  }
  version++;
  listeners.forEach((l) => l());
}

function interpolate(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] === undefined ? m : typeof vars[k] === 'number' ? fmtNum(vars[k] as number) : String(vars[k])));
}

/** Translate a UI key. */
export function t(key: Key, vars?: Record<string, string | number>): string {
  return interpolate(dict[key] ?? EN[key] ?? key, vars);
}

/** Translate a dynamic content key (question, landmark…), falling back to the given English text. */
export function tc(key: string, fallback: string, vars?: Record<string, string | number>): string {
  return interpolate(dict[key] ?? EN[key] ?? fallback, vars);
}

/** Plural-aware translation: looks up `${key}.${category}` then `${key}.other`. */
export function tn(key: string, n: number, vars?: Record<string, string | number>): string {
  const cat = new Intl.PluralRules(current).select(n);
  const s = dict[`${key}.${cat}`] ?? dict[`${key}.other`] ?? EN[`${key}.${cat}`] ?? EN[`${key}.other`] ?? key;
  return interpolate(s, { n, ...vars });
}

// ------------------------------------------------------------- CLDR names (offline)
const names = new Map<string, Intl.DisplayNames | null>();
function display(type: 'region' | 'currency' | 'language') {
  if (!names.has(type)) {
    try { names.set(type, new Intl.DisplayNames([current === 'zh' ? 'zh-Hans' : current], { type, fallback: 'none' })); } catch { names.set(type, null); }
  }
  return names.get(type);
}
const safeOf = (d: Intl.DisplayNames | null | undefined, code: string) => { try { return d?.of(code); } catch { return undefined; } };

export const regionName = (iso2: string, fallback: string) => safeOf(display('region'), iso2) ?? fallback;
export const currencyName = (code: string | undefined, fallback: string) => (code ? safeOf(display('currency'), code) : undefined) ?? fallback;
export const languageName = (code: string | undefined, fallback: string) => (code ? safeOf(display('language'), code) : undefined) ?? fallback;

export const fmtNum = (n: number, opts?: Intl.NumberFormatOptions) => n.toLocaleString(current === 'zh' ? 'zh-Hans' : current, opts);
export const fmtDate = (d: number | Date, opts?: Intl.DateTimeFormatOptions) => new Date(d).toLocaleString(current === 'zh' ? 'zh-Hans' : current, opts);
export const intlLocale = () => (current === 'zh' ? 'zh-Hans' : current);

/** Forward arrow in reading direction (→ in LTR, ← in Hebrew/Arabic). */
export const fwd = () => (localeInfo().dir === 'rtl' ? '←' : '→');

/** "A, B and C" in the current language (CLDR list patterns). */
export function listJoin(items: string[]): string {
  try { return new Intl.ListFormat(intlLocale(), { style: 'long', type: 'conjunction' }).format(items); } catch { return items.join(', '); }
}

/** Re-render a component when the language changes. */
export function useLocale(): LocaleCode {
  useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => version, () => version);
  return current;
}
