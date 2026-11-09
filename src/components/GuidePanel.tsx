import { useEffect, useRef, useState } from 'react';
import type { GuideFact } from '../game/guide';
import { currentFactIndex } from '../game/guide';
import { canSpeak, speak, stopSpeaking } from '../game/speech';
import { fmtNum, t } from '../i18n';

/**
 * Guide mode: the Supreme Guide tells you about the places you pass — no questions.
 * The “now” card follows the trip's progress; you can browse freely and have it read aloud.
 */
export function GuidePanel({ facts, progress, pathKm, explore }: { facts: GuideFact[]; progress: number; pathKm: number; explore: boolean }) {
  const auto = currentFactIndex(facts, progress);
  const [manual, setManual] = useState<number | null>(null);
  const [readAloud, setReadAloud] = useState(() => { try { return localStorage.getItem('sg.guideAudio') === '1'; } catch { return false; } });
  const [speaking, setSpeaking] = useState(false);
  const lastSpoken = useRef<string | null>(null);
  const idx = Math.min(manual ?? auto, facts.length - 1);
  const fact = facts[idx];

  // When the journey moves on, follow it again (unless the player is browsing) and narrate.
  useEffect(() => { setManual(null); }, [auto]);
  useEffect(() => {
    if (!readAloud || !fact || manual !== null || lastSpoken.current === fact.id) return;
    lastSpoken.current = fact.id;
    setSpeaking(true);
    speak(`${fact.title}. ${fact.text}`, () => setSpeaking(false));
  }, [fact, readAloud, manual]);
  useEffect(() => () => stopSpeaking(), []);

  if (!fact) return <p className="small">{t('guide.empty')}</p>;
  const upcoming = facts.slice(idx + 1, idx + 4);
  const toggleAudio = () => {
    const on = !readAloud;
    setReadAloud(on);
    try { localStorage.setItem('sg.guideAudio', on ? '1' : '0'); } catch { /* private mode */ }
    if (!on) { stopSpeaking(); setSpeaking(false); } else { lastSpoken.current = null; }
  };
  const readThis = () => { setSpeaking(true); speak(`${fact.title}. ${fact.text}`, () => setSpeaking(false)); };

  return (
    <div className="guide stack">
      <div className="guide-now" aria-live="polite">
        <div className="guide-icon" aria-hidden="true">{fact.icon}</div>
        <div className="guide-body">
          <div className="kind-tag">{manual === null ? t('guide.now') : t('guide.browsing', { n: idx + 1, total: facts.length })}</div>
          <h3 style={{ margin: '0 0 6px' }}>{fact.title}</h3>
          <p style={{ margin: 0 }}>{fact.text}</p>
          {fact.source && <a className="small" href={fact.source.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-2)' }}>{t('quiz.source')}: {fact.source.label} ↗</a>}
        </div>
      </div>
      <div className="row">
        <button className="btn small ghost" style={{ color: 'var(--ink)' }} disabled={idx === 0} onClick={() => setManual(Math.max(0, idx - 1))} aria-label={t('guide.prev')}>‹</button>
        <button className="btn small ghost" style={{ color: 'var(--ink)' }} disabled={idx >= facts.length - 1} onClick={() => setManual(Math.min(facts.length - 1, idx + 1))} aria-label={t('guide.next')}>›</button>
        {manual !== null && <button className="link-btn" style={{ color: 'var(--sky-2)' }} onClick={() => setManual(null)}>{t('guide.backToNow')}</button>}
        {canSpeak() && <button className="btn small blue" onClick={speaking ? () => { stopSpeaking(); setSpeaking(false); } : readThis}>{speaking ? t('guide.stop') : t('guide.read')}</button>}
      </div>
      {canSpeak() && (
        <label className="row small"><input type="checkbox" checked={readAloud} onChange={toggleAudio} /> {t('guide.auto')}</label>
      )}
      {upcoming.length > 0 && (
        <div className="stack">
          <b className="small">{t('guide.comingUp')}</b>
          {upcoming.map((f) => (
            <button key={f.id} className="guide-next" onClick={() => setManual(facts.indexOf(f))}>
              <span aria-hidden="true">{f.icon}</span>
              <span className="grow"><b>{f.title}</b></span>
              {!explore && f.at > progress && <span className="small dim">{t('guide.inKm', { km: fmtNum(Math.max(1, Math.round((f.at - progress) * pathKm))) })}</span>}
            </button>
          ))}
        </div>
      )}
      <p className="small dim" style={{ margin: 0 }}>{t('guide.count', { n: facts.length })}</p>
    </div>
  );
}
