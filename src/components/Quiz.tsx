import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Question } from '../types';
import { useApp } from '../state';
import { kindLabel } from '../game/engine';
import { Mascot } from './Mascot';
import { Confetti, XPFloat } from './Bits';
import { SvgWorldMap } from './SvgWorldMap';
import { shuffle } from '../game/rng';
import type { Mood } from '../game/mascot';
import { wikiSummary } from '../transport/wiki';
import { t } from '../i18n';
import { capitalName, countryName, formatYearL, subregionLabel } from '../i18n/content';

export interface QuizResult { correct: number; total: number; xp: number; answers: { id: string; correct: boolean }[] }

interface Props {
  questions: Question[];
  title?: string;
  onFinish: (r: QuizResult) => void;
  onAnswered?: (q: Question, correct: boolean) => void;
  finishLabel?: string;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function Quiz({ questions, title, onFinish, onAnswered, finishLabel }: Props) {
  const { recordAnswer, update } = useApp();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [mood, setMood] = useState<Mood>('takeoff');
  const [nonce, setNonce] = useState(0);
  const [xpGain, setXpGain] = useState(0);
  const [celebrate, setCelebrate] = useState(0);
  const tally = useRef({ correct: 0, xp: 0, answers: [] as QuizResult['answers'] });
  const q = questions[i];
  const done = result !== null;

  const settle = useCallback((correct: boolean, timeRatio?: number) => {
    if (done) return;
    const s = correct ? streak + 1 : 0;
    setStreak(s);
    setResult(correct);
    const r = recordAnswer(q, correct, s, timeRatio);
    tally.current.xp += r.xp;
    tally.current.answers.push({ id: q.id, correct });
    if (correct) tally.current.correct++;
    setXpGain(r.xp);
    setMood(r.levelUp ? 'levelup' : correct ? (s >= 3 && s % 3 === 0 ? 'streak' : 'correct') : timeRatio === 0 ? 'timeout' : 'wrong');
    setNonce((n) => n + 1);
    if (correct && (s >= 3 || q.bonus || r.levelUp)) setCelebrate((c) => c + 1);
    onAnswered?.(q, correct);
  }, [done, streak, recordAnswer, q, onAnswered]);

  const next = () => {
    if (i + 1 >= questions.length) {
      const perfect = tally.current.correct === questions.length && questions.length >= 8;
      if (perfect) { update((p) => { p.stats.perfectRounds++; }); setCelebrate((c) => c + 1); }
      onFinish({ correct: tally.current.correct, total: questions.length, xp: tally.current.xp, answers: tally.current.answers });
      return;
    }
    setI(i + 1); setPicked(null); setResult(null); setXpGain(0);
    if (questions[i + 1].bonus) { setMood('surprise'); setNonce((n) => n + 1); }
  };

  if (!q) return null;
  return (
    <div className="quiz">
      {celebrate > 0 && <Confetti key={celebrate} n={60} />}
      <XPFloat xp={xpGain} nonce={nonce} />
      <div className="quiz-head">
        <b>{title ?? t('quiz.title')}</b>
        <span className="pill">{i + 1} / {questions.length}{streak >= 2 ? ` · 🔥${streak}` : ''}</span>
      </div>
      <div className="quiz-progress" aria-hidden="true"><i style={{ width: `${(100 * (i + (done ? 1 : 0))) / questions.length}%` }} /></div>
      <Mascot mood={mood} nonce={nonce} size={64} />

      <div className={`question-card ${q.bonus ? 'bonus' : ''}`} key={q.id + i}>
        <div className="kind-tag">{q.bonus ? t('quiz.bonusTag') : `${kindIcon(q)} ${kindLabel(q.kind)}`} · {'★'.repeat(q.difficulty)}</div>
        <h2 className="question">{q.prompt}</h2>
        {q.timeLimit && <Timer key={`t${i}`} seconds={q.timeLimit} running={!done} onTimeout={() => settle(false, 0)} onTick={() => {}} />}
        <div style={{ marginTop: 14 }}>
          {q.kind === 'chronology' ? <Chronology q={q} done={done} onSubmit={(ok) => settle(ok)} />
            : q.kind === 'mapfind' ? <MapFind q={q} done={done} onAnswer={(ok) => settle(ok)} />
            : <Choices q={q} picked={picked} done={done} onPick={(k, ratio) => { setPicked(k); settle(k === q.answer, ratio); }} />}
        </div>
      </div>

      {done && (
        <div className={`feedback ${result ? 'ok' : 'ko'}`}>
          <h3>{result ? `✅ ${t('quiz.correct')}` : picked === null && q.timeLimit ? `⏰ ${t('quiz.timeup')}` : `❌ ${t('quiz.wrong')}`}</h3>
          <p style={{ margin: '4px 0 8px' }}>{q.explanation}</p>
          {q.source && <a className="small" href={q.source.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-2)' }}>{t('quiz.source')}: {q.source.label} ↗</a>}
          <div style={{ marginTop: 12 }}>
            <button className="btn block" onClick={next} autoFocus>{i + 1 >= questions.length ? (finishLabel ?? t('common.finish')) : `${t('common.next')} →`}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function kindIcon(q: Question) {
  return ({ mapfind: '📍', chronology: '⏳', monument: '🏛️', truefalse: '⚖️', capital: '🏙️', observation: '👀', history: '📜' } as Record<string, string>)[q.kind] ?? '❓';
}

// ------------------------------------------------------------------ choices
function Choices({ q, picked, done, onPick }: { q: Question; picked: number | null; done: boolean; onPick: (k: number, timeRatio?: number) => void }) {
  const start = useRef(Date.now());
  const opts = q.options ?? [];
  const ratio = () => (q.timeLimit ? Math.max(0, 1 - (Date.now() - start.current) / (q.timeLimit * 1000)) : undefined);
  return (
    <>
      {q.kind === 'monument' && q.clue !== undefined && <MonumentVisual q={q} />}
      <div className={`answers ${opts.length === 2 ? 'two' : ''}`}>
        {opts.map((o, k) => {
          const cls = done ? (k === q.answer ? 'right' : k === picked ? 'wrong' : '') : '';
          return (
            <button key={k} className={`answer ${cls}`} disabled={done} onClick={() => onPick(k, ratio())}>
              <span className="letter">{opts.length === 2 ? (k === 0 ? '✓' : '✗') : LETTERS[k]}</span>{o}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Photo from Wikipedia when available (online or cached in an offline pack); the text clue otherwise. */
function MonumentVisual({ q }: { q: Question }) {
  const [img, setImg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    if (q.imageTitle) wikiSummary(q.imageTitle, 'en', false).then((s) => { if (alive && s?.thumb) setImg(s.thumb); });
    return () => { alive = false; };
  }, [q.imageTitle]);
  return (
    <div style={{ marginBottom: 12 }}>
      {img && !failed && <img className="monument-photo" src={img} alt={t('quiz.photoAlt')} onError={() => setFailed(true)} />}
      <p className="clue" style={{ marginTop: img && !failed ? 8 : 0 }}>🔎 {q.clue}</p>
      {img && !failed && <p className="small" style={{ color: 'var(--ink-2)', margin: 0 }}>{t('quiz.photoCredit')}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ timer
function Timer({ seconds, running, onTimeout }: { seconds: number; running: boolean; onTimeout: () => void; onTick: () => void }) {
  const [left, setLeft] = useState(seconds);
  const cb = useRef(onTimeout);
  cb.current = onTimeout;
  useEffect(() => {
    if (!running) return;
    const end = Date.now() + left * 1000;
    const id = setInterval(() => {
      const l = Math.max(0, (end - Date.now()) / 1000);
      setLeft(l);
      if (l <= 0) { clearInterval(id); cb.current(); }
    }, 100);
    return () => clearInterval(id);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ marginTop: 10 }} aria-label={t('quiz.secondsLeft', { n: Math.ceil(left) })}>
      <div className="timer"><i style={{ width: `${(100 * left) / seconds}%` }} /></div>
      <div className="small" style={{ color: 'var(--ink-2)', textAlign: 'right' }}>⏱ {t('quiz.seconds', { n: Math.ceil(left) })}</div>
    </div>
  );
}

// ------------------------------------------------------------------ chronology
function Chronology({ q, done, onSubmit }: { q: Question; done: boolean; onSubmit: (ok: boolean) => void }) {
  const items = useMemo(() => shuffle(q.order ?? [], Math.random), [q]);
  const [seq, setSeq] = useState<number[]>([]);
  const toggle = (k: number) => {
    if (done) return;
    setSeq((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  };
  const correctOrder = q.order ?? [];
  const isOk = seq.length === items.length && seq.every((k, pos) => items[k].label === correctOrder[pos].label);
  return (
    <div>
      <p className="small" style={{ color: 'var(--ink-2)', marginTop: 0 }}>{t('chrono.help')}</p>
      <div className="chrono-list">
        {items.map((it, k) => {
          const pos = seq.indexOf(k);
          const cls = done ? (correctOrder[pos]?.label === it.label ? 'ok' : 'ko') : pos >= 0 ? 'placed' : '';
          return (
            <button key={it.label} className={`chrono-item ${cls}`} onClick={() => toggle(k)} disabled={done}>
              <span className="n">{pos >= 0 ? pos + 1 : '·'}</span>
              <span style={{ flex: 1 }}>{it.label}</span>
              {done && <b>{formatYearL(it.year)}</b>}
            </button>
          );
        })}
      </div>
      {!done && <button className="btn blue block" style={{ marginTop: 12 }} disabled={seq.length !== items.length} onClick={() => onSubmit(isOk)}>{t('quiz.check')}</button>}
    </div>
  );
}

// ------------------------------------------------------------------ map find
function MapFind({ q, done, onAnswer }: { q: Question; done: boolean; onAnswer: (ok: boolean) => void }) {
  const { world110, countries } = useApp();
  const [pick, setPick] = useState<string | null>(null);
  const [world, setWorld] = useState(false);
  const [listMode, setListMode] = useState(false);
  const target = countries.find((c) => c.num === q.targetNum);
  const view = useMemo<[number, number, number, number] | undefined>(() => {
    if (world || !target) return undefined;
    const pts = countries.filter((c) => c.region === target.region && c.un && c.area > 2000);
    const lng = pts.map((c) => c.lng), lat = pts.map((c) => c.lat);
    const pad = 12;
    return [Math.max(-180, Math.min(...lng) - pad), Math.max(-60, Math.min(...lat) - pad), Math.min(180, Math.max(...lng) + pad), Math.min(85, Math.max(...lat) + pad)];
  }, [world, target, countries]);
  const options = useMemo(() => {
    if (!target) return [];
    const near = countries.filter((c) => c.un && c.iso3 !== target.iso3 && c.subregion === target.subregion).slice(0, 3);
    return shuffle([target, ...near], Math.random);
  }, [target, countries]);
  if (!world110 || !target) return <p>{t('map.unavailable')}</p>;
  const choose = (num: string) => { if (done) return; setPick(num); onAnswer(num === q.targetNum); };
  if (listMode) {
    return (
      <div className="answers">
        {options.map((c, k) => (
          <button key={c.iso3} className={`answer ${done ? (c.num === q.targetNum ? 'right' : c.num === pick ? 'wrong' : '') : ''}`} disabled={done} onClick={() => choose(c.num)}>
            <span className="letter">{LETTERS[k]}</span>{countryName(c)} — {c.capital ? t('map.capitalOf', { city: capitalName(c) }) : subregionLabel(c.subregion)}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div>
      <SvgWorldMap world={world110} view={view} label={t('map.findLabel', { country: q.targetName ?? '' })} onPick={(num) => choose(num)}
        classOf={(num) => (done && num === q.targetNum ? 'target' : num === pick ? (num === q.targetNum ? 'hit' : 'miss') : undefined)} />
      <div className="row spread" style={{ marginTop: 8 }}>
        <button className="link-btn" style={{ color: 'var(--sky-2)' }} onClick={() => setWorld((w) => !w)}>{world ? t('map.zoomRegion') : t('map.wholeWorld')}</button>
        {!done && <button className="link-btn" style={{ color: 'var(--sky-2)' }} onClick={() => setListMode(true)}>{t('map.listMode')}</button>}
      </div>
      {done && pick && pick !== q.targetNum && <p className="small" style={{ color: 'var(--ink-2)' }}>{t('map.youTapped', { tapped: (() => { const c = countries.find((x) => x.num === pick); return c ? countryName(c) : t('map.another'); })(), target: q.targetName ?? '' })}</p>}
    </div>
  );
}
