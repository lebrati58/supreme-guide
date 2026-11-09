import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useApp } from '../state';
import { Logo } from '../components/Brand';
import { Mascot } from '../components/Mascot';
import { XPBar } from '../components/Bits';
import { MODES, type Trip } from '../types';
import { MODE_META, modeLabel } from '../transport/trips';
import { go, href } from '../router';
import { store } from '../storage/db';
import { todayKey } from '../game/rng';
import { isRegionUnlocked, TOUR } from '../game/progression';
import { t } from '../i18n';
import { LEGENDS } from '../content/legendary';
import { JOURNEYS } from '../content/journeys';
import { journeyTitle } from '../i18n/content';

const WorldMap = lazy(() => import('../map/WorldMap'));

export default function Home() {
  const { profile, online, getWorld50, countries } = useApp();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [world, setWorld] = useState<Awaited<ReturnType<typeof getWorld50>> | null>(null);
  useEffect(() => { store.getTrips().then((x) => setTrips(x.sort((a, b) => b.createdAt - a.createdAt))); getWorld50().then(setWorld).catch(() => {}); }, [getWorld50]);
  const active = trips.find((x) => !x.completedAt);
  const visited = useMemo(() => new Set(Object.keys(profile.stamps)), [profile.stamps]);
  const locked = useMemo(() => new Set(countries.filter((c) => !isRegionUnlocked(profile, c.region)).map((c) => c.iso3)), [countries, profile]);
  const playedToday = profile.daily.scores[todayKey()] !== undefined;
  const firstTime = profile.stats.answered === 0;

  return (
    <div className="page stack">
      <section className="hero">
        <div className="clouds" aria-hidden="true"><i style={{ top: '8%', animationDuration: '60s' }}>☁️</i><i style={{ top: '55%', animationDuration: '85s', animationDelay: '-30s' }}>☁️</i></div>
        <Logo />
        <p className="tagline">{t('app.tagline')}</p>
        <p className="dim" style={{ margin: '0 0 14px' }}>{t('home.pitch')}</p>
        <button className="btn big" onClick={() => go(active ? `/trip/${active.id}` : '/trips')}>
          {active ? `▶ ${t('home.continue')}` : `🚀 ${t('home.start')}`}
        </button>
      </section>

      <Mascot mood={firstTime ? 'welcome' : online ? 'idle' : 'offline'} />

      <section className="card">
        <XPBar xp={profile.xp} />
        <div className="stat-row" style={{ marginTop: 12 }}>
          <a className="stat" href={href('/passport')} style={{ color: 'inherit', textDecoration: 'none' }}><b>{Object.keys(profile.stamps).length}</b><span className="small">{t('home.stamps')}</span></a>
          <div className="stat"><b>{Object.keys(profile.badges).length}</b><span className="small">{t('home.badges')}</span></div>
          <div className="stat"><b>{profile.daily.streak}🔥</b><span className="small">{t('home.streak')}</span></div>
        </div>
      </section>

      <section>
        <h2>{t('home.chooseRide')}</h2>
        <div className="modes">
          {MODES.map((m) => (
            <a key={m} className="mode-card" href={href(`/plan/${m}`)} style={{ '--mc': MODE_META[m].color } as React.CSSProperties}>
              <span className="emo" aria-hidden="true">{MODE_META[m].emoji}</span>{modeLabel(m)}
            </a>
          ))}
        </div>
      </section>

      <section>
        <h2>{t('legend.home.title')}</h2>
        <p className="small dim" style={{ marginTop: -6 }}>{t('legend.home.sub')}</p>
        <div className="legend-row">
          {LEGENDS.map((l) => {
            const j = JOURNEYS.find((x) => x.id === l.journey);
            if (!j) return null;
            return (
              <a key={l.journey} className="legend-card" href={href(`/plan/${j.mode}?j=${j.id}`)}>
                <span className="emo" aria-hidden="true">{l.emoji}</span>
                <b>{journeyTitle(j)}</b>
                <span className="small">{MODE_META[j.mode].emoji} {modeLabel(j.mode)}</span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="grid grid-2">
        <a className="tile card gold" href={href('/quiz/daily')} style={{ color: 'var(--ink)' }}>
          <span className="ti">📅</span>
          <span className="grow"><b>{t('home.daily')}</b><span className="small dim">{playedToday ? t('home.dailyDone', { score: profile.daily.scores[todayKey()] }) : t('home.dailyPitch')}</span></span>
          <span className="pill gold">{playedToday ? '✓' : t('home.go')}</span>
        </a>
        <a className="tile" href={href('/play')}>
          <span className="ti">🌍</span>
          <span className="grow"><b>{t('home.tour')}</b><span className="small dim">{t('home.tourUnlocked', { n: TOUR.filter((x) => isRegionUnlocked(profile, x.region)).length, total: TOUR.length })}</span></span>
          <span aria-hidden="true" className="chev">›</span>
        </a>
      </section>

      <section className="stack">
        <div className="row spread"><h2 style={{ margin: 0 }}>{t('home.yourWorld')}</h2><span className="small dim">{t('home.legend')}</span></div>
        {world && (
          <Suspense fallback={<div className="map-wrap"><div className="map" /></div>}>
            <WorldMap world={world} visited={visited} locked={locked} label={t('home.mapLabel')} onCountryClick={(iso) => iso && go(`/country/${iso}`)} />
          </Suspense>
        )}
      </section>
    </div>
  );
}
