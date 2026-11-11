import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadCountries, loadWorld110 } from '../../src/data/loaders';
import { makeGameData, validateQuestion, type GameData } from '../../src/game/engine';
import { HostGame, MAX_PLAYERS, normCode, points, PROTOCOL, QUESTION_SECONDS, roomCode, type ToGuest } from '../../src/live/logic';
import { liveQuestions } from '../../src/live/questions';
import { setLocale } from '../../src/i18n';

let data: GameData;
beforeAll(async () => {
  const [c, w] = await Promise.all([loadCountries(), loadWorld110()]);
  data = makeGameData(c, true, new Set(w.features.map((f) => f.properties.num)));
});
afterAll(() => setLocale('en'));

const hello = (name: string) => ({ t: 'hello' as const, v: PROTOCOL, name, avatar: '🧭' });

function room() {
  const sent: { to: string | null; m: ToGuest }[] = [];
  const g = new HostGame('host', (to, m) => sent.push({ to, m }));
  g.join('host', hello('Ana')); g.join('p2', hello('Ben')); g.join('p3', hello('Chloé'));
  return { g, sent, last: (t: ToGuest['t']) => [...sent].reverse().find((s) => s.m.t === t)?.m };
}

describe('live: scoring and referee', () => {
  it('scores right answers with a speed bonus', () => {
    expect(points(false, 0)).toBe(0);
    expect(points(true, 0)).toBe(1000);
    expect(points(true, QUESTION_SECONDS * 1000)).toBe(500);
    expect(points(true, QUESTION_SECONDS * 500)).toBe(750);
  });

  it('runs a full game: question → answers → reveal → next → end, with ranking', () => {
    const { g, last } = room();
    g.start('seed', ['a', 'b'], [2, 0]);
    expect(last('question')).toMatchObject({ i: 0 });
    g.answer('host', { t: 'answer', i: 0, choice: 2, ms: 1000 });
    g.answer('p2', { t: 'answer', i: 0, choice: 1, ms: 500 });
    expect(g.phase).toBe('question');
    g.answer('p3', { t: 'answer', i: 0, choice: 2, ms: 10000 }); // everyone answered → reveal
    const r = last('reveal') as Extract<ToGuest, { t: 'reveal' }>;
    expect(r.answer).toBe(2);
    expect(r.players.map((p) => p.name)).toEqual(['Ana', 'Chloé', 'Ben']);
    g.next();
    g.answer('p2', { t: 'answer', i: 0, choice: 0, ms: 1 }); // stale index: ignored
    g.answer('p2', { t: 'answer', i: 1, choice: 0, ms: 1 });
    g.answer('p2', { t: 'answer', i: 1, choice: 1, ms: 1 }); // second answer: ignored
    g.reveal(); // timer
    expect(g.players.get('p2')!.correct).toBe(1);
    g.next();
    const end = last('end') as Extract<ToGuest, { t: 'end' }>;
    expect(end.players).toHaveLength(3);
    expect(g.phase).toBe('end');
  });

  it('reveals when the last missing player leaves, refuses a full room and old versions', () => {
    const { g, sent } = room();
    g.start('s', ['a'], [0]);
    g.answer('host', { t: 'answer', i: 0, choice: 0, ms: 0 });
    g.answer('p2', { t: 'answer', i: 0, choice: 0, ms: 0 });
    g.leave('p3');
    expect(g.phase).toBe('reveal');
    for (let k = 0; k < MAX_PLAYERS; k++) g.join(`x${k}`, hello(`X${k}`));
    expect(g.players.size).toBe(MAX_PLAYERS);
    expect(sent.some((s) => s.m.t === 'full')).toBe(true);
    expect(g.join('old', { t: 'hello', v: 0, name: 'Old', avatar: '' })).toBe(false);
  });

  it('room codes avoid look-alike characters', () => {
    for (let k = 0; k < 200; k++) expect(roomCode()).toMatch(/^[A-HJ-NP-Z2-9]{5}$/);
    expect(normCode(' ab-c2 3 ')).toBe('ABC23');
  });
});

describe('live: every phone builds the same quiz, in its own language', () => {
  it('same seed → same questions and answers, whatever the language', async () => {
    await setLocale('en');
    const en = liveQuestions(data, 'abc', 12);
    await setLocale('he');
    const he = liveQuestions(data, 'abc', 12);
    expect(en).toHaveLength(12);
    expect(he.map((q) => q.id)).toEqual(en.map((q) => q.id));
    expect(he.map((q) => q.answer)).toEqual(en.map((q) => q.answer));
    expect(he[0].prompt).not.toBe(en[0].prompt);
    for (const q of en) { expect(validateQuestion(q)).toEqual([]); expect(q.options!.length).toBeGreaterThanOrEqual(2); }
    await setLocale('en');
    expect(liveQuestions(data, 'other', 12).map((q) => q.id)).not.toEqual(en.map((q) => q.id));
  });
});

describe('live: elimination and teams', () => {
  it('elimination: missing a question knocks you out, unless everyone misses; last one standing ends the game', () => {
    const { g, last } = room();
    g.setMode('elimination');
    g.start('s', ['a', 'b', 'c', 'd'], [0, 0, 0, 0]);
    // Q1: everyone misses → nobody out
    g.answer('host', { t: 'answer', i: 0, choice: 1, ms: 0 }); g.answer('p2', { t: 'answer', i: 0, choice: 1, ms: 0 }); g.answer('p3', { t: 'answer', i: 0, choice: 1, ms: 0 });
    expect(g.alive()).toHaveLength(3);
    g.next();
    // Q2: Ben misses → out
    g.answer('host', { t: 'answer', i: 1, choice: 0, ms: 0 }); g.answer('p2', { t: 'answer', i: 1, choice: 2, ms: 0 }); g.answer('p3', { t: 'answer', i: 1, choice: 0, ms: 0 });
    expect(g.players.get('p2')!.out).toBe(true);
    g.next();
    g.answer('p2', { t: 'answer', i: 2, choice: 0, ms: 0 }); // out players can't answer
    expect(g.answers.has('p2')).toBe(false);
    g.answer('host', { t: 'answer', i: 2, choice: 0, ms: 0 }); g.answer('p3', { t: 'answer', i: 2, choice: 3, ms: 0 }); // reveal with 2 alive answers
    expect(g.phase).toBe('reveal');
    g.next(); // only Ana left → end
    const end = last('end') as Extract<ToGuest, { t: 'end' }>;
    expect(end.mode).toBe('elimination');
    expect(end.players[0].name).toBe('Ana');
    expect(end.players.filter((p) => !p.out)).toHaveLength(1);
  });

  it('teams: balanced on join, host can switch, average score per team', async () => {
    const { g } = room();
    g.setMode('teams');
    const teams = [...g.players.values()].map((p) => p.team);
    expect(teams.filter((x) => x === 0).length).toBe(2);
    expect(g.players.get('p2')!.team).toBe(1);
    g.switchTeam('p3');
    expect(g.players.get('p3')!.team).toBe(1);
    const { teamScores } = await import('../../src/live/logic');
    g.players.get('host')!.score = 1000; g.players.get('p2')!.score = 0; g.players.get('p3')!.score = 600;
    expect(teamScores([...g.players.values()])).toEqual([1000, 300]); // blue: Ana; red: Ben + Chloé (average)
  });
});
