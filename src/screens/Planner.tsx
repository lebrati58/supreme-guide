import { useEffect, useState } from 'react';
import type { Airport, FlightInfo, Mode, Stop, Trip } from '../types';
import { MODES } from '../types';
import { useApp } from '../state';
import { JOURNEYS, SAMPLE_FLIGHTS, type CuratedJourney } from '../content/journeys';
import { createTrip, MODE_META } from '../transport/trips';
import { PlaceSearch } from '../components/PlaceSearch';
import { buildSchedule, estimateBlockMinutes, normaliseFlightNumber } from '../transport/flight';
import { lookupConfigured, lookupFlight } from '../transport/flightLookup';
import { loadAirports } from '../data/loaders';
import { store } from '../storage/db';
import { go, href } from '../router';
import { haversineKm } from '../geo/geo';
import { formatDuration, formatLocal } from '../transport/time';
import { Mascot } from '../components/Mascot';

export default function Planner({ mode }: { mode: Mode }) {
  const meta = MODE_META[mode];
  const curated = JOURNEYS.filter((j) => j.mode === mode);
  return (
    <div className="page stack">
      <div className="chips" role="tablist" aria-label="Transport mode">
        {MODES.map((m) => <a key={m} role="tab" aria-selected={m === mode} className={`chip ${m === mode ? 'on' : ''}`} href={href(`/plan/${m}`)}>{MODE_META[m].emoji} {MODE_META[m].label}</a>)}
      </div>
      <h1>{meta.emoji} {meta.label} mode</h1>
      {mode === 'flight' ? <FlightForm /> : mode === 'walk' ? <WalkForm /> : <GroundForm mode={mode} />}
      {curated.length > 0 && (
        <section className="stack">
          <h2>Real journeys to try</h2>
          <div className="grid grid-2">{curated.map((j) => <CuratedTile key={j.id} j={j} />)}</div>
        </section>
      )}
    </div>
  );
}

function useCreate() {
  const { getIndex, useMode, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const create = async (args: Omit<Parameters<typeof createTrip>[0], 'index'>) => {
    setBusy(true);
    try {
      const trip = await createTrip({ ...args, index: await getIndex() });
      await store.putTrip(trip);
      useMode(args.mode);
      go(`/trip/${trip.id}`);
    } catch (e) {
      toast({ icon: '⚠️', title: 'Could not create the trip', body: e instanceof Error ? e.message : String(e) });
    } finally { setBusy(false); }
  };
  return { create, busy };
}

function CuratedTile({ j }: { j: CuratedJourney }) {
  const { create, busy } = useCreate();
  const [role, setRole] = useState<Trip['role'] | null>(null);
  return (
    <div className="card">
      <h3>{MODE_META[j.mode].emoji} {j.title}</h3>
      <p className="dim small">{j.blurb}</p>
      <p className="small">{j.stops.filter((s) => !s.note).map((s) => s.name).join(' → ')}</p>
      {j.mode === 'car' && <RolePicker role={role} setRole={setRole} />}
      <button className="btn small blue" disabled={busy || (j.mode === 'car' && !role)} onClick={() => create({ mode: j.mode, title: j.title, stops: j.stops, label: j.label, curatedId: j.id, role: role ?? undefined })}>
        {busy ? 'Preparing…' : `${MODE_META[j.mode].verb} this route →`}
      </button>
    </div>
  );
}

function RolePicker({ role, setRole }: { role: Trip['role'] | null; setRole: (r: Trip['role']) => void }) {
  return (
    <div className="field" role="radiogroup" aria-label="Who is playing?">
      <label>Who is playing? (required)</label>
      <div className="chips">
        <button type="button" className={`chip ${role === 'passenger' ? 'on' : ''}`} onClick={() => setRole('passenger')}>🧑‍🤝‍🧑 I’m a passenger</button>
        <button type="button" className={`chip ${role === 'driver' ? 'on' : ''}`} onClick={() => setRole('driver')}>🚗 I’m the driver</button>
      </div>
      {role === 'driver' && <p className="notice warn small">Drivers must never play while driving. The game locks itself whenever GPS detects the car is moving, and only unlocks when you are stopped.</p>}
    </div>
  );
}

// ------------------------------------------------------------------ flight
function todayIso() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

function FlightForm() {
  const { online } = useApp();
  const { create, busy } = useCreate();
  const [num, setNum] = useState('');
  const [date, setDate] = useState(todayIso());
  const [from, setFrom] = useState<{ s: Stop; a: Airport } | null>(null);
  const [to, setTo] = useState<{ s: Stop; a: Airport } | null>(null);
  const [dep, setDep] = useState('');
  const [arr, setArr] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [allAp, setAllAp] = useState<Airport[]>([]);
  useEffect(() => { loadAirports().then(setAllAp); }, []);

  const km = from && to ? haversineKm([from.a.lng, from.a.lat], [to.a.lng, to.a.lat]) : 0;
  const estMin = km ? estimateBlockMinutes(km) : 0;

  const lookup = async () => {
    setMsg('Looking up…');
    const r = await lookupFlight(num, date);
    setMsg(r.message ?? (r.status === 'found' ? 'Schedule found — please double-check it against your boarding pass.' : null));
    if (r.status === 'found') {
      const fa = allAp.find((a) => a.iata === r.from), ta = allAp.find((a) => a.iata === r.to);
      if (fa) setFrom({ a: fa, s: { name: `${fa.name} (${fa.iata})`, lat: fa.lat, lng: fa.lng, cc: fa.cc } });
      if (ta) setTo({ a: ta, s: { name: `${ta.name} (${ta.iata})`, lat: ta.lat, lng: ta.lng, cc: ta.cc } });
      if (r.depLocal) setDep(r.depLocal);
      if (r.arrLocal) setArr(r.arrLocal);
    }
  };

  const demoNow = () => {
    if (!from) return;
    const now = Date.now() - 10 * 60000; // departed 10 minutes ago
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: from.a.tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(now));
    const g = (t: string) => p.find((x) => x.type === t)!.value;
    setDate(`${g('year')}-${g('month')}-${g('day')}`);
    setDep(`${g('hour')}:${g('minute')}`);
    setArr('');
  };

  const submit = () => {
    if (!from || !to || !dep) return;
    const sched = buildSchedule(from.a, to.a, { date, depLocal: dep, arrLocal: arr || undefined });
    const flight: FlightInfo = {
      number: normaliseFlightNumber(num) ?? undefined, from: from.a.iata, to: to.a.iata, date, depLocal: dep,
      arrLocal: arr || formatLocal(sched.arrUtc, to.a.tz), depUtc: sched.depUtc, arrUtc: sched.arrUtc, delayMin: 0,
      scheduleSource: sched.estimated ? 'estimated' : 'player',
    };
    const title = `${flight.number ? flight.number + ' · ' : ''}${from.a.iata} → ${to.a.iata}`;
    void create({ mode: 'flight', title, stops: [from.s, to.s], flight, label: flight.number });
  };

  return (
    <div className="card paper stack">
      <Mascot mood="takeoff" text="Enter your flight before boarding, then download it: I’ll follow the schedule even in airplane mode." />
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label htmlFor="fno">Flight number (optional)</label>
          <input id="fno" className="input" value={num} onChange={(e) => setNum(e.target.value.toUpperCase())} placeholder="e.g. AF1234" maxLength={8} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 150 }}>
          <label htmlFor="fdate">Departure date (local)</label>
          <input id="fdate" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      {num && (
        <div className="row">
          <button className="btn small blue" type="button" onClick={lookup} disabled={!online || !normaliseFlightNumber(num)}>🔎 Look up {normaliseFlightNumber(num) ?? 'flight'}</button>
          {!lookupConfigured() && <span className="small dim">Live lookup not connected yet — enter details below.</span>}
        </div>
      )}
      {msg && <p className="notice small">{msg}</p>}
      <PlaceSearch label="From airport" airports value={from?.s ?? null} placeholder="City, airport or IATA code (e.g. CDG)" onChange={(s, a) => setFrom(s && a ? { s, a } : null)} />
      <PlaceSearch label="To airport" airports value={to?.s ?? null} placeholder="City, airport or IATA code (e.g. JFK)" onChange={(s, a) => setTo(s && a ? { s, a } : null)} />
      <div className="row">
        <div className="field" style={{ flex: 1, minWidth: 140 }}>
          <label htmlFor="fdep">Departure time ({from?.a.iata ?? 'origin'} local)</label>
          <input id="fdep" type="time" className="input" value={dep} onChange={(e) => setDep(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 140 }}>
          <label htmlFor="farr">Arrival time ({to?.a.iata ?? 'destination'} local)</label>
          <input id="farr" type="time" className="input" value={arr} onChange={(e) => setArr(e.target.value)} />
        </div>
      </div>
      {km > 0 && <p className="small dim">Great-circle distance {Math.round(km).toLocaleString('en-US')} km. {arr ? '' : `No arrival time: I’ll estimate about ${formatDuration(estMin * 60000)} and label it as an estimate.`}</p>}
      <div className="row">
        <button className="btn" disabled={!from || !to || !dep || busy || from?.a.iata === to?.a.iata} onClick={submit}>✈️ {busy ? 'Preparing…' : 'Create my flight'}</button>
        <button className="btn ghost small" type="button" disabled={!from} onClick={demoNow} title="Fill the departure time with 'ten minutes ago' to see the in-flight experience">🎮 Demo: departed 10 min ago</button>
      </div>
      <div className="small dim">Try: {SAMPLE_FLIGHTS.map((f) => `${f.from}→${f.to}`).join(' · ')}</div>
    </div>
  );
}

// ------------------------------------------------------------------ ground modes
function GroundForm({ mode }: { mode: Exclude<Mode, 'flight' | 'walk'> }) {
  const { create, busy } = useCreate();
  const [stops, setStops] = useState<(Stop | null)[]>([null, null]);
  const [label, setLabel] = useState('');
  const [role, setRole] = useState<Trip['role'] | null>(null);
  const [busType, setBusType] = useState('Long-distance');
  const [when, setWhen] = useState('');
  const [hours, setHours] = useState('');
  const set = (i: number, s: Stop | null) => setStops((x) => x.map((y, k) => (k === i ? s : y)));
  const ready = stops.every(Boolean) && (mode !== 'car' || role);
  const names: Record<string, [string, string]> = { train: ['Departure station / city', 'Arrival station / city'], bus: ['Departure', 'Arrival'], car: ['Start', 'Destination'], cruise: ['Departure port', 'Final port'] };
  const submit = () => {
    const st = stops as Stop[];
    const depUtc = when ? new Date(when).getTime() : undefined;
    const arrUtc = depUtc && Number(hours) > 0 ? depUtc + Number(hours) * 3600000 : undefined;
    const title = `${st[0].name} → ${st[st.length - 1].name}`;
    void create({ mode, title, stops: st, label: [label, mode === 'bus' ? busType : ''].filter(Boolean).join(' · ') || undefined, role: role ?? undefined, depUtc, arrUtc });
  };
  return (
    <div className="card paper stack">
      {mode === 'car' && <Mascot mood="driver" text="Road trip! Passengers play, drivers drive. I insist — I’m very strict about it." />}
      {mode === 'cruise' && <Mascot mood="idle" text="Ahoy! Add your ports in order. I draw port-to-port lines — the ship’s real course will differ." />}
      {stops.map((s, i) => (
        <div key={i} className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <PlaceSearch label={i === 0 ? names[mode][0] : i === stops.length - 1 ? names[mode][1] : `Stop ${i}`} value={s} onChange={(v) => set(i, v)} />
          </div>
          {i > 0 && i < stops.length - 1 && <button className="btn small red" type="button" aria-label={`Remove stop ${i}`} onClick={() => setStops((x) => x.filter((_, k) => k !== i))}>✕</button>}
        </div>
      ))}
      <button className="link-btn" style={{ color: 'var(--sky-2)', justifySelf: 'start' }} type="button" onClick={() => setStops((x) => [...x.slice(0, -1), null, x[x.length - 1]])}>+ Add a stop</button>
      {(mode === 'train' || mode === 'bus') && (
        <div className="field">
          <label htmlFor="lbl">{mode === 'train' ? 'Train number (optional)' : 'Bus line (optional)'}</label>
          <input id="lbl" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={mode === 'train' ? 'e.g. TGV 6101' : 'e.g. Line 42'} />
          <span className="small" style={{ color: 'var(--ink-2)' }}>Saved as a label. Live train/bus timetables need a provider and are not connected yet.</span>
        </div>
      )}
      {mode === 'bus' && (
        <div className="chips">{['Long-distance', 'City bus', 'Sightseeing tour'].map((b) => <button key={b} type="button" className={`chip ${busType === b ? 'on' : ''}`} onClick={() => setBusType(b)}>{b}</button>)}</div>
      )}
      <div className="row">
        <div className="field" style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor="when">Departure (optional)</label>
          <input id="when" type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 120 }}>
          <label htmlFor="hrs">Duration in hours (optional)</label>
          <input id="hrs" type="number" min="0.1" step="0.1" className="input" value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>
      </div>
      {mode === 'car' && <RolePicker role={role} setRole={setRole} />}
      <button className="btn" disabled={!ready || busy} onClick={submit}>{MODE_META[mode].emoji} {busy ? 'Computing route…' : 'Create my journey'}</button>
    </div>
  );
}

// ------------------------------------------------------------------ walking
function WalkForm() {
  const { create, busy } = useCreate();
  const { update, profile } = useApp();
  const [city, setCity] = useState<Stop | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const aroundMe = () => {
    setErr(null);
    if (!('geolocation' in navigator)) { setErr('Geolocation is not available on this device.'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        update((x) => { x.settings.gpsConsent = true; });
        const here: Stop = { name: 'My position', lat: p.coords.latitude, lng: p.coords.longitude };
        void create({ mode: 'walk', title: 'Exploring around me', stops: [here, { ...here, name: 'Wherever curiosity leads' }] });
      },
      (e) => setErr(e.code === 1 ? 'Location permission denied. You can still explore a city below.' : 'Could not get your position.'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  return (
    <div className="card paper stack">
      <Mascot mood="idle" text="Walking mode: I’ll quiz you when you get close to landmarks. Your location stays on your device." />
      <button className="btn green" disabled={busy} onClick={aroundMe}>📍 Explore around me {profile.settings.gpsConsent ? '' : '(asks for location)'}</button>
      {err && <p className="notice warn small">{err}</p>}
      <p className="small" style={{ color: 'var(--ink-2)', margin: 0 }}>…or explore a city without GPS:</p>
      <PlaceSearch label="City" value={city} onChange={setCity} />
      <button className="btn blue" disabled={!city || busy} onClick={() => city && create({ mode: 'walk', title: `Exploring ${city.name}`, stops: [city, { ...city, name: city.name }] })}>🚶 Explore {city?.name ?? 'this city'}</button>
    </div>
  );
}
