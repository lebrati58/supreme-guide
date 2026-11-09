import { useEffect, useMemo, useState } from 'react';
import type { Stop, Trip } from '../types';
import { useApp } from '../state';
import { parseShared } from '../transport/shareParse';
import { PlaceSearch } from '../components/PlaceSearch';
import { Mascot } from '../components/Mascot';
import { RolePicker, useCreate } from './Planner';
import { fwd, intlLocale, t } from '../i18n';

/** Destination shared from Waze / Google Maps / Apple Maps → a road trip with route quizzes and guide. */
export default function Share({ query }: { query: URLSearchParams }) {
  const { online } = useApp();
  const { create, busy } = useCreate();
  const shared = useMemo(() => parseShared({ title: query.get('title'), text: query.get('text'), url: query.get('url') }), [query]);
  const [dest, setDest] = useState<Stop | null>(shared?.kind === 'point' ? { name: shared.label || t('share.destName'), lat: shared.lat, lng: shared.lng } : null);
  const [results, setResults] = useState<Stop[] | null>(null);
  const [start, setStart] = useState<Stop | null>(null);
  const [gpsErr, setGpsErr] = useState<string | null>(null);
  const [role, setRole] = useState<Trip['role'] | null>(null);

  // A text destination (address / place name): look it up once (Nominatim, explicit user action = opening the share).
  useEffect(() => {
    if (shared?.kind !== 'query' || !online) return;
    let alive = true;
    fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(shared.query)}`, { headers: { 'Accept-Language': intlLocale() } })
      .then((r) => r.json())
      .then((j: { display_name: string; lat: string; lon: string; address?: { country_code?: string } }[]) => {
        if (!alive) return;
        const list = j.map((x) => ({ name: x.display_name.split(',').slice(0, 2).join(','), lat: Number(x.lat), lng: Number(x.lon), cc: x.address?.country_code?.toUpperCase() }));
        setResults(list);
        if (list.length === 1) setDest(list[0]);
      })
      .catch(() => alive && setResults([]));
    return () => { alive = false; };
  }, [shared, online]);

  const useMyPosition = () => {
    setGpsErr(null);
    if (!('geolocation' in navigator)) { setGpsErr(t('walk.noGeo')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setStart({ name: t('walk.myPosition'), lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => setGpsErr(e.code === 1 ? t('trip.gpsDenied') : t('walk.noPos')),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <div className="page stack">
      <h1>{t('share.title')}</h1>
      <Mascot mood="takeoff" text={t('share.mascot')} />
      <div className="card paper stack">
        <h3 style={{ margin: 0 }}>🏁 {t('share.dest')}</h3>
        {!shared && <p className="notice small">{t('share.unknown')}</p>}
        {dest && <p style={{ margin: 0 }}><b>{dest.name}</b><br /><span className="small" style={{ color: 'var(--ink-2)' }} dir="ltr">{dest.lat.toFixed(4)}, {dest.lng.toFixed(4)}</span></p>}
        {shared?.kind === 'query' && !dest && (
          !online ? <p className="notice small">{t('share.offline')}</p>
            : results === null ? <p className="small">{t('share.searching', { q: shared.query })}</p>
            : results.length === 0 ? <p className="notice small">{t('share.noResult', { q: shared.query })}</p>
            : <div className="stack">{results.map((r, i) => <button key={i} className="tile" style={{ color: 'var(--ink)', background: 'var(--paper-2)' }} onClick={() => setDest(r)}>📍 {r.name}</button>)}</div>
        )}
        {!dest && <PlaceSearch label={t('share.pickDest')} value={null} onChange={(s) => s && setDest(s)} />}

        <h3 style={{ margin: '8px 0 0' }}>🚗 {t('share.start')}</h3>
        {start ? <p style={{ margin: 0 }}><b>{start.name}</b></p> : <button className="btn green small" onClick={useMyPosition}>📍 {t('share.myPos')}</button>}
        {gpsErr && <p className="notice warn small">{gpsErr}</p>}
        {!start && <PlaceSearch label={t('share.orPick')} value={null} onChange={(s) => s && setStart(s)} />}

        <RolePicker role={role} setRole={setRole} />
        <button className="btn" disabled={!dest || !start || !role || busy}
          onClick={() => dest && start && create({ mode: 'car', title: `${start.name} ${fwd()} ${dest.name}`, stops: [start, dest], role: role ?? undefined })}>
          🚗 {busy ? t('plan.computing') : t('share.create')}
        </button>
      </div>
      <p className="small dim">{t('share.help')}</p>
    </div>
  );
}
