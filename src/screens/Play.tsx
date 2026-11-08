import { useState } from 'react';
import { useApp } from '../state';
import { isRegionUnlocked, levelFromXp, TOUR } from '../game/progression';
import { href } from '../router';
import { todayKey } from '../game/rng';
import { Mascot } from '../components/Mascot';

export default function Play() {
  const { profile, profiles } = useApp();
  const lvl = levelFromXp(profile.xp).level;
  const [copied, setCopied] = useState(false);
  const challengeLink = () => {
    const seed = Math.floor(Math.random() * 1e9).toString(36);
    return `${location.origin}${location.pathname}#/quiz/friend?seed=${seed}&from=${encodeURIComponent(profile.name)}`;
  };
  const share = async () => {
    const url = challengeLink();
    try {
      if (navigator.share) await navigator.share({ title: 'Supreme Guide challenge', text: `${profile.name} challenges you to a travel quiz! Same 10 questions — beat my score.`, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); }
    } catch { /* user cancelled */ }
  };
  const board = profiles.slice().sort((a, b) => b.xp - a.xp);
  return (
    <div className="page stack">
      <h1>🎯 Challenges</h1>
      <Mascot mood="idle" text="Pick your poison. I mean… your challenge." />
      <div className="grid grid-2">
        <a className="tile card gold" style={{ color: 'var(--ink)' }} href={href('/quiz/daily')}><span className="ti">📅</span><span className="grow"><b>Daily challenge</b><span className="small dim">{profile.daily.scores[todayKey()] !== undefined ? 'Done today ✓' : 'Same 5 questions for everyone today'}</span></span></a>
        <a className="tile" href={href('/quiz/blitz')}><span className="ti">⚡</span><span className="grow"><b>Blitz</b><span className="small dim">10 quick questions · 10 s each · time bonus</span></span></a>
        <a className="tile" href={href('/quiz/quick')}><span className="ti">🎲</span><span className="grow"><b>Quick world quiz</b><span className="small dim">8 mixed questions from everywhere</span></span></a>
        <a className="tile" href={href('/quiz/map')}><span className="ti">📍</span><span className="grow"><b>Map master</b><span className="small dim">Find 8 countries on the map</span></span></a>
        <a className="tile" href={href('/quiz/timeline')}><span className="ti">⏳</span><span className="grow"><b>Time traveller</b><span className="small dim">5 timelines to put in order</span></span></a>
        <a className="tile" href={href('/quiz/landmarks')}><span className="ti">🏛️</span><span className="grow"><b>Landmark hunter</b><span className="small dim">Recognise monuments and natural wonders</span></span></a>
      </div>

      <h2>🌍 World Tour</h2>
      <p className="dim small" style={{ marginTop: -8 }}>Unlock new regions as you level up. You’re level {lvl}.</p>
      <div className="grid grid-2">
        {TOUR.map((t) => {
          const open = isRegionUnlocked(profile, t.region);
          const stars = profile.tourStars[t.region] ?? 0;
          return open ? (
            <a key={t.region} className="tile" href={href(`/quiz/tour?region=${t.region}`)}><span className="ti">{t.emoji}</span><span className="grow"><b>{t.region}</b><span className="small dim">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)} best result</span></span><span aria-hidden="true">›</span></a>
          ) : (
            <div key={t.region} className="tile locked" aria-disabled="true"><span className="ti">🔒</span><span className="grow"><b>{t.region}</b><span className="small dim">Unlocks at level {t.unlockLevel}</span></span></div>
          );
        })}
      </div>

      <h2>🤝 Friends & family</h2>
      <div className="card stack">
        <p style={{ margin: 0 }}>Send a challenge link: your friend gets the <b>same 10 questions</b>. No account, no data sent anywhere — just a link.</p>
        <button className="btn blue" onClick={share}>📨 Challenge a friend</button>
        {copied && <p className="small">Link copied! Paste it in any chat.</p>}
      </div>
      <div className="card">
        <h3>👨‍👩‍👧 Family leaderboard (this device)</h3>
        <table className="simple">
          <tbody>
            {board.map((p, i) => <tr key={p.id}><td>{['🥇', '🥈', '🥉'][i] ?? i + 1}</td><td>{p.avatar} {p.name}{p.kidMode ? ' 🧒' : ''}</td><td style={{ textAlign: 'right' }}><b>{p.xp}</b> XP</td></tr>)}
          </tbody>
        </table>
        <p className="small dim">Add family members in <a href={href('/profile')}>Profile</a>. Online leaderboards are planned as an opt-in feature.</p>
      </div>
    </div>
  );
}
