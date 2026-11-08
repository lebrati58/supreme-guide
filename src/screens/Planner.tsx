import { useEffect, useState } from 'react';
import type { Airport, FlightInfo, Mode, Stop, Trip } from '../types';
import { MODES } from '../types';
import { useApp } from '../state';
import { JOURNEYS, SAMPLE_FLIGHTS, type CuratedJourney } from '../content/journeys';
import { createTrip, MODE_META, modeLabel, useRouteLabel } from '../transport/trips';
import { PlaceSearch } from '../components/PlaceSearch';
import { buildSchedule, estimateBlockMinutes, normaliseFlightNumber } from '../transport/flight';
import { lookupConfigured, lookupFlight } from '../transport/flightLookup';
import { loadAirports } from '../data/loaders';
import { store } from '../storage/db';
import { go, href } from '../router';
import { haversineKm } from '../geo/geo';
import { formatDuration, formatLocal } from '../transport/time';
import { Mascot } from '../components/Mascot';
import { t, type Key } from '../i18n';
import { journeyBlurb, journeyStop, journeyTitle } from '../i18n/content';

export default function Planner({ mode }: { mode: Mode }) {
  const meta = MODE_META[mode];
  const curated = JOURNEYS.filter((j) => j.mode === mode);
  return (
    <div className="page stack">
      <div className="chips" role="tablist" aria-label={t('plan.modesAria')}>
        {MODES.map((m) => <a key={m} role="tab" aria-selected={m === mode} className={`chip ${m === mode ? 'on' : ''}`} href={href(`/plan/${m}`)}>{MODE_META[m].emoji} {modeLabel(m)}</a>)}
      </div>
      <h1>{meta.emoji} {t('plan.title', { mode: modeLabel(mode) })}</h1>
      {mode === 'flight' ? <FlightForm /> : mode === 'walk' ? <WalkForm /> : <GroundForm mode={mode} />}
      {curated.length > 0 && (
        <section className="stack">
          <h2>{t('plan.realJourneys')}</h2>
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
      toast({ icon: '⚠️', title: t('plan.errCreate'), body: e instanceof Error ? e.message : String(e) });
    } finally { setBusy(false); }
  };
  return { create, busy };
}

function CuratedTile({ j }: { j: CuratedJourney }) {
  const { create, busy } = useCreate();
  const [role, setRole] = useState<Trip['role'] | null>(null);
  return (
    <div className="card">
      <h3>{MODE_META[j.mode].emoji} {journeyTitle(j)}</h3>
      <p className="dim small">{journeyBlurb(j)}</p>
      <p className="small">{j.stops.map((s, i) => (s.note ? null : journeyStop(j.id, i, s))).filter(Boolean).join(' → ')}</p>
      {j.mode === 'car' && <RolePicker role={role} setRole={setRole} />}
      <button className="btn small blue" disabled={busy || (j.mode === 'car' && !role)} onClick={() => create({ mode: j.mode, title: j.title, stops: j.stops, label: j.label, curatedId: j.id, role: role ?? undefined })}>
        {busy ? t('plan.preparing') : useRouteLabel(j.mode)}
      </button>
    </div>
  );
}

function RolePicker({ role, setRole }: { role: Trip['role'] | null; setRole: (r: Trip['role']) => void }) {
  return (
    <div className="field" role="radiogroup" aria-label={t('role.label')}>
      <label>{t('role.label')}</label>
      <div className="chips">
        <button type="button" className={`chip ${role === 'passenger' ? 'on' : ''}`} onClick={() => setRole('passenger')}>{t('role.passenger')}</button>
        <button type="button" className={`chip ${role === 'driver' ? 'on' : ''}`} onClick={() => setRole('driver')}>{t('role.driver')}</button>
      </div>
      {role === 'driver' && <p className="notice warn small">{t('role.driverWarn')}</p>}
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
    setMsg(t('flight.lookingUp'));
    const r = await lookupFlight(num, date);
    setMsg(r.message ?? (r.status === 'found' ? t('flight.found') : null));
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
    const g = (x: string) => p.find((y) => y.type === x)!.value;
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

  const fno = normaliseFlightNumber(num);
  return (
    <div className="card paper stack">
      <Mascot mood="takeoff" text={t('flight.mascot')} />
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label htmlFor="fno">{t('flight.number')}</label>
          <input id="fno" className="input" value={num} onChange={(e) => setNum(e.target.value.toUpperCase())} placeholder={t('flight.numberPh')} maxLength={8} dir="ltr" />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 150 }}>
          <label htmlFor="fdate">{t('flight.date')}</label>
          <input id="fdate" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      {num && (
        <div className="row">
          <button className="btn small blue" type="button" onClick={lookup} disabled={!online || !fno}>🔎 {t('flight.lookup', { flight: fno ?? t('flight.flightWord') })}</button>
          {!lookupConfigured() && <span className="small dim">{t('flight.lookupOff')}</span>}
        </div>
      )}
      {msg && <p className="notice small">{msg}</p>}
      <PlaceSearch label={t('flight.from')} airports value={from?.s ?? null} inputId="ap-from" placeholder={t('flight.apPhFrom')} onChange={(s, a) => setFrom(s && a ? { s, a } : null)} />
      <PlaceSearch label={t('flight.to')} airports value={to?.s ?? null} inputId="ap-to" placeholder={t('flight.apPhTo')} onChange={(s, a) => setTo(s && a ? { s, a } : null)} />
      <div className="row">
        <div className="field" style={{ flex: 1, minWidth: 140 }}>
          <label htmlFor="fdep">{t('flight.depTime', { airport: from?.a.iata ?? t('flight.origin') })}</label>
          <input id="fdep" type="time" className="input" value={dep} onChange={(e) => setDep(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 140 }}>
          <label htmlFor="farr">{t('flight.arrTime', { airport: to?.a.iata ?? t('flight.destination') })}</label>
          <input id="farr" type="time" className="input" value={arr} onChange={(e) => setArr(e.target.value)} />
        </div>
      </div>
      {km > 0 && <p className="small dim">{t('flight.distance', { km: Math.round(km) })} {arr ? '' : t('flight.noArrival', { duration: formatDuration(estMin * 60000) })}</p>}
      <div className="row">
        <button className="btn" disabled={!from || !to || !dep || busy || from?.a.iata === to?.a.iata} onClick={submit}>✈️ {busy ? t('plan.preparing') : t('flight.create')}</button>
        <button className="btn ghost small" type="button" disabled={!from} onClick={demoNow} title={t('flight.demoTitle')}>🎮 {t('flight.demo')}</button>
      </div>
      <div className="small dim" dir="ltr">{t('flight.try')} {SAMPLE_FLIGHTS.map((f) => `${f.from}→${f.to}`).join(' · ')}</div>
    </div>
  );
}

// ------------------------------------------------------------------ ground modes
type Ground = Exclude<Mode, 'flight' | 'walk'>;
const BUS_TYPES: Key[] = ['bus.long', 'bus.city', 'bus.tour'];

function GroundForm({ mode }: { mode: Ground }) {
  const { create, busy } = useCreate();
  const [stops, setStops] = useState<(Stop | null)[]>([null, null]);
  const [label, setLabel] = useState('');
  const [role, setRole] = useState<Trip['role'] | null>(null);
  const [busType, setBusType] = useState<Key>('bus.long');
  const [when, setWhen] = useState('');
  const [hours, setHours] = useState('');
  const set = (i: number, s: Stop | null) => setStops((x) => x.map((y, k) => (k === i ? s : y)));
  const ready = stops.every(Boolean) && (mode !== 'car' || role);
  const submit = () => {
    const st = stops as Stop[];
    const depUtc = when ? new Date(when).getTime() : undefined;
    const arrUtc = depUtc && Number(hours) > 0 ? depUtc + Number(hours) * 3600000 : undefined;
    const title = `${st[0].name} → ${st[st.length - 1].name}`;
    void create({ mode, title, stops: st, label: [label, mode === 'bus' ? t(busType) : ''].filter(Boolean).join(' · ') || undefined, role: role ?? undefined, depUtc, arrUtc });
  };
  return (
    <div className="card paper stack">
      {mode === 'car' && <Mascot mood="driver" text={t('ground.carMascot')} />}
      {mode === 'cruise' && <Mascot mood="idle" text={t('ground.cruiseMascot')} />}
      {stops.map((s, i) => (
        <div key={i} className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <PlaceSearch label={i === 0 ? t(`plan.from.${mode}` as Key) : i === stops.length - 1 ? t(`plan.to.${mode}` as Key) : t('plan.stopN', { n: i })} value={s} onChange={(v) => set(i, v)} />
          </div>
          {i > 0 && i < stops.length - 1 && <button className="btn small red" type="button" aria-label={t('plan.removeStop', { n: i })} onClick={() => setStops((x) => x.filter((_, k) => k !== i))}>✕</button>}
        </div>
      ))}
      <button className="link-btn" style={{ color: 'var(--sky-2)', justifySelf: 'start' }} type="button" onClick={() => setStops((x) => [...x.slice(0, -1), null, x[x.length - 1]])}>{t('plan.addStop')}</button>
      {(mode === 'train' || mode === 'bus') && (
        <div className="field">
          <label htmlFor="lbl">{mode === 'train' ? t('plan.trainNumber') : t('plan.busLine')}</label>
          <input id="lbl" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={mode === 'train' ? t('plan.trainPh') : t('plan.busPh')} />
          <span className="small" style={{ color: 'var(--ink-2)' }}>{t('plan.labelNote')}</span>
        </div>
      )}
      {mode === 'bus' && (
        <div className="chips">{BUS_TYPES.map((b) => <button key={b} type="button" className={`chip ${busType === b ? 'on' : ''}`} onClick={() => setBusType(b)}>{t(b)}</button>)}</div>
      )}
      <div className="row">
        <div className="field" style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor="when">{t('plan.departure')}</label>
          <input id="when" type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 120 }}>
          <label htmlFor="hrs">{t('plan.duration')}</label>
          <input id="hrs" type="number" min="0.1" step="0.1" className="input" value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>
      </div>
      {mode === 'car' && <RolePicker role={role} setRole={setRole} />}
      <button className="btn" disabled={!ready || busy} onClick={submit}>{MODE_META[mode].emoji} {busy ? t('plan.computing') : t('plan.create')}</button>
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
    if (!('geolocation' in navigator)) { setErr(t('walk.noGeo')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        update((x) => { x.settings.gpsConsent = true; });
        const here: Stop = { name: t('walk.myPosition'), lat: p.coords.latitude, lng: p.coords.longitude };
        void create({ mode: 'walk', title: t('walk.exploringAround'), stops: [here, { ...here, name: t('walk.curiosity') }] });
      },
      (e) => setErr(e.code === 1 ? t('walk.denied') : t('walk.noPos')),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  return (
    <div className="card paper stack">
      <Mascot mood="idle" text={t('walk.mascot')} />
      <button className="btn green" disabled={busy} onClick={aroundMe}>📍 {t('walk.aroundMe')} {profile.settings.gpsConsent ? '' : t('walk.asksLocation')}</button>
      {err && <p className="notice warn small">{err}</p>}
      <p className="small" style={{ color: 'var(--ink-2)', margin: 0 }}>{t('walk.orCity')}</p>
      <PlaceSearch label={t('walk.city')} value={city} onChange={setCity} />
      <button className="btn blue" disabled={!city || busy} onClick={() => city && create({ mode: 'walk', title: t('walk.exploringCity', { city: city.name }), stops: [city, { ...city, name: city.name }] })}>🚶 {t('walk.exploreCity', { city: city?.name ?? t('walk.thisCity') })}</button>
    </div>
  );
}
