import { useMemo, useState } from 'react';
import type { Region } from '../types';
import { useApp } from '../state';
import { BLITZ_WEIGHTS, buildGeneral, buildSession } from '../game/engine';
import { hashString, mulberry32, todayKey } from '../game/rng';
import { isRegionUnlocked, recordDaily } from '../game/progression';
import { Quiz, type QuizResult } from '../components/Quiz';
import { Mascot } from '../components/Mascot';
import { Confetti } from '../components/Bits';
import { InterestPicker } from '../components/Interests';
import { href } from '../router';
import { fmtDate, t } from '../i18n';
import { countryName, regionLabel } from '../i18n/content';

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
      case 'daily': return { title: t('qs.daily', { date: fmtDate(new Date(), { dateStyle: 'medium' }) }), qs: buildSession(det, { count: 5, rnd: mulberry32(hashString(`daily-${day}`)) }) };
      case 'blitz': return { title: t('qs.blitz'), qs: buildSession(game, { count: 10, rnd: seedRandom, weights: BLITZ_WEIGHTS, timeLimit: 10, maxDifficulty: kid }) };
      case 'map': return { title: t('qs.map'), qs: buildSession(game, { count: 8, rnd: seedRandom, weights: { mapfind: 1 }, maxDifficulty: kid }) };
      case 'timeline': return { title: t('qs.timeline'), qs: buildSession(game, { count: 5, rnd: seedRandom, weights: { chronology: 1 } }) };
      case 'topics': return { title: t('play.topics'), qs: buildGeneral(game, { count: 8, rnd: seedRandom, domains: profile.settings.interests, maxDifficulty: kid }) };
      case 'landmarks': return { title: t('qs.landmarks'), qs: buildSession(game, { count: 8, rnd: seedRandom, weights: { monument: 2, landmarkCountry: 1 } }) };
      case 'friend': {
        const seed = query.get('seed') ?? 'x';
        return { title: t('qs.friend', { name: query.get('from') ?? t('qs.aFriend') }), qs: buildSession(det, { count: 10, rnd: mulberry32(hashString(`friend-${seed}`)) }) };
      }
      case 'tour': return region && isRegionUnlocked(profile, region)
        ? { title: t('qs.tour', { region: regionLabel(region) }), qs: buildSession(game, { count: 8, rnd: seedRandom, region, surpriseRate: 0.15, maxDifficulty: kid }) }
        : { title: '', qs: [] };
      case 'country': {
        const iso = query.get('iso') ?? '';
        const c = game.byIso3.get(iso);
        return { title: t('qs.country', { flag: c?.flag ?? '', country: c ? countryName(c) : '' }), qs: buildSession(game, { count: 6, rnd: seedRandom, focus: [iso], maxDifficulty: kid }) };
      }
      default: return { title: t('qs.quick'), qs: buildSession(game, { count: 8, rnd: seedRandom, surpriseRate: 0.12, maxDifficulty: kid }) };
    }
  }, [type, round, game, region, day, query, profile.settings.interests]); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (type === 'topics' && !profile.settings.interests?.length) return (
    <div className="page stack">
      <h1>🧠 {t('play.topics')}</h1>
      <section className="card stack">
        <h2 style={{ margin: 0 }}>{t('interests.title')}</h2>
        <p className="small dim" style={{ margin: 0 }}>{t('interests.help')}</p>
        <InterestPicker saveLabel={t('interests.play')} onSave={(d) => update((p) => { p.settings.interests = d; })} />
      </section>
    </div>
  );
  if (alreadyDaily) return (
    <div className="page stack">
      <Mascot mood="idle" text={t('qs.alreadyPlayed', { score: profile.daily.scores[day], streak: profile.daily.streak })} />
      <a className="btn" href={href('/play')}>{t('qs.more')}</a>
    </div>
  );
  if (!setup.qs.length) return <div className="page"><h1>{t('qs.locked')}</h1><p>{t('qs.lockedHelp')}</p><a className="btn" href={href('/play')}>{t('common.back')}</a></div>;

  if (result) {
    const pct = result.correct / result.total;
    return (
      <div className="page stack">
        {pct >= 0.8 && <Confetti />}
        <div className="card result-hero">
          <div className="big-score">{result.correct}/{result.total}</div>
          <p className="display" style={{ fontSize: 24 }}>+{result.xp} XP</p>
          {type === 'friend' && <p>{t('qs.sendBack', { name: query.get('from') ?? t('qs.yourFriend') })} <b>{result.correct}/{result.total}</b> 🏆</p>}
        </div>
        <Mascot mood={pct === 1 ? 'perfect' : pct >= 0.6 ? 'correct' : 'wrong'} text={pct === 1 ? undefined : pct >= 0.6 ? t('qs.good') : t('qs.tryAgain')} />
        <div className="row">
          {type !== 'daily' && type !== 'friend' && <button className="btn" onClick={() => { setResult(null); setRound((r) => r + 1); }}>{t('qs.playAgain')}</button>}
          <a className="btn ghost" href={href('/play')}>{t('qs.more')}</a>
        </div>
      </div>
    );
  }
  return <div className="page"><Quiz key={round} questions={setup.qs} title={setup.title} onFinish={finish} /></div>;
}
