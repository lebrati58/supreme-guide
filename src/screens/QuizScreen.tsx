import { useMemo, useState } from 'react';
import type { Region } from '../types';
import { useApp } from '../state';
import { BLITZ_WEIGHTS, buildSession } from '../game/engine';
import { hashString, mulberry32, todayKey } from '../game/rng';
import { isRegionUnlocked, recordDaily } from '../game/progression';
import { Quiz, type QuizResult } from '../components/Quiz';
import { Mascot } from '../components/Mascot';
import { Confetti } from '../components/Bits';
import { href } from '../router';

const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return todayKey(d); };

export default function QuizScreen({ type, query }: { type: string; query: URLSearchParams }) {
  const { game, profile, update, stamp } = useApp();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [round, setRound] = useState(0);
  const region = query.get('region') as Region | null;
  const kid = profile.kidMode ? 2 : undefined;
  const day = todayKey();

  const setup = useMemo(() => {
    const seedRandom = mulberry32(hashString(`${type}-${Date.now()}-${round}`));
    // Seeded challenges must be identical on every device: drop device-dependent flag questions.
    const det = { ...game, flagsOk: false };
    switch (type) {
      case 'daily': return { title: `📅 Daily challenge · ${day}`, qs: buildSession(det, { count: 5, rnd: mulberry32(hashString(`daily-${day}`)) }) };
      case 'blitz': return { title: '⚡ Blitz', qs: buildSession(game, { count: 10, rnd: seedRandom, weights: BLITZ_WEIGHTS, timeLimit: 10, maxDifficulty: kid }) };
      case 'map': return { title: '📍 Map master', qs: buildSession(game, { count: 8, rnd: seedRandom, weights: { mapfind: 1 }, maxDifficulty: kid }) };
      case 'timeline': return { title: '⏳ Time traveller', qs: buildSession(game, { count: 5, rnd: seedRandom, weights: { chronology: 1 } }) };
      case 'landmarks': return { title: '🏛️ Landmark hunter', qs: buildSession(game, { count: 8, rnd: seedRandom, weights: { monument: 2, landmarkCountry: 1 } }) };
      case 'friend': {
        const seed = query.get('seed') ?? 'x';
        return { title: `🤝 Challenge from ${query.get('from') ?? 'a friend'}`, qs: buildSession(det, { count: 10, rnd: mulberry32(hashString(`friend-${seed}`)) }) };
      }
      case 'tour': return region && isRegionUnlocked(profile, region)
        ? { title: `🌍 World Tour · ${region}`, qs: buildSession(game, { count: 8, rnd: seedRandom, region, surpriseRate: 0.15, maxDifficulty: kid }) }
        : { title: 'Locked', qs: [] };
      case 'country': {
        const iso = query.get('iso') ?? '';
        return { title: `${game.byIso3.get(iso)?.flag ?? ''} ${game.byIso3.get(iso)?.name ?? ''} quiz`, qs: buildSession(game, { count: 6, rnd: seedRandom, focus: [iso], maxDifficulty: kid }) };
      }
      default: return { title: '🎲 Quick world quiz', qs: buildSession(game, { count: 8, rnd: seedRandom, surpriseRate: 0.12, maxDifficulty: kid }) };
    }
  }, [type, round, game, region, day, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const alreadyDaily = type === 'daily' && profile.daily.scores[day] !== undefined && !result;

  const finish = (r: QuizResult) => {
    setResult(r);
    if (type === 'daily') update((p) => { recordDaily(p, day, r.correct, yesterday()); });
    if (type === 'tour' && region) {
      const stars = r.correct >= r.total ? 3 : r.correct >= r.total * 0.75 ? 2 : r.correct >= r.total * 0.5 ? 1 : 0;
      update((p) => { p.tourStars[region] = Math.max(p.tourStars[region] ?? 0, stars); });
    }
    // Stamp countries the player answered correctly about (quiz stamps).
    const iso = setup.qs.filter((q) => r.answers.find((a) => a.id === q.id && a.correct)).flatMap((q) => q.countries?.slice(0, 1) ?? []);
    if (iso.length) stamp([...new Set(iso)], 'quiz');
  };

  if (alreadyDaily) return (
    <div className="page stack">
      <Mascot mood="idle" text={`You already played today (${profile.daily.scores[day]}/5). Come back tomorrow to keep your ${profile.daily.streak}-day streak!`} />
      <a className="btn" href={href('/play')}>More challenges</a>
    </div>
  );
  if (!setup.qs.length) return <div className="page"><h1>🔒 Locked</h1><p>Level up to unlock this region.</p><a className="btn" href={href('/play')}>Back</a></div>;

  if (result) {
    const pct = result.correct / result.total;
    return (
      <div className="page stack">
        {pct >= 0.8 && <Confetti />}
        <div className="card result-hero">
          <div className="big-score">{result.correct}/{result.total}</div>
          <p className="display" style={{ fontSize: 24 }}>+{result.xp} XP</p>
          {type === 'friend' && <p>Send your score back to {query.get('from') ?? 'your friend'}: <b>{result.correct}/{result.total}</b> 🏆</p>}
        </div>
        <Mascot mood={pct === 1 ? 'perfect' : pct >= 0.6 ? 'correct' : 'wrong'} text={pct === 1 ? undefined : pct >= 0.6 ? 'Well travelled! A few more trips and you’ll be after my job.' : 'Every expert was once a lost tourist. Again?'} />
        <div className="row">
          {type !== 'daily' && type !== 'friend' && <button className="btn" onClick={() => { setResult(null); setRound((r) => r + 1); }}>🔁 Play again</button>}
          <a className="btn ghost" href={href('/play')}>More challenges</a>
        </div>
      </div>
    );
  }
  return <div className="page"><Quiz key={round} questions={setup.qs} title={setup.title} onFinish={finish} /></div>;
}
