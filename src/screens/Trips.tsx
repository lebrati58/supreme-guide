import { useEffect, useState } from 'react';
import { MODES, type Trip } from '../types';
import { store } from '../storage/db';
import { MODE_META } from '../transport/trips';
import { href } from '../router';
import { Mascot } from '../components/Mascot';

export default function Trips() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  useEffect(() => { store.getTrips().then((x) => setTrips(x.sort((a, b) => b.createdAt - a.createdAt))); }, []);
  return (
    <div className="page stack">
      <h1>🧳 Your journeys</h1>
      <div className="modes">
        {MODES.map((m) => (
          <a key={m} className="mode-card" href={href(`/plan/${m}`)} style={{ '--mc': MODE_META[m].color } as React.CSSProperties}>
            <span className="emo" aria-hidden="true">{MODE_META[m].emoji}</span>{MODE_META[m].label}
          </a>
        ))}
      </div>
      {trips && trips.length === 0 && <Mascot mood="idle" text="No trips yet! Pick a ride above — I’ve prepared real routes for every mode." />}
      <div className="stack">
        {trips?.map((t) => (
          <a key={t.id} className="tile" href={href(`/trip/${t.id}`)}>
            <span className="ti">{MODE_META[t.mode].emoji}</span>
            <span className="grow"><b>{t.title}</b>
              <span className="small dim">{t.distanceKm.toLocaleString('en-US')} km · {t.countries.length} countr{t.countries.length === 1 ? 'y' : 'ies'} · {t.completedAt ? '🏁 completed' : `${Math.round((t.progress ?? 0) * 100)}%`}{t.packAt ? ' · 📦 offline' : ''}</span>
            </span>
            <span aria-hidden="true">›</span>
          </a>
        ))}
      </div>
    </div>
  );
}
