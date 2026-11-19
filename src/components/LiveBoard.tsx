import { fmtNum, t } from '../i18n';
import { ranking, teamScores, type LiveMode, type LivePlayer } from '../live/logic';

/** Scoreboard shared by the Live (several phones) and Duel (one phone) games. */
export function Board({ list, compact, me, mode }: { list: LivePlayer[]; compact?: boolean; me?: string; mode: LiveMode }) {
  return (
    <ol className="live-board">
      {ranking(list).map((p, k) => (
        <li key={p.id} className={`${p.id === me ? 'me' : ''} ${p.out ? 'out' : ''}`}>
          <span className="rank">{p.out ? '💀' : k + 1}</span><span aria-hidden="true">{p.avatar}</span>
          {mode === 'teams' && <span aria-label={t(p.team === 1 ? 'live.teamRed' : 'live.teamBlue')}>{p.team === 1 ? '🔴' : '🔵'}</span>}
          <span className="grow">{p.name}{!compact && p.last ? <small className="dim"> {p.last.points ? `+${fmtNum(p.last.points)}` : '✗'}</small> : null}</span>
          <b>{fmtNum(p.score)}</b>
        </li>
      ))}
    </ol>
  );
}

export function TeamBanner({ players, mode }: { players: LivePlayer[]; mode: LiveMode }) {
  if (mode !== 'teams') return null;
  const [b, r] = teamScores(players);
  return (
    <div className="team-banner" role="status">
      <span className={b >= r ? 'lead' : ''}>🔵 {t('live.teamBlue')} <b>{fmtNum(b)}</b></span>
      <span className={r > b ? 'lead' : ''}>🔴 {t('live.teamRed')} <b>{fmtNum(r)}</b></span>
    </div>
  );
}
