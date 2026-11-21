import { useEffect, useRef, useState } from 'react';
import type { Question } from '../types';
import { useApp } from '../state';
import { Mascot } from './Mascot';
import { Confetti } from './Bits';
import { t } from '../i18n';
import { play } from '../game/sfx';
import { canSpeak, hasVoice, speak, stopSpeaking } from '../game/speech';
import type { KidQuestion } from '../game/kids';
import { STICKERS } from '../content/kids';

export interface KidsResult { found: number; firstTry: number; total: number; stickers: string[]; xp: number }

/**
 * “Little travellers”: the question is read aloud, answers are big pictures (tap one to hear its name
 * and choose it). No timer, never “wrong!”: try again until you find it. A sticker every 3 first tries.
 */
export function KidsQuiz({ questions, title, onFinish }: { questions: KidQuestion[]; title?: string; onFinish: (r: KidsResult) => void }) {
  const { recordAnswer, update, profile } = useApp();
  const [i, setI] = useState(0);
  const [tried, setTried] = useState<number[]>([]);
  const [found, setFound] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const [newSticker, setNewSticker] = useState<string | null>(null);
  const stats = useRef({ firstTry: 0, streak: 0, stickers: [] as string[], xp: 0 });
  const q = questions[i];

  useEffect(() => { void hasVoice().then((ok) => setNoVoice(!ok)); return () => stopSpeaking(); }, []);
  // Read each new question aloud.
  useEffect(() => { if (q) speak(q.say); }, [q]);

  if (!q) return null;

  const choose = (k: number) => {
    if (found || tried.includes(k)) return;
    const opt = q.options[k];
    if (k === q.answer) {
      const first = tried.length === 0;
      setFound(true);
      play('correct');
      speak(q.explanation);
      const st = stats.current;
      st.streak = first ? st.streak + 1 : 0;
      if (first) st.firstTry++;
      // XP like any quiz (no options stored: kid questions don't go to “Review my mistakes”).
      const asQuestion: Question = { id: q.id, kind: 'mcq', category: q.kind === 'animal' ? 'nature' : q.kind === 'flag' ? 'flags' : q.kind === 'landmark' ? 'landmarks' : 'geography',
        difficulty: 1, prompt: q.say, explanation: q.explanation, source: q.source, countries: q.countries };
      st.xp += recordAnswer(asQuestion, first, st.streak).xp;
      if (first && st.firstTry % 3 === 0) {
        const owned = new Set([...(profile.stickers ?? []), ...st.stickers]);
        const next = STICKERS.find((s) => !owned.has(s));
        if (next) {
          st.stickers.push(next);
          setNewSticker(next);
          update((p) => { p.stickers = [...new Set([...(p.stickers ?? []), next])]; });
          setTimeout(() => play('badge'), 600);
        }
      }
    } else {
      setTried((x) => [...x, k]);
      play('tap'); // a soft sound: never a “wrong!” buzzer for little ones
      speak(t('kids.tryAgain', { name: opt.label }));
    }
  };

  const next = () => {
    setNewSticker(null);
    if (i + 1 >= questions.length) {
      stopSpeaking();
      onFinish({ found: questions.length, firstTry: stats.current.firstTry, total: questions.length, stickers: stats.current.stickers, xp: stats.current.xp });
      return;
    }
    setI(i + 1); setTried([]); setFound(false);
  };

  return (
    <div className="stack kids">
      {title && <p className="small dim" style={{ margin: 0 }}>{title}</p>}
      <div className="row spread">
        <span className="pill">{i + 1} / {questions.length}</span>
        <span className="pill gold" aria-label={t('kids.stickersAria')}>{(profile.stickers ?? []).slice(-3).join(' ') || '⭐'} {(profile.stickers ?? []).length}</span>
      </div>
      <div className="question-card kids-card">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <p className="question grow" style={{ margin: 0 }}>{q.say}</p>
          {canSpeak() && <button className="btn small kids-speak" onClick={() => speak(q.say)} aria-label={t('kids.listen')}>🔊</button>}
        </div>
        {noVoice && <p className="notice small">{t('kids.noVoice')}</p>}
        <div className={`kids-options n${q.options.length}`}>
          {q.options.map((o, k) => {
            const cls = found && k === q.answer ? 'right' : tried.includes(k) ? 'tried' : '';
            return (
              <button key={k} className={`kids-opt ${cls}`} disabled={tried.includes(k) || (found && k !== q.answer)} onClick={() => choose(k)} aria-label={o.label}>
                {o.img ? <img src={o.img} alt="" loading="eager" /> : <span className="kids-emoji" aria-hidden="true">{o.emoji}</span>}
                <span className="kids-label">{o.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {!found && tried.length > 0 && <Mascot mood="surprise" text={t('kids.encourage')} />}
      {found && (
        <div className="feedback ok stack">
          {newSticker && <><Confetti /><p className="kids-sticker" role="status"><span aria-hidden="true">{newSticker}</span> {t('kids.newSticker')}</p></>}
          <p style={{ margin: 0 }}>🎉 {q.explanation}</p>
          <a className="small" href={q.source.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-2)' }}>{t('quiz.source')}: {q.source.label} ↗</a>
          <button className="btn big green" onClick={next}>{i + 1 >= questions.length ? t('kids.finish') : t('kids.next')} →</button>
        </div>
      )}
    </div>
  );
}
