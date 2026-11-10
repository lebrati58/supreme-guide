/**
 * Live multiplayer — the host's referee logic, independent of the network (unit-tested).
 * The host's phone is the referee: it collects answers, scores them and tells everyone.
 * Questions are not sent as text: every phone builds the same quiz from the same seed, in its
 * own language (the host also sends the question ids so a mismatch can be detected).
 */
export const PROTOCOL = 1;
export const QUESTION_SECONDS = 20;
export const MAX_PLAYERS = 8;

export interface LivePlayer { id: string; name: string; avatar: string; score: number; correct: number; last?: { choice: number; ms: number; points: number } }

export type ToHost =
  | { t: 'hello'; v: number; name: string; avatar: string }
  | { t: 'answer'; i: number; choice: number; ms: number };

export type ToGuest =
  | { t: 'lobby'; players: LivePlayer[]; you: string }
  | { t: 'start'; seed: string; count: number; ids: string[] }
  | { t: 'question'; i: number; seconds: number }
  | { t: 'answered'; i: number; ids: string[] } // who has answered (not what)
  | { t: 'reveal'; i: number; answer: number; players: LivePlayer[] }
  | { t: 'end'; players: LivePlayer[] }
  | { t: 'full' } | { t: 'version' };

/** Points: 500 for a right answer + up to 500 for speed. Wrong or no answer: 0. */
export function points(correct: boolean, ms: number, seconds = QUESTION_SECONDS): number {
  if (!correct) return 0;
  const left = Math.max(0, Math.min(1, 1 - ms / (seconds * 1000)));
  return 500 + Math.round(500 * left);
}

export const ranking = (ps: LivePlayer[]) => ps.slice().sort((a, b) => b.score - a.score || b.correct - a.correct || a.name.localeCompare(b.name));

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

  constructor(readonly hostId: string, private send: (to: string | null, m: ToGuest) => void) {}

  list() { return ranking([...this.players.values()]); }

  join(id: string, msg: ToHost): boolean {
    if (msg.t !== 'hello') return false;
    if (msg.v !== PROTOCOL) { this.send(id, { t: 'version' }); return false; }
    if (!this.players.has(id) && this.players.size >= MAX_PLAYERS) { this.send(id, { t: 'full' }); return false; }
    const name = (msg.name || '?').slice(0, 24), avatar = (msg.avatar || '🧭').slice(0, 8);
    const prev = this.players.get(id);
    this.players.set(id, { id, name, avatar, score: prev?.score ?? 0, correct: prev?.correct ?? 0 });
    this.broadcastLobby();
    return true;
  }

  leave(id: string) {
    this.players.delete(id);
    this.answers.delete(id);
    if (this.phase === 'lobby') this.broadcastLobby();
    else if (this.phase === 'question') this.maybeReveal();
  }

  broadcastLobby() { for (const p of this.players.values()) this.send(p.id, { t: 'lobby', players: this.list(), you: p.id }); }

  /** `correct[i]` is the right option index of question i (computed by the host). */
  start(seed: string, ids: string[], correct: number[]) {
    for (const p of this.players.values()) { p.score = 0; p.correct = 0; delete p.last; }
    this.correct = correct;
    this.index = -1;
    this.send(null, { t: 'start', seed, count: ids.length, ids });
    this.next();
  }

  next() {
    this.index++;
    this.answers.clear();
    for (const p of this.players.values()) delete p.last;
    if (this.index >= this.correct.length) { this.phase = 'end'; this.send(null, { t: 'end', players: this.list() }); return; }
    this.phase = 'question';
    this.send(null, { t: 'question', i: this.index, seconds: QUESTION_SECONDS });
  }

  answer(id: string, msg: ToHost) {
    if (msg.t !== 'answer' || this.phase !== 'question' || msg.i !== this.index || !this.players.has(id) || this.answers.has(id)) return;
    const ms = Math.max(0, Math.min(QUESTION_SECONDS * 1000, Number(msg.ms) || 0));
    this.answers.set(id, { choice: Math.trunc(Number(msg.choice)), ms });
    this.send(null, { t: 'answered', i: this.index, ids: [...this.answers.keys()] });
    this.maybeReveal();
  }

  maybeReveal() { if (this.phase === 'question' && this.answers.size >= this.players.size) this.reveal(); }

  /** Called when everyone answered, or by the host's timer. */
  reveal() {
    if (this.phase !== 'question') return;
    this.phase = 'reveal';
    const right = this.correct[this.index];
    for (const p of this.players.values()) {
      const a = this.answers.get(p.id);
      const pts = a ? points(a.choice === right, a.ms) : 0;
      p.score += pts;
      if (pts) p.correct++;
      p.last = a ? { ...a, points: pts } : undefined;
    }
    this.send(null, { t: 'reveal', i: this.index, answer: right, players: this.list() });
  }
}
