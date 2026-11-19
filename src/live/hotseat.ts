import { HostGame, QUESTION_SECONDS, type LiveMode, type LivePlayer, type ToGuest } from './logic';

/**
 * Duel on one phone (“pass and play”): the Live referee, driven locally. Every player answers the same
 * question in turn, without seeing the others' answers; the right answer is revealed once everyone has
 * answered. Works fully offline. Unit-tested.
 */
export interface SeatPlayer { id: string; name: string; avatar: string; team?: 0 | 1; profileId?: string }

export class Hotseat {
  readonly game: HostGame;
  last: ToGuest | null = null;
  private listeners = new Set<(m: ToGuest) => void>();

  constructor(players: SeatPlayer[], mode: LiveMode) {
    this.game = new HostGame('phone', (_to, m) => { this.last = m; this.listeners.forEach((f) => f(m)); });
    this.game.mode = mode;
    for (const p of players) {
      this.game.players.set(p.id, { id: p.id, name: p.name.slice(0, 24), avatar: p.avatar, score: 0, correct: 0, team: p.team ?? 0 });
    }
  }

  on(f: (m: ToGuest) => void) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }

  start(ids: string[], correct: number[]) { this.game.start('local', ids, correct); }

  /**
   * Players still to answer the current question, in turn order. The first player rotates with each
   * question, so nobody always answers first (or always last).
   */
  queue(): LivePlayer[] {
    const g = this.game;
    if (g.phase !== 'question') return [];
    const order = [...g.players.values()];
    const k = order.length ? g.index % order.length : 0;
    return [...order.slice(k), ...order.slice(0, k)].filter((p) => !p.out && !g.answers.has(p.id));
  }

  /** The current player answers (`choice` -1 = time is up). `ms` counts from when they saw the question. */
  answer(id: string, choice: number, ms: number) {
    this.game.answer(id, { t: 'answer', i: this.game.index, choice, ms: Math.min(ms, QUESTION_SECONDS * 1000) });
  }

  next() { this.game.next(); }
}
