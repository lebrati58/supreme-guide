/**
 * Live multiplayer — the host's referee logic, independent of the network (unit-tested).
 * The host's phone is the referee: it collects answers, scores them and tells everyone.
 * Questions are not sent as text: every phone builds the same quiz from the same seed, in its
 * own language (the host also sends the question ids so a mismatch can be detected).
 */
export const PROTOCOL = 1;
export const QUESTION_SECONDS = 20;
export const MAX_PLAYERS = 8;

export type LiveMode = 'classic' | 'elimination' | 'teams';
export interface LivePlayer {
  id: string; name: string; avatar: string; score: number; correct: number;
  last?: { choice: number; ms: number; points: number };
  /** Teams mode: 0 = blue, 1 = red. */
  team?: 0 | 1;
  /** Elimination mode: out of the game (still watching). */
  out?: boolean;
}

export type ToHost =
  | { t: 'hello'; v: number; name: string; avatar: string }
  | { t: 'answer'; i: number; choice: number; ms: number };

export type ToGuest =
  | { t: 'lobby'; players: LivePlayer[]; you: string; mode: LiveMode }
  | { t: 'start'; seed: string; count: number; ids: string[]; mode: LiveMode }
  | { t: 'question'; i: number; seconds: number }
  | { t: 'answered'; i: number; ids: string[] } // who has answered (not what)
  | { t: 'reveal'; i: number; answer: number; players: LivePlayer[]; mode: LiveMode }
  | { t: 'end'; players: LivePlayer[]; mode: LiveMode }
  | { t: 'full' } | { t: 'version' };

/** Points: 500 for a right answer + up to 500 for speed. Wrong or no answer: 0. */
export function points(correct: boolean, ms: number, seconds = QUESTION_SECONDS): number {
  if (!correct) return 0;
  const left = Math.max(0, Math.min(1, 1 - ms / (seconds * 1000)));
  return 500 + Math.round(500 * left);
}

/** Survivors first (elimination), then score, then right answers, then name. */
export const ranking = (ps: LivePlayer[]) => ps.slice().sort((a, b) => Number(!!a.out) - Number(!!b.out) || b.score - a.score || b.correct - a.correct || a.name.localeCompare(b.name));

/** Teams: average points per player, so a smaller team is not disadvantaged. */
export function teamScores(ps: LivePlayer[]): [number, number] {
  const avg = (t: 0 | 1) => { const m = ps.filter((p) => p.team === t); return m.length ? Math.round(m.reduce((s, p) => s + p.score, 0) / m.length) : 0; };
  return [avg(0), avg(1)];
}

/** Short room codes without look-alike characters (0/O, 1/I/L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function roomCode(rnd = Math.random, len = 5): string {
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(rnd() * ALPHABET.length)];
  return s;
}
export const normCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
export const peerIdFor = (code: string) => `supreme-guide-live-${normCode(code).toLowerCase()}`;

/** Host referee. `send(to | null, msg)` delivers to one player or to everyone (null). */
export class HostGame {
  players = new Map<string, LivePlayer>();
  answers = new Map<string, { choice: number; ms: number }>();
  index = -1;
  phase: 'lobby' | 'question' | 'reveal' | 'end' = 'lobby';
  correct: number[] = [];
  mode: LiveMode = 'classic';

  constructor(readonly hostId: string, private send: (to: string | null, m: ToGuest) => void) {}

  list() { return ranking([...this.players.values()]); }

  join(id: string, msg: ToHost): boolean {
    if (msg.t !== 'hello') return false;
    if (msg.v !== PROTOCOL) { this.send(id, { t: 'version' }); return false; }
    if (!this.players.has(id) && this.players.size >= MAX_PLAYERS) { this.send(id, { t: 'full' }); return false; }
    const name = (msg.name || '?').slice(0, 24), avatar = (msg.avatar || '🧭').slice(0, 8);
    const prev = this.players.get(id);
    this.players.set(id, { id, name, avatar, score: prev?.score ?? 0, correct: prev?.correct ?? 0, team: prev?.team ?? this.smallerTeam() });
    this.broadcastLobby();
    return true;
  }

  leave(id: string) {
    this.players.delete(id);
    this.answers.delete(id);
    if (this.phase === 'lobby') this.broadcastLobby();
    else if (this.phase === 'question') this.maybeReveal();
  }

  broadcastLobby() { for (const p of this.players.values()) this.send(p.id, { t: 'lobby', players: this.list(), you: p.id, mode: this.mode }); }

  private smallerTeam(): 0 | 1 {
    const n = [...this.players.values()];
    return n.filter((p) => p.team === 0).length <= n.filter((p) => p.team === 1).length ? 0 : 1;
  }

  setMode(mode: LiveMode) { if (this.phase === 'lobby' || this.phase === 'end') { this.mode = mode; this.broadcastLobby(); } }

  /** Teams mode: the host moves a player to the other team. */
  switchTeam(id: string) {
    const p = this.players.get(id);
    if (p && (this.phase === 'lobby' || this.phase === 'end')) { p.team = p.team === 0 ? 1 : 0; this.broadcastLobby(); }
  }

  /** Players still in the game (everyone outside elimination mode). */
  alive() { return [...this.players.values()].filter((p) => !p.out); }

  /** `correct[i]` is the right option index of question i (computed by the host). */
  start(seed: string, ids: string[], correct: number[]) {
    for (const p of this.players.values()) { p.score = 0; p.correct = 0; delete p.last; delete p.out; }
    this.correct = correct;
    this.index = -1;
    this.send(null, { t: 'start', seed, count: ids.length, ids, mode: this.mode });
    this.next();
  }

  next() {
    this.index++;
    this.answers.clear();
    for (const p of this.players.values()) delete p.last;
    const lastStanding = this.mode === 'elimination' && this.alive().length <= 1;
    if (this.index >= this.correct.length || lastStanding) { this.phase = 'end'; this.send(null, { t: 'end', players: this.list(), mode: this.mode }); return; }
    this.phase = 'question';
    this.send(null, { t: 'question', i: this.index, seconds: QUESTION_SECONDS });
  }

  answer(id: string, msg: ToHost) {
    if (msg.t !== 'answer' || this.phase !== 'question' || msg.i !== this.index || !this.players.has(id) || this.players.get(id)!.out || this.answers.has(id)) return;
    const ms = Math.max(0, Math.min(QUESTION_SECONDS * 1000, Number(msg.ms) || 0));
    this.answers.set(id, { choice: Math.trunc(Number(msg.choice)), ms });
    this.send(null, { t: 'answered', i: this.index, ids: [...this.answers.keys()] });
    this.maybeReveal();
  }

  maybeReveal() { if (this.phase === 'question' && this.answers.size >= this.alive().length) this.reveal(); }

  /** Called when everyone answered, or by the host's timer. */
  reveal() {
    if (this.phase !== 'question') return;
    this.phase = 'reveal';
    const right = this.correct[this.index];
    const alive = this.alive();
    for (const p of alive) {
      const a = this.answers.get(p.id);
      const pts = a ? points(a.choice === right, a.ms) : 0;
      p.score += pts;
      if (pts) p.correct++;
      p.last = a ? { ...a, points: pts } : undefined;
    }
    // Elimination: whoever missed is out — unless everyone missed (then nobody is).
    if (this.mode === 'elimination') {
      const missed = alive.filter((p) => !p.last?.points);
      if (missed.length < alive.length) for (const p of missed) p.out = true;
    }
    this.send(null, { t: 'reveal', i: this.index, answer: right, players: this.list(), mode: this.mode });
  }
}
