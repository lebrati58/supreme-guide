import { useState } from 'react';
import { useApp } from '../state';
import { isRegionUnlocked, levelFromXp, TOUR } from '../game/progression';
import { href } from '../router';
import { todayKey } from '../game/rng';
import { Mascot } from '../components/Mascot';
import { fmtNum, t } from '../i18n';
import { regionLabel } from '../i18n/content';

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
      if (navigator.share) await navigator.share({ title: t('play.shareTitle'), text: t('play.shareText', { name: profile.name }), url });
      else { await navigator.clipboard.writeText(url); setCopied(true); }
    } catch { /* user cancelled */ }
  };
  const board = profiles.slice().sort((a, b) => b.xp - a.xp);
  const tile = (to: string, icon: string, title: string, sub: string) => (
    <a className="tile" href={href(to)}><span className="ti">{icon}</span><span className="grow"><b>{title}</b><span className="small dim">{sub}</span></span></a>
  );
  return (
    <div className="page stack">
      <h1>{t('play.title')}</h1>
      <Mascot mood="idle" text={t('play.mascot')} />
      <div className="grid grid-2">
        <a className="tile card gold" style={{ color: 'var(--ink)' }} href={href('/quiz/daily')}><span className="ti">📅</span><span className="grow"><b>{t('home.daily')}</b><span className="small dim">{profile.daily.scores[todayKey()] !== undefined ? t('play.dailyDone') : t('home.dailyPitch')}</span></span></a>
        {tile('/quiz/blitz', '⚡', t('play.blitz'), t('play.blitzSub'))}
        {tile('/quiz/quick', '🎲', t('play.quick'), t('play.quickSub'))}
        {tile('/quiz/map', '📍', t('play.map'), t('play.mapSub'))}
        {tile('/quiz/timeline', '⏳', t('play.timeline'), t('play.timelineSub'))}
        {tile('/quiz/landmarks', '🏛️', t('play.landmarks'), t('play.landmarksSub'))}
      </div>

      <h2>🌍 {t('home.tour')}</h2>
      <p className="dim small" style={{ marginTop: -8 }}>{t('play.tourHelp', { level: lvl })}</p>
      <div className="grid grid-2">
        {TOUR.map((x) => {
          const open = isRegionUnlocked(profile, x.region);
          const stars = profile.tourStars[x.region] ?? 0;
          return open ? (
            <a key={x.region} className="tile" href={href(`/quiz/tour?region=${x.region}`)}><span className="ti">{x.emoji}</span><span className="grow"><b>{regionLabel(x.region)}</b><span className="small dim">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)} {t('play.best')}</span></span><span aria-hidden="true" className="chev">›</span></a>
          ) : (
            <div key={x.region} className="tile locked" aria-disabled="true"><span className="ti">🔒</span><span className="grow"><b>{regionLabel(x.region)}</b><span className="small dim">{t('play.unlocksAt', { level: x.unlockLevel })}</span></span></div>
          );
        })}
      </div>

      <h2>{t('play.friends')}</h2>
      <div className="card stack">
        <p style={{ margin: 0 }}>{t('play.friendsHelp')}</p>
        <button className="btn blue" onClick={share}>{t('play.challenge')}</button>
        {copied && <p className="small">{t('play.copied')}</p>}
      </div>
      <div className="card">
        <h3>{t('play.leaderboard')}</h3>
        <table className="simple">
          <tbody>
            {board.map((p, i) => <tr key={p.id}><td>{['🥇', '🥈', '🥉'][i] ?? i + 1}</td><td>{p.avatar} {p.name}{p.kidMode ? ' 🧒' : ''}</td><td style={{ textAlign: 'end' }}><b>{fmtNum(p.xp)}</b> XP</td></tr>)}
          </tbody>
        </table>
        <p className="small dim">{t('play.leaderboardHelp')} <a href={href('/profile')}>{t('nav.profile')}</a></p>
      </div>
    </div>
  );
}
