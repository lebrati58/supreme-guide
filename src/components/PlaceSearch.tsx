import { useEffect, useId, useMemo, useState } from 'react';
import type { Airport, City, Stop } from '../types';
import { loadAirports, loadCities } from '../data/loaders';
import { searchAirports } from '../transport/flight';
import { useApp } from '../state';

/** Offline place search over bundled GeoNames cities (+ airports). Optional online search via Nominatim. */
export function PlaceSearch({ label, value, onChange, airports = false, placeholder }: {
  label: string; value: Stop | null; onChange: (s: Stop | null, airport?: Airport) => void; airports?: boolean; placeholder?: string;
}) {
  const id = useId();
  const { countries, online } = useApp();
  const [q, setQ] = useState(value?.name ?? '');
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [aps, setAps] = useState<Airport[]>([]);
  const [remote, setRemote] = useState<Stop[]>([]);
  const [busy, setBusy] = useState(false);
  const ccName = useMemo(() => new Map(countries.map((c) => [c.iso2, c.name])), [countries]);

  useEffect(() => { loadCities().then(setCities); if (airports) loadAirports().then(setAps); }, [airports]);
  useEffect(() => { setQ(value?.name ?? ''); }, [value]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2 || (value && value.name === q)) return { ap: [] as Airport[], ct: [] as City[] };
    const norm = (x: string) => x.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const ns = norm(s);
    const ct = cities.filter((c) => norm(c.name).startsWith(ns)).slice(0, airports ? 4 : 8);
    return { ap: airports ? searchAirports(aps, s, 6) : [], ct };
  }, [q, cities, aps, airports, value]);

  const searchOnline = async () => {
    setBusy(true);
    try {
      // Nominatim usage policy: explicit user action only, max 1 request/second, no autocomplete.
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`, { headers: { 'Accept-Language': 'en' } });
      const j = (await r.json()) as { display_name: string; lat: string; lon: string; address?: { country_code?: string } }[];
      setRemote(j.map((x) => ({ name: x.display_name.split(',').slice(0, 2).join(','), lat: Number(x.lat), lng: Number(x.lon), cc: x.address?.country_code?.toUpperCase() })));
    } catch { setRemote([]); } finally { setBusy(false); }
  };

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input" value={q} placeholder={placeholder ?? 'Type a city…'} autoComplete="off"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setRemote([]); if (value) onChange(null); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)} aria-autocomplete="list" />
      {open && (results.ap.length > 0 || results.ct.length > 0 || remote.length > 0 || (q.length >= 3 && !value)) && (
        <div className="suggest" role="listbox">
          {results.ap.map((a) => (
            <button key={a.iata} type="button" role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange({ name: `${a.name} (${a.iata})`, lat: a.lat, lng: a.lng, cc: a.cc }, a); setOpen(false); }}>
              <span>✈️</span><span><b>{a.iata}</b> {a.name}<br /><small>{ccName.get(a.cc) ?? a.cc} · {a.tz}</small></span>
            </button>
          ))}
          {results.ct.map((c, k) => (
            <button key={`${c.name}${k}`} type="button" role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange({ name: c.name, lat: c.lat, lng: c.lng, cc: c.cc }); setOpen(false); }}>
              <span>{c.capital ? '🏛️' : '🏙️'}</span><span><b>{c.name}</b><br /><small>{ccName.get(c.cc) ?? c.cc}{c.pop ? ` · ${(c.pop / 1e6 >= 1 ? `${(c.pop / 1e6).toFixed(1)}M` : `${Math.round(c.pop / 1000)}k`)} people` : ''}</small></span>
            </button>
          ))}
          {remote.map((r, k) => (
            <button key={`r${k}`} type="button" role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(r); setOpen(false); }}>
              <span>📍</span><span>{r.name}<br /><small>OpenStreetMap</small></span>
            </button>
          ))}
          {!airports && q.length >= 3 && online && remote.length === 0 && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={searchOnline} disabled={busy}>
              <span>🔎</span><span>{busy ? 'Searching…' : `Search “${q}” online`}<br /><small>OpenStreetMap Nominatim · streets, stations, ports</small></span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
