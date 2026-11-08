import { en, type Key } from './en';

/**
 * Minimal i18n. English ships first; other locales are registered as “planned” so the
 * architecture (dictionary per locale + RTL direction) is ready for fr, es, he, de…
 * Question content will be localised via per-locale content packs (see ARCHITECTURE.md).
 */
export interface LocaleInfo { code: string; name: string; dir: 'ltr' | 'rtl'; ready: boolean }
export const LOCALES: LocaleInfo[] = [
  { code: 'en', name: 'English', dir: 'ltr', ready: true },
  { code: 'fr', name: 'Français', dir: 'ltr', ready: false },
  { code: 'es', name: 'Español', dir: 'ltr', ready: false },
  { code: 'he', name: 'עברית', dir: 'rtl', ready: false },
  { code: 'de', name: 'Deutsch', dir: 'ltr', ready: false },
];

const dictionaries: Record<string, Partial<Record<Key, string>>> = { en };
let current = 'en';

export function setLocale(code: string) {
  const info = LOCALES.find((l) => l.code === code && l.ready) ?? LOCALES[0];
  current = info.code;
  document.documentElement.lang = info.code;
  document.documentElement.dir = info.dir;
}

export function t(key: Key, vars?: Record<string, string | number>): string {
  let s = dictionaries[current]?.[key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
