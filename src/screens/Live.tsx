import { useCallback, useEffect, useRef, useState } from 'react';
import type { Question } from '../types';
import { useApp } from '../state';
import { Mascot } from '../components/Mascot';
import { Confetti } from '../components/Bits';
import { href } from '../router';
import { fmtNum, t, type Key } from '../i18n';
import { play } from '../game/sfx';
import { HostGame, normCode, PROTOCOL, QUESTION_SECONDS, roomCode, ranking, type LivePlayer, type ToGuest, type ToHost } from '../live/logic';
import { liveQuestions } from '../live/questions';
import { hostRoom, joinRoom, type GuestLink, type HostLink } from '../live/net';

type Phase = 'menu' | 'connecting' | 'lobby' | 'question' | 'reveal' | 'end' | 'error';
const HOST_ID = 'host';
const REVEAL_MS = 4500;

export default function Live({ query }: { query: URLSearchParams }) {
  const { game, profile, online, recordAnswer } = useApp();
  const [phase, setPhase] = useState<Phase>('menu');
  const [role, setRole] = useState<'host' | 'guest' | null>(null);
  const [code, setCode] = useState(normCode(query.get('join') ?? ''));
  const [count, setCount] = useState(8);
  const [players, setPlayers] = useState<LivePlayer[]>([]);
  const [me, setMe] = useState('');
  const [qs, setQs] = useState<Question[]>([]);
  const [i, setI] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [mine, setMine] = useState<number | null>(null);
  const [answered, setAnswered] = useState<string[]>([]);
  const [right, setRight] = useState<number | null>(null);
  const [err, setErr] = useState<string>('');
  const [qr, setQr] = useState('');
  const [now, setNow] = useState(Date.now());

  const hostRef = useRef<{ link: HostLink; game: HostGame } | null>(null);
  const guestRef = useRef<GuestLink | null>(null);
  const timers = useRef<number[]>([]);
  const st = useRef({ qs: [] as Question[], i: 0, mine: null as number | null, asked: 0, streak: 0, me: '' });
  st.current.qs = qs; st.current.i = i; st.current.mine = mine; st.current.me = me;

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  // ---------------------------------------------------------------- messages every player receives (host included)
  const onGuestMessage = useCallback((m: ToGuest) => {
    switch (m.t) {
      case 'lobby': setPlayers(m.players); setMe(m.you); setPhase((p) => (p === 'connecting' || p === 'end' ? 'lobby' : p)); break;
      case 'start': {
        const local = liveQuestions(game, m.seed, m.count);
        if (local.map((q) => q.id).join() !== m.ids.join()) { setErr('live.errVersion'); setPhase('error'); return; }
        setQs(local); st.current.streak = 0; break;
      }
      case 'question':
        setI(m.i); setMine(null); setAnswered([]); setRight(null);
        setDeadline(Date.now() + m.seconds * 1000); st.current.asked = Date.now(); setPhase('question'); break;
      case 'answered': setAnswered(m.ids); break;
      case 'reveal': {
        setRight(m.answer); setPlayers(m.players); setPhase('reveal');
        const q = st.current.qs[m.i];
        if (q) {
          const ok = st.current.mine === m.answer;
          st.current.streak = ok ? st.current.streak + 1 : 0;
          recordAnswer(q, ok, st.current.streak); // XP, sounds and stats like any quiz
        }
        break;
      }
      case 'end': setPlayers(m.players); setPhase('end'); play('levelup'); break;
      case 'full': setErr('live.errFull'); setPhase('error'); break;
      case 'version': setErr('live.errVersion'); setPhase('error'); break;
    }
  }, [game, recordAnswer]);

  const leave = useCallback(() => {
    clearTimers();
    hostRef.current?.link.close(); hostRef.current = null;
    guestRef.current?.close(); guestRef.current = null;
    setRole(null); setPhase('menu'); setPlayers([]); setQs([]); setQr('');
  }, []);
  useEffect(() => () => leave(), [leave]);

  // ---------------------------------------------------------------- host
  const createRoom = async () => {
    setPhase('connecting'); setRole('host'); setErr('');
    for (let attempt = 0; attempt < 4; attempt++) {
      const c = roomCode();
      try {
        let hg: HostGame | null = null;
        const link = await hostRoom(c, {
          message: (from, m) => { if (!hg) return; if (m.t === 'hello') hg.join(from, m); else hg.answer(from, m); },
          left: (from) => hg?.leave(from),
        });
        // The host plays too: messages addressed to the host (or to everyone) are handled locally.
        hg = new HostGame(HOST_ID, (to, m) => {
          if (to === null || to === HOST_ID) onGuestMessage(m);
          if (to !== HOST_ID) link.send(to, m);
        });
        hostRef.current = { link, game: hg };
        hg.join(HOST_ID, { t: 'hello', v: PROTOCOL, name: profile.name, avatar: profile.avatar });
        setCode(c); setPhase('lobby');
        const url = `${location.origin}${location.pathname}#/live?join=${c}`;
        import('qrcode').then((Q) => Q.toDataURL(url, { margin: 1, width: 220 })).then(setQr).catch(() => {});
        return;
      } catch (e) {
        if ((e as { type?: string }).type === 'unavailable-id') continue;
        setErr('live.errNetwork'); setPhase('error'); return;
      }
    }
    setErr('live.errNetwork'); setPhase('error');
  };

  const startGame = () => {
    const h = hostRef.current; if (!h) return;
    clearTimers();
    const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const local = liveQuestions(game, seed, count);
    h.game.start(seed, local.map((q) => q.id), local.map((q) => q.answer ?? 0));
  };

  // Host timers: reveal when time is up, then move on.
  useEffect(() => {
    const h = hostRef.current;
    if (role !== 'host' || !h) return;
    if (phase === 'question') {
      const id = window.setTimeout(() => h.game.reveal(), QUESTION_SECONDS * 1000 + 800);
      return () => clearTimeout(id);
    }
    if (phase === 'reveal') {
      const id = window.setTimeout(() => h.game.next(), REVEAL_MS);
      return () => clearTimeout(id);
    }
  }, [phase, role, i]);

  // ---------------------------------------------------------------- guest
  const join = async () => {
    const c = normCode(code); if (c.length < 4) return;
    setPhase('connecting'); setRole('guest'); setErr('');
    try {
      const link = await joinRoom(c, { message: onGuestMessage, closed: () => { setErr('live.errHostLeft'); setPhase('error'); } });
      guestRef.current = link;
      link.send({ t: 'hello', v: PROTOCOL, name: profile.name, avatar: profile.avatar });
    } catch (e) {
      setErr((e as Error).message === 'no-host' ? 'live.errNoRoom' : 'live.errNetwork'); setPhase('error');
    }
  };

  // ---------------------------------------------------------------- answering
  const answer = (choice: number) => {
    if (mine !== null || phase !== 'question') return;
    setMine(choice); play('tap');
    const msg: ToHost = { t: 'answer', i, choice, ms: Date.now() - st.current.asked };
    if (role === 'host') hostRef.current?.game.answer(HOST_ID, msg);
    else guestRef.current?.send(msg);
  };

  useEffect(() => {
    if (phase !== 'question') return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase]);

  // ---------------------------------------------------------------- views
  const q = qs[i];
  const secondsLeft = Math.max(0, Math.ceil((deadline - now) / 1000));
  const Board = ({ list, compact }: { list: LivePlayer[]; compact?: boolean }) => (
    <ol className="live-board">
      {ranking(list).map((p, k) => (
        <li key={p.id} className={p.id === me ? 'me' : ''}>
          <span className="rank">{k + 1}</span><span aria-hidden="true">{p.avatar}</span>
          <span className="grow">{p.name}{!compact && p.last ? <small className="dim"> {p.last.points ? `+${fmtNum(p.last.points)}` : '✗'}</small> : null}</span>
          <b>{fmtNum(p.score)}</b>
        </li>
      ))}
    </ol>
  );

  if (phase === 'menu') return (
    <div className="page stack">
      <h1>📡 {t('live.title')}</h1>
      <Mascot mood="idle" text={t('live.mascot')} />
      {!online && <p className="notice warn">{t('live.needOnline')}</p>}
      <section className="card stack">
        <h2 style={{ margin: 0 }}>{t('live.create')}</h2>
        <p className="small dim" style={{ margin: 0 }}>{t('live.createHelp')}</p>
        <button className="btn big" disabled={!online} onClick={createRoom}>🎮 {t('live.createBtn')}</button>
      </section>
      <section className="card stack">
        <h2 style={{ margin: 0 }}>{t('live.join')}</h2>
        <div className="field">
          <label htmlFor="live-code">{t('live.code')}</label>
          <input id="live-code" className="input live-code" value={code} inputMode="text" autoCapitalize="characters" autoComplete="off" maxLength={8}
            onChange={(e) => setCode(normCode(e.target.value))} placeholder="ABC23" />
        </div>
        <button className="btn blue" disabled={!online || code.length < 4} onClick={join}>{t('live.joinBtn')}</button>
      </section>
      <p className="small dim">{t('live.privacy')}</p>
    </div>
  );

  if (phase === 'connecting') return <div className="page"><p className="splash-tip">{t('live.connecting')}</p></div>;

  if (phase === 'error') return (
    <div className="page stack">
      <h1>📡 {t('live.title')}</h1>
      <p className="notice warn">{t((err || 'live.errNetwork') as Key)}</p>
      <div className="row">
        <button className="btn" onClick={leave}>{t('live.back')}</button>
        <a className="btn ghost" href={href('/play')}>{t('common.back')}</a>
      </div>
    </div>
  );

  if (phase === 'lobby') return (
    <div className="page stack">
      <h1>📡 {t('live.title')}</h1>
      <section className="card stack" style={{ alignItems: 'center', textAlign: 'center' }}>
        <span className="small dim">{t('live.codeIs')}</span>
        <b className="live-code-big" aria-label={t('live.code')}>{code}</b>
        {role === 'host' && qr && <img src={qr} width={180} height={180} alt={t('live.qrAlt')} className="live-qr" />}
        {role === 'host' && <p className="small dim" style={{ margin: 0 }}>{t('live.shareHelp')}</p>}
      </section>
      <section className="card stack">
        <h2 style={{ margin: 0 }}>{t('live.players', { n: players.length })}</h2>
        <Board list={players} compact />
      </section>
      {role === 'host' ? (
        <section className="card stack">
          <div className="chips" role="radiogroup" aria-label={t('live.length')}>
            {[5, 8, 12].map((n) => <button key={n} className={`chip ${count === n ? 'on' : ''}`} aria-pressed={count === n} onClick={() => setCount(n)}>{t('live.questionsN', { n })}</button>)}
          </div>
          <button className="btn big green" disabled={players.length < 2} onClick={startGame}>🚀 {t('live.start')}</button>
          {players.length < 2 && <p className="small dim" style={{ margin: 0 }}>{t('live.waiting')}</p>}
        </section>
      ) : <p className="small dim">{t('live.waitHost')}</p>}
      <button className="btn ghost" onClick={leave}>{t('live.quit')}</button>
    </div>
  );

  if ((phase === 'question' || phase === 'reveal') && q) return (
    <div className="page stack">
      <div className="row spread">
        <span className="pill">{t('live.qOf', { i: i + 1, n: qs.length })}</span>
        {phase === 'question' && <span className={`pill ${secondsLeft <= 5 ? 'off' : 'gold'}`} aria-live="off">⏱️ {secondsLeft}</span>}
      </div>
      <div className="question-card">
        <p className="question">{q.prompt}</p>
        {q.clue && <p className="small dim">{q.clue}</p>}
        <div className="answers">
          {q.options!.map((o, k) => {
            const cls = phase === 'reveal' ? (k === right ? 'right' : k === mine ? 'wrong' : '') : k === mine ? 'picked' : '';
            return <button key={k} className={`answer ${cls}`} disabled={mine !== null || phase !== 'question'} onClick={() => answer(k)}>{o}</button>;
          })}
        </div>
        {phase === 'question' && <p className="small dim">{mine !== null ? t('live.waitOthers', { n: answered.length, total: players.length }) : t('live.answeredN', { n: answered.length, total: players.length })}</p>}
        {phase === 'reveal' && <p className="live-result">{mine === right ? `✅ ${t('live.right')}` : mine === null ? `⌛ ${t('live.tooLate')}` : `❌ ${t('live.wrong')}`} {q.explanation}</p>}
      </div>
      {phase === 'reveal' && <section className="card"><Board list={players} /></section>}
    </div>
  );

  if (phase === 'end') {
    const top = ranking(players);
    const iWon = top[0]?.id === me;
    return (
      <div className="page stack">
        {iWon && <Confetti />}
        <h1>🏆 {t('live.podium')}</h1>
        <div className="podium">
          {[1, 0, 2].map((k) => top[k] && (
            <div key={top[k].id} className={`step s${k + 1}`}>
              <span className="emo">{top[k].avatar}</span><b>{top[k].name}</b><span>{fmtNum(top[k].score)}</span><span className="place">{k + 1}</span>
            </div>
          ))}
        </div>
        <section className="card"><Board list={players} compact /></section>
        <div className="row">
          {role === 'host' && <button className="btn green" onClick={startGame}>🔁 {t('live.again')}</button>}
          <button className="btn ghost" onClick={leave}>{t('live.quit')}</button>
        </div>
      </div>
    );
  }
  return <div className="page"><p className="splash-tip">{t('live.connecting')}</p></div>;
}
