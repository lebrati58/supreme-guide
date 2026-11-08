import { useMemo } from 'react';
import { useApp } from '../state';
import { SvgWorldMap } from '../components/SvgWorldMap';
import { MODE_META } from '../transport/trips';
import { href } from '../router';
import { XPBar } from '../components/Bits';
import { fmtDate, t, tc } from '../i18n';
import { countryName, regionLabel } from '../i18n/content';

export default function Passport() {
  const { profile, byIso3, world110, badges } = useApp();
  const stamps = useMemo(() => Object.values(profile.stamps).sort((a, b) => b.at - a.at), [profile.stamps]);
  const visited = new Set(stamps.map((s) => s.iso3));
  const byRegion = useMemo(() => {
    const m: Record<string, number> = {};
    stamps.forEach((s) => { const r = byIso3.get(s.iso3)?.region ?? 'Other'; m[r] = (m[r] ?? 0) + 1; });
    return m;
  }, [stamps, byIso3]);
  return (
    <div className="page stack">
      <div className="passport stack">
        <div className="row spread">
          <div>
            <div className="small dim" style={{ letterSpacing: '.2em' }}>PASSPORT · {t('passport.word')}</div>
            <h1 style={{ margin: 0 }}>{profile.avatar} {profile.name}</h1>
          </div>
          <div style={{ fontSize: 46 }} aria-hidden="true">🛂</div>
        </div>
        <XPBar xp={profile.xp} />
        <div className="chips">{Object.entries(byRegion).map(([r, n]) => <span key={r} className="pill">{regionLabel(r)}: {n}</span>)}</div>
        {world110 && <SvgWorldMap world={world110} label={t('passport.mapLabel')} classOf={(_n, iso) => (iso && visited.has(iso) ? 'visited' : undefined)} />}
        <h2>{t('passport.stamps', { n: stamps.length })}</h2>
        {stamps.length === 0 && <p className="dim">{t('passport.empty')}</p>}
        <div className="stamps">
          {stamps.map((s, i) => {
            const c = byIso3.get(s.iso3);
            return (
              <a key={s.iso3} className="stamp" href={href(`/country/${s.iso3}`)} style={{ '--r': `${((i * 37) % 24) - 12}deg`, textDecoration: 'none' } as React.CSSProperties}>
                <span><span className="f">{c?.flag || '🏳️'}</span>{c ? countryName(c) : s.iso3}<br />{s.mode === 'quiz' ? '🎯' : MODE_META[s.mode].emoji} {fmtDate(s.at, { month: 'short', year: '2-digit' })}</span>
              </a>
            );
          })}
        </div>
      </div>
      <h2>{t('passport.badges', { n: Object.keys(profile.badges).length, total: badges.length })}</h2>
      <div className="badge-grid">
        {badges.map((b) => (
          <div key={b.id} className={`badge ${profile.badges[b.id] ? '' : 'locked'}`}>
            <span className="e" aria-hidden="true">{b.emoji}</span><b>{tc(`badge.${b.id}.name`, b.name)}</b><span className="small dim">{tc(`badge.${b.id}.desc`, b.desc)}</span>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>{t('passport.stats')}</h3>
        <div className="stat-row">
          <div className="stat"><b>{profile.stats.answered}</b><span className="small">{t('passport.answers')}</span></div>
          <div className="stat"><b>{profile.stats.answered ? Math.round((100 * profile.stats.correct) / profile.stats.answered) : 0}%</b><span className="small">{t('passport.accuracy')}</span></div>
          <div className="stat"><b>{profile.stats.bestStreak}</b><span className="small">{t('passport.bestStreak')}</span></div>
        </div>
      </div>
    </div>
  );
}
