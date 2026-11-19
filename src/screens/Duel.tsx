import { useEffect, useMemo, useRef, useState } from 'react';
import type { Question } from '../types';
import { useApp } from '../state';
import { Mascot } from '../components/Mascot';
import { Confetti } from '../components/Bits';
import { Board, TeamBanner } from '../components/LiveBoard';
import { href } from '../router';
import { fmtNum, t, type Key } from '../i18n';
import { play } from '../game/sfx';
import { QUESTION_SECONDS, ranking, teamScores, type LiveMode, type LivePlayer } from '../live/logic';
import { liveQuestions } from '../live/questions';
import { Hotseat, type SeatPlayer } from '../live/hotseat';

type Phase = 'setup' | 'pass' | 'question' | 'reveal' | 'end';
const GUEST_AVATARS = ['🙂', '😎', '🤠', '🐸', '🐙', '🦉'];
const MAX = 6;

interface Props {
  /** On a trip: questions about the route (`n` wanted). Otherwise a general quiz. */
  build?: (n: number) => Question[];
  /** On a trip where this phone's player drives: that profile can't play. */
  driverProfileId?: string;
  onExit?: () => void;
}

/** Duel on one phone: players take turns on the same phone with the same questions — fully offline. */
export default function Duel({ build, driverProfileId, onExit }: Props) {
  const { game, profiles, profile, recordAnswer } = useApp();
  const [picked, setPicked] = useState<SeatPlayer[]>(() =>
    profiles.filter((p) => p.id !== driverProfileId).slice(0, 2).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, profileId: p.id })));
  const [guest, setGuest] = useState('');
  const [mode, setMode] = useState<LiveMode>('classic');
  const [count, setCount] = useState(8);
  const [phase, setPhase] = useState<Phase>('setup');
  const [qs, setQs] = useState<Question[]>([]);
  const [players, setPlayers] = useState<LivePlayer[]>([]);
  const [i, setI] = useState(0);
  const [right, setRight] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const seat = useRef<Hotseat | null>(null);
  const turn = useRef({ id: '', shown: 0, done: false });
  const streaks = useRef(new Map<string, number>());

  const current = phase === 'pass' || phase === 'question' ? seat.current?.queue()[0] : undefined;
  const q = qs[i];

  // ---------------------------------------------------------------- setup
  const toggle = (p: SeatPlayer) => setPicked((l) => (l.some((x) => x.id === p.id) ? l.filter((x) => x.id !== p.id) : l.length < MAX ? [...l, p] : l));
  const addGuest = () => {
    const name = guest.trim().slice(0, 24);
    if (!name || picked.length >= MAX) return;
    setPicked((l) => [...l, { id: `g${Date.now().toString(36)}${l.length}`, name, avatar: GUEST_AVATARS[l.length % GUEST_AVATARS.length] }]);
    setGuest('');
  };
  const moveTeam = (id: string) => setPicked((l) => l.map((p) => (p.id === id ? { ...p, team: p.team === 1 ? 0 : 1 } : p)));
  const withTeams = useMemo(() => picked.map((p, k) => ({ ...p, team: p.team ?? ((k % 2) as 0 | 1) })), [picked]);

  const start = () => {
    const n = mode === 'elimination' ? 30 : count;
    const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const list = (build ? build(n) : liveQuestions(game, seed, n)).filter((x) => x.options && x.answer !== undefined).slice(0, n);
    if (!list.length) return;
    const s = new Hotseat(mode === 'teams' ? withTeams : picked, mode);
    s.on((m) => {
      if (m.t === 'question') { setI(m.i); setRight(null); setPlayers(s.game.list()); setPhase('pass'); }
      if (m.t === 'reveal') {
        setRight(m.answer); setPlayers(m.players); setPhase('reveal');
        // XP for family profiles (guests just play); a player already out doesn't answer any more.
        const qq = list[m.i];
        for (const p of m.players) {
          const sp = picked.find((x) => x.id === p.id);
          if (!sp?.profileId || !p.last) continue;
          const ok = p.last.points > 0;
          const st = ok ? (streaks.current.get(p.id) ?? 0) + 1 : 0;
          streaks.current.set(p.id, st);
          recordAnswer(qq, ok, st, undefined, sp.profileId);
        }
      }
      if (m.t === 'end') { setPlayers(m.players); setPhase('end'); play('levelup'); }
    });
    seat.current = s; streaks.current.clear(); setQs(list);
    s.start(list.map((x) => x.id), list.map((x) => x.answer ?? 0));
  };

  // ---------------------------------------------------------------- turns
  const ready = () => { turn.current = { id: current!.id, shown: Date.now(), done: false }; setNow(Date.now()); setPhase('question'); };
  const answer = (choice: number) => {
    const s = seat.current; const tr = turn.current;
    if (!s || tr.done) return;
    tr.done = true;
    play('tick');
    s.answer(tr.id, choice, Date.now() - tr.shown);
    if (s.game.phase === 'question') setPhase('pass'); // next player (the reveal message switches phase otherwise)
  };
  useEffect(() => {
    if (phase !== 'question') return;
    const id = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() - turn.current.shown >= QUESTION_SECONDS * 1000) answer(-1);
    }, 250);
    return () => clearInterval(id);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const quit = () => { seat.current = null; setPhase('setup'); onExit?.(); };
  const secondsLeft = Math.max(0, Math.ceil(QUESTION_SECONDS - (now - turn.current.shown) / 1000));
  const aliveN = players.filter((p) => !p.out).length;
  const header = (
    <div className="row spread">
      <span className="pill">{mode === 'elimination' ? t('live.survivors', { n: aliveN }) : t('live.qOf', { i: i + 1, n: qs.length })}</span>
      {phase === 'question' && <span className={`pill ${secondsLeft <= 5 ? 'off' : 'gold'}`} aria-live="off">⏱️ {secondsLeft}</span>}
    </div>
  );

  if (phase === 'setup') {
    const family = profiles.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, profileId: p.id }));
    const guests = picked.filter((p) => !p.profileId);
    const driver = profiles.find((p) => p.id === driverProfileId);
    return (
      <div className={onExit ? 'stack' : 'page stack'}>
        <h1>🛋️ {t('duel.title')}</h1>
        <Mascot mood="idle" text={t('duel.mascot')} />
        <section className="card stack">
          <h2 style={{ margin: 0 }}>{t('duel.who')}</h2>
          <div className="chips">
            {family.map((p) => (
              <button key={p.id} className={`chip ${picked.some((x) => x.id === p.id) ? 'on' : ''}`} aria-pressed={picked.some((x) => x.id === p.id)}
                disabled={p.id === driverProfileId} onClick={() => toggle(p)}>{p.avatar} {p.name}</button>
            ))}
            {guests.map((p) => <button key={p.id} className="chip on" aria-pressed onClick={() => toggle(p)}>{p.avatar} {p.name} ✕</button>)}
          </div>
          {driver && <p className="notice small">🚗 {t('duel.driverOut', { name: driver.name })}</p>}
          <form className="row" onSubmit={(e) => { e.preventDefault(); addGuest(); }}>
            <input className="grow" value={guest} maxLength={24} onChange={(e) => setGuest(e.target.value)} placeholder={t('duel.guestName')} aria-label={t('duel.guestName')} />
            <button className="btn small" type="submit" disabled={!guest.trim() || picked.length >= MAX}>➕ {t('duel.add')}</button>
          </form>
          <p className="small dim" style={{ margin: 0 }}>{t('duel.guestHelp')}</p>
        </section>
        <section className="card stack">
          <div className="chips" role="radiogroup" aria-label={t('live.modeLabel')}>
            {(['classic', 'elimination', 'teams'] as LiveMode[]).map((m) => (
              <button key={m} className={`chip ${mode === m ? 'on' : ''}`} aria-pressed={mode === m} onClick={() => setMode(m)}>{t(`live.mode.${m}` as Key)}</button>
            ))}
          </div>
          <p className="small dim" style={{ margin: 0 }}>{t(`live.mode.${mode}.help` as Key)}</p>
          {mode === 'teams' && (
            <div className="teams">
              {([0, 1] as const).map((tm) => (
                <div key={tm} className={`team t${tm}`}>
                  <b>{tm ? `🔴 ${t('live.teamRed')}` : `🔵 ${t('live.teamBlue')}`}</b>
                  {withTeams.filter((p) => p.team === tm).map((p) => <button key={p.id} className="chip" onClick={() => moveTeam(p.id)}>{p.avatar} {p.name}</button>)}
                </div>
              ))}
              <p className="small dim" style={{ margin: 0 }}>{t('live.teamsHelp')}</p>
            </div>
          )}
          {mode !== 'elimination' && <div className="chips" role="radiogroup" aria-label={t('live.length')}>
            {[5, 8, 12].map((n) => <button key={n} className={`chip ${count === n ? 'on' : ''}`} aria-pressed={count === n} onClick={() => setCount(n)}>{t('live.questionsN', { n })}</button>)}
          </div>}
          <button className="btn big green" disabled={picked.length < 2} onClick={start}>🚀 {t('live.start')}</button>
          {picked.length < 2 && <p className="small dim" style={{ margin: 0 }}>{t('duel.needTwo')}</p>}
        </section>
        {onExit ? <button className="btn ghost" onClick={onExit}>{t('common.back')}</button> : <a className="btn ghost" href={href('/play')}>{t('common.back')}</a>}
      </div>
    );
  }

  // Nothing of the previous player's answer is visible while the phone changes hands.
  if (phase === 'pass' && current) return (
    <div className={onExit ? 'stack' : 'page stack'}>
      {header}
      <section className="card stack pass-card" style={{ alignItems: 'center', textAlign: 'center' }}>
        <span className="pass-avatar" aria-hidden="true">{current.avatar}</span>
        <h1 style={{ margin: 0 }}>{t('duel.passTo', { name: current.name })}</h1>
        {mode === 'teams' && <span className="pill">{current.team === 1 ? `🔴 ${t('live.teamRed')}` : `🔵 ${t('live.teamBlue')}`}</span>}
        <p className="small dim" style={{ margin: 0 }}>{t('duel.noPeeking')}</p>
        <button className="btn big green" onClick={ready}>👋 {t('duel.ready', { name: current.name })}</button>
      </section>
      <button className="btn ghost small" onClick={quit}>{t('live.quit')}</button>
    </div>
  );

  if ((phase === 'question' || phase === 'reveal') && q) {
    const me = phase === 'question' ? players.find((p) => p.id === turn.current.id) : undefined;
    return (
      <div className={onExit ? 'stack' : 'page stack'}>
        {header}
        {me && <p className="pill gold" style={{ alignSelf: 'flex-start' }}>{me.avatar} {t('duel.turnOf', { name: me.name })}</p>}
        <div className="question-card">
          <p className="question">{q.prompt}</p>
          {q.clue && <p className="small dim">{q.clue}</p>}
          <div className="answers">
            {q.options!.map((o, k) => (
              <button key={k} className={`answer ${phase === 'reveal' && k === right ? 'right' : ''}`} disabled={phase !== 'question'} onClick={() => answer(k)}>{o}</button>
            ))}
          </div>
          {phase === 'reveal' && <p className="live-result">✅ {q.explanation}</p>}
        </div>
        {phase === 'reveal' && (
          <>
            <section className="card stack">
              <TeamBanner players={players} mode={mode} />
              <ul className="duel-picks">
                {players.filter((p) => p.last).map((p) => (
                  <li key={p.id}>{p.avatar} {p.name} — {p.last!.choice < 0 ? `⌛ ${t('live.tooLate')}` : p.last!.points ? `✅ ${q.options![p.last!.choice]} (+${fmtNum(p.last!.points)})` : `❌ ${q.options![p.last!.choice] ?? ''}`}</li>
                ))}
              </ul>
              {players.filter((p) => p.out && p.last && !p.last.points).map((p) => <p key={p.id} className="notice warn small" style={{ margin: 0 }}>💀 {t('duel.out', { name: p.name })}</p>)}
              <Board list={players} mode={mode} />
            </section>
            <button className="btn big green" onClick={() => seat.current?.next()}>{t('duel.next')} →</button>
          </>
        )}
        <button className="btn ghost small" onClick={quit}>{t('live.quit')}</button>
      </div>
    );
  }

  if (phase === 'end') {
    const top = ranking(players);
    const [tb, tr] = teamScores(players);
    const savedXp = picked.some((p) => p.profileId);
    return (
      <div className={onExit ? 'stack' : 'page stack'}>
        <Confetti />
        <h1>🏆 {t('live.podium')}</h1>
        {mode === 'teams' && <p className="display" style={{ fontSize: 24, textAlign: 'center', margin: 0 }}>{tb === tr ? t('live.teamsDraw') : t('live.teamWins', { team: tb > tr ? `🔵 ${t('live.teamBlue')}` : `🔴 ${t('live.teamRed')}` })}</p>}
        <TeamBanner players={players} mode={mode} />
        {mode === 'elimination' && top[0] && <p className="display" style={{ fontSize: 22, textAlign: 'center', margin: 0 }}>{t('live.lastStanding', { name: top[0].name })}</p>}
        <div className="podium">
          {[1, 0, 2].map((k) => top[k] && (
            <div key={top[k].id} className={`step s${k + 1}`}>
              <span className="emo">{top[k].avatar}</span><b>{top[k].name}</b><span>{fmtNum(top[k].score)}</span><span className="place">{k + 1}</span>
            </div>
          ))}
        </div>
        <section className="card"><Board list={players} compact mode={mode} me={profile.id} /></section>
        {savedXp && <p className="small dim" style={{ margin: 0 }}>{t('duel.xpSaved')}</p>}
        <div className="row">
          <button className="btn green" onClick={start}>🔁 {t('live.again')}</button>
          <button className="btn ghost" onClick={quit}>{t('live.quit')}</button>
        </div>
      </div>
    );
  }
  return null;
}
