import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { City, LngLat, Stop } from '../types';
import { useApp } from '../state';
import { loadCities } from '../data/loaders';
import { haversineKm } from '../geo/geo';
import { cityName } from '../i18n/content';
import { fmtNum, t } from '../i18n';
import { Modal } from './Bits';
import type { MapMarker } from '../map/WorldMap';

const WorldMap = lazy(() => import('../map/WorldMap'));

/** Name a tapped point: the nearest known town within 25 km (“near X”), else its coordinates. */
function nameFor(p: LngLat, cities: City[]): Stop {
  let best: City | null = null, d = Infinity;
  for (const c of cities) {
    if (Math.abs(c.lat - p[1]) > 0.5 || Math.abs(c.lng - p[0]) > 0.7) continue;
    const k = haversineKm(p, [c.lng, c.lat]);
    if (k < d) { d = k; best = c; }
  }
  const coords = `${fmtNum(Number(p[1].toFixed(3)))}° / ${fmtNum(Number(p[0].toFixed(3)))}°`;
  if (best && d <= 3) return { name: cityName(best), lat: p[1], lng: p[0], cc: best.cc };
  if (best && d <= 25) return { name: t('pick.near', { place: cityName(best) }), lat: p[1], lng: p[0], cc: best.cc };
  return { name: `📍 ${coords}`, lat: p[1], lng: p[0] };
}

/** Flyover-Country style: tap the start, then the destination, on the map. */
export function MapPicker({ onDone, onClose }: { onDone: (stops: [Stop, Stop]) => void; onClose: () => void }) {
  const { getWorld50, online } = useApp();
  const [world, setWorld] = useState<Awaited<ReturnType<typeof getWorld50>> | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [pts, setPts] = useState<Stop[]>([]);
  useEffect(() => { getWorld50().then(setWorld).catch(() => {}); loadCities().then(setCities).catch(() => {}); }, [getWorld50]);

  const tap = (p: LngLat) => setPts((x) => (x.length >= 2 ? [nameFor(p, cities)] : [...x, nameFor(p, cities)]));
  const markers = useMemo<MapMarker[]>(() => pts.map((s, i) => ({ id: `pick${i}`, lngLat: [s.lng, s.lat], kind: i === 0 ? 'stop' : 'end', label: s.name })), [pts]);

  return (
    <Modal label={t('pick.title')} onClose={onClose}>
      <h2 style={{ marginTop: 0 }}>🗺️ {t('pick.title')}</h2>
      <p className="small">{pts.length === 0 ? t('pick.tapStart') : pts.length === 1 ? t('pick.tapEnd') : t('pick.ready')}</p>
      <div className="pick-map">
        {world ? (
          <Suspense fallback={<div className="map" />}>
            <WorldMap world={world} markers={markers} route={pts.length === 2 ? [[pts[0].lng, pts[0].lat], [pts[1].lng, pts[1].lat]] : undefined} detailed={online} label={t('pick.title')} onMapClick={tap} />
          </Suspense>
        ) : <p className="splash-tip">{t('app.loading')}</p>}
      </div>
      {pts.map((s, i) => <p key={i} className="small" style={{ margin: '4px 0' }}>{i === 0 ? '🟢' : '🏁'} {s.name}</p>)}
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn green" disabled={pts.length < 2} onClick={() => onDone([pts[0], pts[1]])}>{t('pick.use')}</button>
        <button className="btn ghost" onClick={() => setPts([])}>{t('pick.reset')}</button>
      </div>
    </Modal>
  );
}
