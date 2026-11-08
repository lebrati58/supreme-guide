import { useEffect, useState } from 'react';
import { MODES, type Trip } from '../types';
import { store } from '../storage/db';
import { MODE_META, modeLabel } from '../transport/trips';
import { href } from '../router';
import { Mascot } from '../components/Mascot';
import { fmtNum, t, tn } from '../i18n';
import { journeyTitle } from '../i18n/content';

export default function Trips() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  useEffect(() => { store.getTrips().then((x) => setTrips(x.sort((a, b) => b.createdAt - a.createdAt))); }, []);
  return (
    <div className="page stack">
      <h1>{t('trips.title')}</h1>
      <div className="modes">
        {MODES.map((m) => (
          <a key={m} className="mode-card" href={href(`/plan/${m}`)} style={{ '--mc': MODE_META[m].color } as React.CSSProperties}>
            <span className="emo" aria-hidden="true">{MODE_META[m].emoji}</span>{modeLabel(m)}
          </a>
        ))}
      </div>
      {trips && trips.length === 0 && <Mascot mood="idle" text={t('trips.empty')} />}
      <div className="stack">
        {trips?.map((trip) => (
          <a key={trip.id} className="tile" href={href(`/trip/${trip.id}`)}>
            <span className="ti">{MODE_META[trip.mode].emoji}</span>
            <span className="grow"><b>{trip.curatedId ? journeyTitle({ id: trip.curatedId, title: trip.title }) : trip.title}</b>
              <span className="small dim">
                {fmtNum(trip.distanceKm)} km · {tn('trips.countries', trip.countries.length)} · {trip.completedAt ? t('trips.completed') : `${Math.round((trip.progress ?? 0) * 100)}%`}{trip.packAt ? ` · ${t('trips.offline')}` : ''}
              </span>
            </span>
            <span aria-hidden="true" className="chev">›</span>
          </a>
        ))}
      </div>
    </div>
  );
}
