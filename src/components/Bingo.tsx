import { useEffect, useState } from 'react';
import type { Mode } from '../types';
import { useApp } from '../state';
import { Confetti } from './Bits';
import { Mascot } from './Mascot';
import { t } from '../i18n';
import { play } from '../game/sfx';
import { speak } from '../game/speech';
import { buildCard, lines, unlocked, type BingoCell } from '../game/bingo';
import { hashString, mulberry32 } from '../game/rng';

interface Player { id: string; name: string; avatar: string; profileId?: string; card: BingoCell[]; marked: number[]; lines: number; full: boolean }
interface Saved { size: 3 | 4; players: Player[]; current: string }

const XP_LINE = 15, XP_FULL = 40;
const load = (key: string): Saved | null => { try { const s = sessionStorage.getItem(key); return s ? JSON.parse(s) as Saved : null; } catch { return null; } };
const save = (key: string, v: Saved | null) => { try { if (v) sessionStorage.setItem(key, JSON.stringify(v)); else sessionStorage.removeItem(key); } catch { /* private mode */ } };

/**
 * Road bingo: each player has a card of things to spot through the window and ticks what they see.
 * A full row, column or diagonal = Bingo! Route cells (rivers, summits, borders, landmarks) unlock as
 * you approach them. Fully offline. The driver never plays.
 */
export function Bingo({ mode, saveKey, routeCells = [], progress, driverProfileId, onExit }: {
  mode: Mode; saveKey: string; routeCells?: BingoCell[]; progress?: number; driverProfileId?: string; onExit?: () => void;
}) {
  const { profiles, addXp } = useApp();
  const [state, setState] = useState<Saved | null>(() => load(saveKey));
  const [size, setSize] = useState<3 | 4>(3);
  const [picked, setPicked] = useState<{ id: string; name: string; avatar: string; profileId?: string }[]>(() =>
    profiles.filter((p) => p.id !== driverProfileId).slice(0, 1).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, profileId: p.id })));
  const [guest, setGuest] = useState('');
  const [cheer, setCheer] = useState<{ text: string; n: number } | null>(null);
  useEffect(() => save(saveKey, state), [saveKey, state]);

  const start = () => {
    const rnd = mulberry32(hashString(`${saveKey}-${Date.now()}`));
    const players = picked.map((p) => ({ ...p, card: buildCard(mode, size, rnd, routeCells), marked: [], lines: 0, full: false }));
    setState({ size, players, current: players[0].id });
  };

  // ---------------------------------------------------------------- setup
  if (!state) {
    const family = profiles.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, profileId: p.id }));
    const toggle = (p: (typeof family)[number]) => setPicked((l) => (l.some((x) => x.id === p.id) ? l.filter((x) => x.id !== p.id) : l.length < 6 ? [...l, p] : l));
    const driver = profiles.find((p) => p.id === driverProfileId);
    return (
      <div className="stack">
        <h2 style={{ margin: 0 }}>🎯 {t('bingo.title')}</h2>
        <Mascot mood="idle" text={t('bingo.mascot')} />
        <div className="chips">
          {family.map((p) => <button key={p.id} className={`chip ${picked.some((x) => x.id === p.id) ? 'on' : ''}`} aria-pressed={picked.some((x) => x.id === p.id)} disabled={p.id === driverProfileId} onClick={() => toggle(p)}>{p.avatar} {p.name}</button>)}
          {picked.filter((p) => !p.profileId).map((p) => <button key={p.id} className="chip on" onClick={() => setPicked((l) => l.filter((x) => x.id !== p.id))}>{p.avatar} {p.name} ✕</button>)}
        </div>
        {driver && <p className="notice small">🚗 {t('duel.driverOut', { name: driver.name })}</p>}
        <form className="row" onSubmit={(e) => { e.preventDefault(); const n = guest.trim().slice(0, 24); if (n && picked.length < 6) { setPicked((l) => [...l, { id: `g${Date.now().toString(36)}`, name: n, avatar: '🙂' }]); setGuest(''); } }}>
          <input className="grow" value={guest} maxLength={24} onChange={(e) => setGuest(e.target.value)} placeholder={t('duel.guestName')} aria-label={t('duel.guestName')} />
          <button className="btn small" type="submit" disabled={!guest.trim()}>➕ {t('duel.add')}</button>
        </form>
        <div className="chips" role="radiogroup" aria-label={t('bingo.size')}>
          {([3, 4] as const).map((n) => <button key={n} className={`chip ${size === n ? 'on' : ''}`} aria-pressed={size === n} onClick={() => setSize(n)}>{n}×{n}</button>)}
        </div>
        <button className="btn big green" disabled={!picked.length} onClick={start}>🚀 {t('bingo.start')}</button>
        {onExit && <button className="btn ghost" onClick={onExit}>{t('common.back')}</button>}
      </div>
    );
  }

  const me = state.players.find((p) => p.id === state.current) ?? state.players[0];
  const tap = (k: number) => {
    const cell = me.card[k];
    if (!unlocked(cell, progress)) { speak(t('bingo.notYet')); return; }
    const marked = new Set(me.marked);
    if (marked.has(k)) marked.delete(k); else { marked.add(k); speak(cell.label); play('tap'); }
    const nLines = lines(state.size, marked).length;
    const full = marked.size === me.card.length;
    // Rewards only go up (unticking a cell doesn't take XP back, ticking it again doesn't pay twice).
    if (nLines > me.lines || (full && !me.full)) {
      const gain = (nLines > me.lines && me.lines === 0 ? XP_LINE : 0) + (full && !me.full ? XP_FULL : 0);
      if (gain && me.profileId) addXp(gain, me.profileId);
      play('levelup');
      setCheer({ text: full && !me.full ? t('bingo.full', { name: me.name }) : t('bingo.bingo', { name: me.name }), n: (cheer?.n ?? 0) + 1 });
    }
    setState({ ...state, players: state.players.map((p) => (p.id === me.id ? { ...p, marked: [...marked], lines: Math.max(p.lines, nLines), full: p.full || full } : p)) });
  };

  return (
    <div className="stack">
      {cheer && <Confetti key={cheer.n} />}
      <div className="row spread">
        <h2 style={{ margin: 0 }}>🎯 {t('bingo.title')}</h2>
        <span className="pill">{me.marked.length}/{me.card.length}</span>
      </div>
      {state.players.length > 1 && (
        <div className="chips" role="tablist" aria-label={t('bingo.whose')}>
          {state.players.map((p) => <button key={p.id} role="tab" aria-selected={p.id === me.id} className={`chip ${p.id === me.id ? 'on' : ''}`} onClick={() => setState({ ...state, current: p.id })}>{p.avatar} {p.name}{p.lines ? ' 🎉' : ''}</button>)}
        </div>
      )}
      {cheer && <p className="notice small" role="status">🎉 {cheer.text}</p>}
      <div className={`bingo-card s${state.size}`}>
        {me.card.map((c, k) => {
          const open = unlocked(c, progress);
          return (
            <button key={c.id} className={`bingo-cell ${me.marked.includes(k) ? 'on' : ''} ${open ? '' : 'locked'} ${c.at !== undefined ? 'route' : ''}`} aria-pressed={me.marked.includes(k)} onClick={() => tap(k)}
              aria-label={open ? c.label : `${c.label} — ${t('bingo.notYet')}`}>
              <span className="bingo-emoji" aria-hidden="true">{open ? c.emoji : '🔒'}</span>
              <span className="bingo-label">{c.label}{c.side ? (c.side === 'left' ? ' ⬅️' : ' ➡️') : ''}</span>
            </button>
          );
        })}
      </div>
      <p className="small dim" style={{ margin: 0 }}>{t('bingo.help')}</p>
      <div className="row">
        <button className="btn ghost" onClick={() => { setState(null); setCheer(null); }}>🔁 {t('bingo.newCards')}</button>
        {onExit && <button className="btn ghost" onClick={onExit}>{t('common.back')}</button>}
      </div>
    </div>
  );
}
