import { useEffect, useId, useMemo, useState } from 'react';
import type { Airport, City, Stop } from '../types';
import { loadAirports, loadCities } from '../data/loaders';
import { searchAirports } from '../transport/flight';
import { useApp } from '../state';
import { fmtNum, intlLocale, t } from '../i18n';
import { cityAllNames, cityName, countryName } from '../i18n/content';

/** Offline place search over bundled GeoNames cities (+ airports). Optional online search via Nominatim. */
export function PlaceSearch({ label, value, onChange, airports = false, placeholder, inputId }: {
  inputId?: string; label: string; value: Stop | null; onChange: (s: Stop | null, airport?: Airport) => void; airports?: boolean; placeholder?: string;
}) {
  const autoId = useId();
  const id = inputId ?? autoId;
  const { countries, online } = useApp();
  const [q, setQ] = useState(value?.name ?? '');
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [aps, setAps] = useState<Airport[]>([]);
  const [remote, setRemote] = useState<Stop[]>([]);
  const [busy, setBusy] = useState(false);
  const ccMap = useMemo(() => new Map(countries.map((c) => [c.iso2, c])), [countries]);
  const ccName = (cc: string) => { const c = ccMap.get(cc); return c ? countryName(c) : cc; };

  useEffect(() => { loadCities().then(setCities); if (airports) loadAirports().then(setAps); }, [airports]);
  useEffect(() => { setQ(value?.name ?? ''); }, [value]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2 || (value && value.name === q)) return { ap: [] as Airport[], ct: [] as City[] };
    const norm = (x: string) => x.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const ns = norm(s);
    // Any known name matches (London, Londres, Лондон, לונדון, 伦敦…), with or without accents.
    const ct = cities.filter((c) => cityAllNames(c).some((n) => norm(n).startsWith(ns))).slice(0, airports ? 4 : 8);
    return { ap: airports ? searchAirports(aps, s, 6) : [], ct };
  }, [q, cities, aps, airports, value]);

  const searchOnline = async () => {
    setBusy(true);
    try {
      // Nominatim usage policy: explicit user action only, max 1 request/second, no autocomplete.
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`, { headers: { 'Accept-Language': intlLocale() } });
      const j = (await r.json()) as { display_name: string; lat: string; lon: string; address?: { country_code?: string } }[];
      setRemote(j.map((x) => ({ name: x.display_name.split(',').slice(0, 2).join(','), lat: Number(x.lat), lng: Number(x.lon), cc: x.address?.country_code?.toUpperCase() })));
    } catch { setRemote([]); } finally { setBusy(false); }
  };

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input" value={q} placeholder={placeholder ?? t('search.cityPh')} autoComplete="off"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setRemote([]); if (value) onChange(null); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)} aria-autocomplete="list" />
      {open && (results.ap.length > 0 || results.ct.length > 0 || remote.length > 0 || (q.length >= 3 && !value)) && (
        <div className="suggest" role="listbox">
          {results.ap.map((a) => (
            <button key={a.iata} type="button" role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange({ name: `${a.name} (${a.iata})`, lat: a.lat, lng: a.lng, cc: a.cc }, a); setOpen(false); }}>
              <span>✈️</span><span><b>{a.iata}</b> {a.name}<br /><small>{ccName(a.cc)} · {a.tz}</small></span>
            </button>
          ))}
          {results.ct.map((c, k) => (
            <button key={`${c.name}${k}`} type="button" role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange({ name: cityName(c), lat: c.lat, lng: c.lng, cc: c.cc }); setOpen(false); }}>
              <span>{c.capital ? '🏛️' : '🏙️'}</span><span><b>{cityName(c)}</b><br /><small>{ccName(c.cc)}{c.pop ? ` · ${t('search.people', { n: fmtNum(c.pop, { notation: 'compact', maximumFractionDigits: 1 }) })}` : ''}</small></span>
            </button>
          ))}
          {remote.map((r, k) => (
            <button key={`r${k}`} type="button" role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(r); setOpen(false); }}>
              <span>📍</span><span>{r.name}<br /><small>OpenStreetMap</small></span>
            </button>
          ))}
          {!airports && q.length >= 3 && online && remote.length === 0 && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={searchOnline} disabled={busy}>
              <span>🔎</span><span>{busy ? t('search.searching') : t('search.online', { q })}<br /><small>{t('search.onlineSub')}</small></span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
