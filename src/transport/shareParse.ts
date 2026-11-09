/**
 * Understands what navigation apps share (Waze, Google Maps, Apple Maps, geo: URIs, raw coordinates).
 * Navigation apps don't expose the driver's route, but their “Share” gives the destination: the
 * game then computes the same road route itself.
 */
export type Shared =
  | { kind: 'point'; lat: number; lng: number; label?: string }
  | { kind: 'query'; query: string };

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/** Standard geohash → centre point (Waze short links: waze.com/ul/h<geohash>). */
export function decodeGeohash(hash: string): { lat: number; lng: number } | null {
  let even = true;
  const lat = [-90, 90], lng = [-180, 180];
  for (const ch of hash.toLowerCase()) {
    const v = BASE32.indexOf(ch);
    if (v < 0) return null;
    for (let bit = 4; bit >= 0; bit--) {
      const on = (v >> bit) & 1;
      const r = even ? lng : lat;
      const mid = (r[0] + r[1]) / 2;
      if (on) r[0] = mid; else r[1] = mid;
      even = !even;
    }
  }
  return { lat: (lat[0] + lat[1]) / 2, lng: (lng[0] + lng[1]) / 2 };
}

const valid = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';

function coordsFrom(s: string): { lat: number; lng: number } | null {
  const tryPair = (re: RegExp, swap = false) => {
    const m = s.match(re);
    if (!m) return null;
    const a = parseFloat(m[1]), b = parseFloat(m[2]);
    const [lat, lng] = swap ? [b, a] : [a, b];
    return valid(lat, lng) ? { lat, lng } : null;
  };
  return (
    tryPair(new RegExp(`[?&](?:ll|to=ll\\.|q|query|daddr|destination|center)=?(?:ll\\.)?${NUM}(?:,|%2C)\\s*${NUM}`, 'i')) ??
    tryPair(new RegExp(`to=ll\\.${NUM}(?:,|%2C)${NUM}`, 'i')) ??
    tryPair(new RegExp(`!3d${NUM}!4d${NUM}`)) ??
    tryPair(new RegExp(`@${NUM},${NUM}`)) ??
    tryPair(new RegExp(`geo:${NUM},${NUM}`, 'i')) ??
    tryPair(new RegExp(`^\\s*${NUM}\\s*,\\s*${NUM}\\s*$`))
  );
}

/** Parse the title/text/url triple a share target receives. */
export function parseShared(input: { title?: string | null; text?: string | null; url?: string | null }): Shared | null {
  const parts = [input.url, input.text, input.title].filter((x): x is string => !!x && !!x.trim());
  if (!parts.length) return null;
  const all = parts.join(' ');
  let decoded = all;
  try { decoded = decodeURIComponent(all); } catch { /* keep raw */ }
  // A readable label: the shared text without its URL(s).
  const label = (input.text ?? input.title ?? '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim() || undefined;

  const gh = all.match(/waze\.com\/ul\/h([0-9a-z]{4,12})/i);
  if (gh) { const p = decodeGeohash(gh[1]); if (p && valid(p.lat, p.lng)) return { kind: 'point', ...p, label }; }

  const c = coordsFrom(all) ?? coordsFrom(decoded);
  if (c) return { kind: 'point', ...c, label };

  // Google / Apple text query (…?q=Eiffel+Tower) or plain address text.
  const q = decoded.match(/[?&](?:q|query|daddr|destination)=([^&\s]+)/i);
  if (q) return { kind: 'query', query: q[1].replace(/\+/g, ' ').trim() };
  if (label && !/^https?:/i.test(label)) return { kind: 'query', query: label };
  return null;
}
