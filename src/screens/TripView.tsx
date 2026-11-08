import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LngLat, Question, Trip, WikiCard } from '../types';
import { useApp } from '../state';
import { store, requestPersistence } from '../storage/db';
import { GEOMETRY_NOTE, MODE_META, stopFractions } from '../transport/trips';
import { flightStatus } from '../transport/flight';
import { formatDuration, formatLocal } from '../transport/time';
import { loadAirports } from '../data/loaders';
import { haversineKm, locateOnPath, pointAlong } from '../geo/geo';
import { buildSession } from '../game/engine';
import { mulberry32, hashString } from '../game/rng';
import { buildWikiPack, nearestCard, wikiNearby, wikiSummary } from '../transport/wiki';
import { LANDMARKS } from '../content/landmarks';
import { Quiz, type QuizResult } from '../components/Quiz';
import { Mascot } from '../components/Mascot';
import { Confetti, Modal } from '../components/Bits';
import { go, href } from '../router';
import type { MapMarker } from '../map/WorldMap';
import type { Mood } from '../game/mascot';

const WorldMap = lazy(() => import('../map/WorldMap'));

interface Geo { pos: LngLat; accuracy: number; speed: number | null; at: number }

function useGeo(enabled: boolean) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || !('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => { setError(null); setGeo({ pos: [p.coords.longitude, p.coords.latitude], accuracy: p.coords.accuracy, speed: p.coords.speed, at: p.timestamp }); },
      (e) => setError(e.code === 1 ? 'Location permission denied.' : 'No GPS signal (normal inside a plane or tunnel).'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);
  return { geo, error };
}

function useNow(ms = 15000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

export default function TripView({ id }: { id: string }) {
  const app = useApp();
  const { byIso3, getWorld50, online, profile, stamp, update, toast, game } = app;
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined);
  const [world, setWorld] = useState<Awaited<ReturnType<typeof getWorld50>> | null>(null);
  const [tz, setTz] = useState<{ from?: string; to?: string }>({});
  const [gpsOn, setGpsOn] = useState(false);
  const [quiz, setQuiz] = useState<Question[] | null>(null);
  const [done, setDone] = useState<QuizResult | null>(null);
  const [mood, setMood] = useState<Mood>('takeoff');
  const [packing, setPacking] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [parkedAt, setParkedAt] = useState(0);
  const [card, setCard] = useState<WikiCard | null>(null);
  const [detailed, setDetailed] = useState(false);
  const now = useNow(trip?.mode === 'flight' ? 15000 : 30000);
  const { geo, error: geoErr } = useGeo(gpsOn);
  const discovered = useRef(new Set<string>());

  useEffect(() => { store.getTrip(id).then((t) => setTrip(t ?? null)); getWorld50().then(setWorld).catch(() => {}); }, [id, getWorld50]);
  useEffect(() => {
    if (trip?.flight) loadAirports().then((a) => setTz({ from: a.find((x) => x.iata === trip.flight!.from)?.tz, to: a.find((x) => x.iata === trip.flight!.to)?.tz }));
  }, [trip?.flight]);

  const save = useCallback((fn: (t: Trip) => void) => {
    setTrip((cur) => {
      if (!cur) return cur;
      const next = structuredClone(cur);
      fn(next);
      void store.putTrip(next);
      return next;
    });
  }, []);

  const explore = !!trip && trip.distanceKm < 0.2; // walking “explore around” mode
  const fractions = useMemo(() => (trip ? stopFractions(trip) : []), [trip]);

  // ------------------------------------------------ progress (GPS > schedule > manual)
  const progress = useMemo(() => {
    if (!trip) return { fraction: 0, source: 'manual' as const, position: [0, 0] as LngLat };
    if (geo && !explore) {
      const loc = locateOnPath(trip.geometry, geo.pos);
      const tol = trip.mode === 'walk' ? 1 : trip.mode === 'flight' ? 300 : 40;
      if (loc.offKm < tol) return { fraction: loc.fraction, source: 'gps' as const, position: geo.pos };
    }
    if (trip.flight) {
      const st = flightStatus(trip.flight, trip.geometry, now);
      return { fraction: st.fraction, source: 'schedule' as const, position: st.position, status: st };
    }
    if (trip.depUtc && trip.arrUtc) {
      const f = Math.min(1, Math.max(0, (now - trip.depUtc) / (trip.arrUtc - trip.depUtc)));
      return { fraction: f, source: 'schedule' as const, position: pointAlong(trip.geometry, f) };
    }
    const f = trip.progress ?? 0;
    return { fraction: f, source: 'manual' as const, position: explore && geo ? geo.pos : pointAlong(trip.geometry, f) };
  }, [trip, geo, now, explore]);

  useEffect(() => {
    if (trip && Math.abs((trip.progress ?? 0) - progress.fraction) > 0.01 && progress.source !== 'manual') save((t) => { t.progress = progress.fraction; });
  }, [progress.fraction, progress.source]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentIdx = useMemo(() => {
    if (!trip?.countries.length) return -1;
    let k = 0;
    trip.countries.forEach((c, i) => { if (c.at <= progress.fraction + 1e-6) k = i; });
    return k;
  }, [trip, progress.fraction]);
  const current = trip && currentIdx >= 0 ? byIso3.get(trip.countries[currentIdx].iso3) : undefined;

  // ------------------------------------------------ driver safety lock
  const moving = !!geo && (geo.speed ?? 0) > 5; // > 18 km/h
  const driver = trip?.role === 'driver';
  const parked = Date.now() - parkedAt < 10 * 60000;
  // Driver: locked while moving; without a GPS fix, only a recent “I’m parked” confirmation unlocks.
  const locked = driver && (moving || (!geo && !parked));

  // ------------------------------------------------ POIs
  const pois = useMemo(() => {
    if (!trip) return [];
    const near = (lng: number, lat: number) => {
      const r = explore ? 5 : trip.mode === 'flight' ? 80 : 25;
      return explore ? haversineKm(trip.geometry[0], [lng, lat]) < r : locateOnPath(trip.geometry, [lng, lat]).offKm < r;
    };
    return LANDMARKS.filter((l) => near(l.lng, l.lat));
  }, [trip, explore]);

  // walking: proximity discovery
  useEffect(() => {
    if (!trip || trip.mode !== 'walk' || !geo) return;
    const candidates = [...pois.map((l) => ({ key: l.id, title: l.wiki, lat: l.lat, lng: l.lng })), ...(trip.wiki ?? []).filter((w) => w.lat !== undefined).map((w) => ({ key: w.title, title: w.title, lat: w.lat!, lng: w.lng! }))];
    for (const c of candidates) {
      if (discovered.current.has(c.key)) continue;
      if (haversineKm(geo.pos, [c.lng, c.lat]) < 0.15) {
        discovered.current.add(c.key);
        const cached = trip.wiki?.find((w) => w.title === c.title || w.title === decodeURIComponent(c.title).replace(/_/g, ' '));
        if (cached) setCard(cached); else void wikiSummary(c.title).then((s) => s && setCard(s));
        toast({ icon: '📍', title: 'You discovered a place!', body: 'Open its card and take the quiz.' });
        break;
      }
    }
  }, [geo, pois, trip, toast]);

  // walking explore: fetch nearby wiki POIs once when online
  useEffect(() => {
    if (!trip || !explore || !online || (trip.wiki && trip.wiki.length)) return;
    void (async () => {
      const near = await wikiNearby(trip.geometry[0], 3000, 15);
      const cards = (await Promise.all(near.slice(0, 12).map((n) => wikiSummary(n.title)))).filter((x): x is WikiCard => !!x)
        .map((c) => { const n = near.find((x) => x.title === c.title); return { ...c, lat: c.lat ?? n?.lat, lng: c.lng ?? n?.lng }; });
      if (cards.length) save((t) => { t.wiki = cards; });
    })();
  }, [trip?.id, explore, online]); // eslint-disable-line react-hooks/exhaustive-deps

  if (trip === undefined) return <div className="page"><p>Loading your trip…</p></div>;
  if (trip === null) return <div className="page"><h1>Trip not found</h1><a className="btn" href={href('/trips')}>Back to trips</a></div>;

  const meta = MODE_META[trip.mode];
  const st = 'status' in progress ? progress.status : undefined;
  const nearCard = trip.wiki ? nearestCard(trip.wiki, progress.position) : null;

  const markers: MapMarker[] = [
    ...(explore ? [] : trip.stops.filter((s) => !s.note).map((s, i, arr) => ({ id: `s${i}`, lngLat: [s.lng, s.lat] as LngLat, kind: (i === arr.length - 1 || i === 0 ? 'end' : 'stop') as MapMarker['kind'], label: s.name }))),
    ...pois.map((l) => ({ id: l.id, lngLat: [l.lng, l.lat] as LngLat, kind: 'poi' as const, emoji: l.emoji, label: `${l.name} — ${l.fact}` })),
    ...(trip.wiki ?? []).filter((w) => w.lat !== undefined && explore).map((w) => ({ id: w.title, lngLat: [w.lng!, w.lat!] as LngLat, kind: 'poi' as const, emoji: '📖', label: w.title, onClick: () => setCard(w) })),
    ...(!explore && progress.fraction > 0 && progress.fraction < 1 && progress.source !== 'gps' ? [{ id: 'veh', lngLat: progress.position, kind: 'vehicle' as const, emoji: meta.emoji, estimated: true, label: 'Estimated position (from schedule) — not a live position' }] : []),
    ...(geo ? [{ id: 'gps', lngLat: geo.pos, kind: 'gps' as const, label: `Your GPS position (±${Math.round(geo.accuracy)} m)` }] : []),
  ];

  const startQuiz = () => {
    const focus = trip.countries.slice(Math.max(0, currentIdx), currentIdx + 3).map((c) => c.iso3);
    const qs = buildSession(game, {
      count: 6, rnd: mulberry32(hashString(trip.id + (trip.answeredIds?.length ?? 0) + Date.now())), focus: focus.length ? focus : undefined,
      exclude: new Set(trip.answeredIds), surpriseRate: 0.12, focusRate: 0.9, maxDifficulty: profile.kidMode ? 2 : undefined,
    });
    setDone(null); setQuiz(qs);
    setTimeout(() => document.getElementById('stage')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const finishQuiz = (r: QuizResult) => {
    setQuiz(null); setDone(r);
    save((t) => { t.answeredIds = [...(t.answeredIds ?? []), ...r.answers.map((a) => a.id)]; });
    const reached = trip.countries.filter((_c, i) => i <= Math.max(0, currentIdx)).map((c) => c.iso3);
    const added = stamp(reached, trip.mode);
    added.forEach((iso) => toast({ icon: byIso3.get(iso)?.flag || '🛂', title: `Passport stamp: ${byIso3.get(iso)?.name ?? iso}`, body: 'Added to your passport.' }));
    setMood(r.correct === r.total ? 'perfect' : 'idle');
  };

  const complete = () => {
    save((t) => { t.completedAt = Date.now(); t.progress = 1; });
    stamp(trip.countries.map((c) => c.iso3), trip.mode);
    update((p) => { p.stats.tripsCompleted++; });
    setMood('landing'); setCelebrate((c) => c + 1);
  };

  const download = async () => {
    setPacking('Preparing…');
    await requestPersistence();
    try {
      const titles = pois.map((l) => decodeURIComponent(l.wiki).replace(/_/g, ' '));
      const cards = online ? await buildWikiPack(trip.geometry, titles, (d, n) => setPacking(`Downloading places ${d}/${n}…`)) : [];
      // Warm landmark photos & question images too.
      save((t) => { t.wiki = cards.length ? cards : t.wiki; t.packAt = Date.now(); });
      toast({ icon: '📦', title: 'Trip ready offline', body: `${cards.length} place cards saved. Quizzes, map outline and progress work without connection.` });
    } finally { setPacking(null); }
  };

  return (
    <div className="page stack">
      {celebrate > 0 && <Confetti key={celebrate} />}
      {locked && <DriverLock moving={moving} gps={gpsOn} onEnableGps={() => setGpsOn(true)} onParked={() => setParkedAt(Date.now())} />}
      <div className="row spread">
        <a className="link-btn" href={href('/trips')}>← Trips</a>
        <div className="row">
          {trip.packAt ? <span className="pill on">📦 Ready offline</span> : <span className="pill">Not downloaded</span>}
        </div>
      </div>
      <h1>{meta.emoji} {trip.title}</h1>
      <p className="dim small" style={{ marginTop: -6 }}>
        {trip.label && <>{trip.label} · </>}{trip.distanceKm.toLocaleString('en-US')} km · {GEOMETRY_NOTE[trip.geometrySource]}
      </p>

      <Mascot mood={trip.completedAt ? 'landing' : driver ? 'driver' : online ? mood : 'offline'} nonce={done ? 1 : 0} />

      {world && (
        <div style={{ position: 'relative' }}>
          <Suspense fallback={<div className="map-wrap"><div className="map tall" /></div>}>
            <WorldMap world={world} route={explore ? undefined : trip.geometry} progress={progress.fraction} markers={markers} fit="route" tall detailed={detailed && online}
              highlight={new Set(trip.countries.map((c) => c.iso3))} visited={new Set(Object.keys(profile.stamps))} label={`Map of ${trip.title}`} />
          </Suspense>
          <div className="map-overlay tl">
            {progress.source === 'gps' ? <span className="map-badge gps">🛰️ GPS position</span>
              : progress.source === 'schedule' ? <span className="map-badge est">⏱ Estimated from schedule</span>
              : !explore ? <span className="map-badge">✋ Manual progress</span> : null}
          </div>
          <div className="map-overlay tr">
            <button className="chip" style={{ background: 'rgba(11,31,77,.85)' }} disabled={!online} onClick={() => setDetailed((d) => !d)} title={online ? '' : 'Detailed map needs a connection'}>
              {detailed && online ? '🗺️ Simple' : '🛣️ Detailed'}
            </button>
          </div>
        </div>
      )}

      {/* ------------- status */}
      <section className="card stack">
        {trip.flight && st && (
          <>
            <div className="row spread">
              <b className="display" style={{ fontSize: 22 }}>{st.phase === 'before' ? '🛫 Before departure' : st.phase === 'enroute' ? '✈️ In flight (estimated)' : '🛬 Arrived (scheduled)'}</b>
              <span className="pill">{Math.round(progress.fraction * 100)}%</span>
            </div>
            <div className="xp-bar"><i style={{ width: `${progress.fraction * 100}%` }} /></div>
            <div className="small">
              {trip.flight.from} {tz.from ? formatLocal(trip.flight.depUtc + trip.flight.delayMin * 60000, tz.from, true) : trip.flight.depLocal} → {trip.flight.to} {tz.to ? formatLocal(trip.flight.arrUtc + trip.flight.delayMin * 60000, tz.to, true) : trip.flight.arrLocal}
              {trip.flight.delayMin ? ` · delay +${trip.flight.delayMin} min` : ''}
              {st.phase === 'before' && ` · departs in ${formatDuration(trip.flight.depUtc + trip.flight.delayMin * 60000 - now)}`}
              {st.phase === 'enroute' && ` · about ${formatDuration(st.remainingMs)} to go`}
            </div>
            {trip.flight.scheduleSource === 'estimated' && <p className="notice small">Arrival time is estimated from distance (~830 km/h + 30 min). Edit delays below if needed.</p>}
            <p className="small dim" style={{ margin: 0 }}>Position = schedule-based estimate along the shortest path. It is not live tracking. Real routes and timings vary.</p>
            <div className="chips">
              {[15, 30, 60].map((m) => <button key={m} className="chip" onClick={() => save((t) => { t.flight!.delayMin += m; })}>+{m} min delay</button>)}
              {trip.flight.delayMin !== 0 && <button className="chip" onClick={() => save((t) => { t.flight!.delayMin = 0; })}>Reset delay</button>}
            </div>
          </>
        )}
        {!trip.flight && !explore && (
          <>
            <div className="row spread"><b className="display" style={{ fontSize: 22 }}>{trip.completedAt ? '🏁 Journey complete' : `${meta.emoji} On the way`}</b><span className="pill">{Math.round(progress.fraction * 100)}%</span></div>
            <div className="xp-bar"><i style={{ width: `${progress.fraction * 100}%` }} /></div>
            {progress.source === 'manual' && (
              <div className="field">
                <label htmlFor="at">Where are you now?</label>
                <select id="at" className="input" value={nearestStopIndex(fractions, progress.fraction)} onChange={(e) => save((t) => { t.progress = fractions[Number(e.target.value)]; })}>
                  {trip.stops.map((s, i) => <option key={i} value={i}>{s.name}{s.note ? ` (${s.note})` : ''}</option>)}
                </select>
              </div>
            )}
          </>
        )}
        {explore && <p className="small">🚶 Walk around: landmarks and Wikipedia places near you appear on the map. Get within ~150 m with GPS on to discover them.</p>}
        <div className="row">
          <button className={`btn small ${gpsOn ? 'green' : 'ghost'}`} onClick={() => { setGpsOn((g) => !g); if (!gpsOn) update((p) => { p.settings.gpsConsent = true; }); }}>
            🛰️ {gpsOn ? 'GPS on' : 'Use GPS (optional)'}
          </button>
          {gpsOn && geo && <span className="small dim">±{Math.round(geo.accuracy)} m{geo.speed !== null ? ` · ${Math.round((geo.speed ?? 0) * 3.6)} km/h` : ''}</span>}
          {gpsOn && geoErr && <span className="small dim">{geoErr}</span>}
        </div>
      </section>

      {/* ------------- play */}
      <section id="stage" className="card gold stack" style={{ color: 'var(--ink)', scrollMarginTop: 70 }}>
        {quiz ? (
          <Quiz questions={quiz} title={current ? `${current.flag} Stage quiz · ${current.name}` : 'Stage quiz'} onFinish={finishQuiz} finishLabel="Collect stamps 🛂" />
        ) : (
          <>
            <h2 style={{ margin: 0 }}>{current ? <>{current.flag} {progress.source === 'schedule' && trip.flight ? 'Probably over' : 'Now in'} {current.name}</> : '🌊 Over water'}</h2>
            {done && <p style={{ margin: 0 }}><b>{done.correct}/{done.total}</b> correct · +{done.xp} XP</p>}
            <button className="btn big blue" disabled={locked} onClick={startQuiz}>🎯 {done ? 'Next stage quiz' : 'Play stage quiz'}</button>
            {!trip.completedAt && progress.fraction > 0.9 && <button className="btn green" onClick={complete}>🏁 I’ve arrived!</button>}
            {!trip.completedAt && progress.fraction <= 0.9 && <button className="link-btn" style={{ color: 'var(--ink)' }} onClick={complete}>Mark journey as complete</button>}
          </>
        )}
      </section>

      {/* ------------- countries timeline */}
      {trip.countries.length > 0 && !explore && (
        <section className="card stack">
          <h3>Countries along the way ({trip.countries.length})</h3>
          <div className="timeline">
            {trip.countries.map((c, i) => {
              const k = byIso3.get(c.iso3);
              const cls = i < currentIdx ? 'done' : i === currentIdx ? 'now' : '';
              return <a key={c.iso3} href={href(`/country/${c.iso3}`)} className={`tl ${cls}`} style={{ color: 'inherit', textDecoration: 'none' }}><span className="dot" />{k?.flag} {k?.name ?? c.iso3} <span className="dim small">· {Math.round(c.at * 100)}%</span></a>;
            })}
          </div>
          <p className="small dim" style={{ margin: 0 }}>Computed offline from Natural Earth borders along the drawn path; tiny territories may be missed.</p>
        </section>
      )}

      {/* ------------- did you know */}
      {(nearCard || (trip.wiki && trip.wiki.length > 0)) && (
        <section className="stack">
          <h3>📖 Did you know?</h3>
          {(explore ? trip.wiki!.slice(0, 6) : nearCard ? [nearCard] : []).map((w) => <WikiTile key={w.title} w={w} onOpen={() => setCard(w)} />)}
        </section>
      )}

      {/* ------------- offline */}
      <section className="card stack">
        <h3>📦 Offline pack</h3>
        <p className="small dim" style={{ margin: 0 }}>
          Always offline: the game, quizzes, the world outline map, your route and countries, the estimated progress.
          Download adds Wikipedia place cards and photos along the route. Detailed street maps are only cached for areas you already viewed online.
        </p>
        {trip.packAt && <p className="small">Downloaded {new Date(trip.packAt).toLocaleString()} · {trip.wiki?.length ?? 0} place cards.</p>}
        <button className="btn blue" disabled={!!packing || !online} onClick={download}>{packing ?? (trip.packAt ? '🔄 Refresh offline pack' : '⬇️ Download for offline')}</button>
        {!online && <p className="small dim">Connect to the internet to download.</p>}
      </section>

      <div className="row spread">
        <button className="link-btn" onClick={async () => { if (confirm('Delete this trip from this device?')) { await store.deleteTrip(trip.id); go('/trips'); } }}>Delete trip</button>
        <span className="small dim">Created {new Date(trip.createdAt).toLocaleDateString()}</span>
      </div>

      {card && (
        <Modal label={card.title} onClose={() => setCard(null)}>
          <h2>{card.title}</h2>
          {card.thumb && <img className="monument-photo" src={card.thumb} alt="" />}
          <p>{card.extract}</p>
          <p className="small"><a href={card.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-2)' }}>Wikipedia (CC BY-SA) ↗</a></p>
          <div className="row">
            <button className="btn" onClick={() => { setCard(null); startQuiz(); }}>🎯 Quiz me here</button>
            <button className="btn ghost small" style={{ color: 'var(--ink)' }} onClick={() => setCard(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function nearestStopIndex(fr: number[], f: number) {
  let best = 0;
  fr.forEach((x, i) => { if (Math.abs(x - f) < Math.abs(fr[best] - f)) best = i; });
  return best;
}

function WikiTile({ w, onOpen }: { w: WikiCard; onOpen: () => void }) {
  return (
    <button className="wiki-card" onClick={onOpen} style={{ border: 0, textAlign: 'left', cursor: 'pointer', font: 'inherit' }}>
      {w.thumb ? <img src={w.thumb} alt="" loading="lazy" /> : <div style={{ width: 84, height: 84, borderRadius: 12, background: '#dfe7f7', display: 'grid', placeItems: 'center', fontSize: 34 }}>📖</div>}
      <div><b>{w.title}</b><p>{w.extract}</p><span className="small" style={{ color: 'var(--ink-2)' }}>Wikipedia · CC BY-SA</span></div>
    </button>
  );
}

function DriverLock({ moving, gps, onEnableGps, onParked }: { moving: boolean; gps: boolean; onEnableGps: () => void; onParked: () => void }) {
  return (
    <div className="lock-screen" role="alertdialog" aria-label="Driver safety lock">
      <div className="stack" style={{ maxWidth: 420 }}>
        <div className="big">🛑</div>
        <h1>Eyes on the road!</h1>
        <p>{moving ? 'The vehicle is moving. The game is locked for the driver until you stop.' : gps ? 'Waiting for a GPS fix… I unlock automatically once I can see you are stopped.' : 'You told me you are the driver. Turn on GPS so I can unlock automatically when you are stopped — or confirm you are safely parked.'}</p>
        {!gps && <button className="btn green" onClick={onEnableGps}>🛰️ Turn on GPS safety lock</button>}
        {!moving && <button className="btn ghost" onClick={onParked}>🅿️ I’m safely parked (10 min)</button>}
        <p className="small dim">Tip: hand the phone to a passenger — they can play the whole trip.</p>
      </div>
    </div>
  );
}
