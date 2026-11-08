/** Time-zone helpers based on the browser's IANA database (Intl), so they work offline. */
function parts(tz: string, utcMs: number) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(new Date(utcMs))) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return o;
}

/** Offset of `tz` from UTC at instant `utcMs`, in ms. */
export function tzOffsetMs(tz: string, utcMs: number): number {
  const p = parts(tz, utcMs);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - Math.floor(utcMs / 1000) * 1000;
}

/** Convert a local wall-clock date+time in `tz` to a UTC epoch (ms). */
export function zonedToUtc(date: string, time: string, tz: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off1 = tzOffsetMs(tz, guess - tzOffsetMs(tz, guess));
  let utc = guess - off1;
  const off2 = tzOffsetMs(tz, utc);
  if (off2 !== off1) utc = guess - off2;
  return utc;
}

export function formatLocal(utcMs: number, tz: string, withDate = false): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', ...(withDate ? { day: 'numeric', month: 'short' } : {}) }).format(new Date(utcMs));
}

export function formatDuration(ms: number): string {
  const m = Math.round(Math.abs(ms) / 60000);
  const h = Math.floor(m / 60);
  return h ? `${h} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
}
