import { useCallback, useEffect, useRef, useState } from 'react';

const HEADS_UP_KM = 3;
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
  const idx = Math.min(manual ?? auto, facts.length - 1);
  const fact = facts[idx];

  // Trip radio: every story is told in order as the journey reaches it (none skipped, even if
  // several come at once), plus a heads-up a little before things to look at on the left/right.
  const queue = useRef<string[]>([]);
  const told = useRef(new Set<string>());
  const busy = useRef(false);
  const pump = useCallback(() => {
    if (busy.current) return;
    const next = queue.current.shift();
    if (!next) { setSpeaking(false); return; }
    busy.current = true; setSpeaking(true);
    speak(next, () => { busy.current = false; pump(); });
  }, []);
  useEffect(() => { setManual(null); }, [auto]);
  useEffect(() => {
    if (!readAloud) return;
    if (told.current.size === 0) for (let k = 0; k < auto; k++) told.current.add(facts[k].id); // start from here, not from the beginning
    for (let k = 0; k <= auto && k < facts.length; k++) {
      const f = facts[k];
      if (told.current.has(f.id)) continue;
      told.current.add(f.id);
      queue.current.push(`${f.title}. ${f.text}`);
    }
    const ahead = explore ? [] : facts.slice(auto + 1).filter((f) => f.side && !told.current.has(`soon-${f.id}`) && (f.at - progress) * pathKm <= HEADS_UP_KM);
    for (const f of ahead) {
      told.current.add(`soon-${f.id}`);
      queue.current.push(t('guide.upcomingSide', { km: fmtNum(Math.max(1, Math.round((f.at - progress) * pathKm))), side: t(f.side === 'left' ? 'guide.leftShort' : 'guide.rightShort'), name: f.title }));
    }
    pump();
  }, [auto, progress, readAloud, facts, explore, pathKm, pump]);
  useEffect(() => () => stopSpeaking(), []);

  if (!fact) return <p className="small">{t('guide.empty')}</p>;
  const upcoming = facts.slice(idx + 1, idx + 4);
  const toggleAudio = () => {
    const on = !readAloud;
    setReadAloud(on);
    try { localStorage.setItem('sg.guideAudio', on ? '1' : '0'); } catch { /* private mode */ }
    if (!on) { stopSpeaking(); queue.current = []; busy.current = false; setSpeaking(false); } else { told.current.clear(); }
  };
  const readThis = () => { queue.current = []; busy.current = false; setSpeaking(true); speak(`${fact.title}. ${fact.text}`, () => setSpeaking(false)); };

  return (
    <div className="guide stack">
      <div className="guide-now" aria-live="polite">
        <div className="guide-icon" aria-hidden="true">{fact.icon}</div>
        <div className="guide-body">
          <div className="kind-tag">{manual === null ? t('guide.now') : t('guide.browsing', { n: idx + 1, total: facts.length })}</div>
          <h3 style={{ margin: '0 0 6px' }}>{fact.title}
            {fact.say && canSpeak() && <button className="say-btn" aria-label={t('guide.say')} title={t('guide.say')} onClick={() => speak(fact.say!.text, undefined, fact.say!.lang)}>🔊 <span lang={fact.say.lang}>{fact.say.text !== fact.title ? fact.say.text : ''}</span></button>}
          </h3>
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
        <label className="row small"><input type="checkbox" checked={readAloud} onChange={toggleAudio} /> {t('guide.radio')}</label>
      )}
      {upcoming.length > 0 && (
        <div className="stack">
          <b className="small">{t('guide.comingUp')}</b>
          {upcoming.map((f) => (
            <button key={f.id} className="guide-next" onClick={() => setManual(facts.indexOf(f))}>
              <span aria-hidden="true">{f.icon}</span>
              <span className="grow"><b>{f.title}</b>{f.side && <span className="small dim"> {f.side === 'left' ? '⬅️' : '➡️'}</span>}</span>
              {!explore && f.at > progress && <span className="small dim">{t('guide.inKm', { km: fmtNum(Math.max(1, Math.round((f.at - progress) * pathKm))) })}</span>}
            </button>
          ))}
        </div>
      )}
      <p className="small dim" style={{ margin: 0 }}>{t('guide.count', { n: facts.length })}</p>
    </div>
  );
}
