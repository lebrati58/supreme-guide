import { useEffect, useState } from 'react';

/**
 * Night mode: a dark, softer theme for night flights, night trains and night drives (a bright screen
 * on the back seat dazzles the driver). “auto” follows the phone's dark mode, and switches on by itself
 * at night (21:00–06:59 on the phone's clock, which follows the local time zone while travelling).
 */
export type ThemePref = 'auto' | 'night' | 'day';
export const NIGHT_FROM = 21;
export const NIGHT_TO = 7;

export function isNightHour(hour: number): boolean {
  return hour >= NIGHT_FROM || hour < NIGHT_TO;
}

export function isNight(pref: ThemePref | undefined, systemDark: boolean, hour: number): boolean {
  if (pref === 'night') return true;
  if (pref === 'day') return false;
  return systemDark || isNightHour(hour);
}

let current = false;
/** Whether night mode is on right now (for code outside React, e.g. the voice). */
export const nightNow = () => current;

/** Applies the theme to <html data-theme> and the browser bar colour; re-checks every minute. */
export function useNightMode(pref: ThemePref | undefined): boolean {
  const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const compute = () => isNight(pref, !!mq?.matches, new Date().getHours());
  const [night, setNight] = useState(compute);
  useEffect(() => {
    const update = () => setNight(compute());
    update();
    const id = window.setInterval(update, 60_000);
    mq?.addEventListener?.('change', update);
    return () => { clearInterval(id); mq?.removeEventListener?.('change', update); };
  }, [pref]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    current = night;
    document.documentElement.dataset.theme = night ? 'night' : 'day';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', night ? '#050b1c' : '#0b1f4d');
  }, [night]);
  return night;
}
