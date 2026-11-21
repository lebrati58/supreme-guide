import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { Mascot } from '../components/Mascot';
import { Confetti } from '../components/Bits';
import { KidsQuiz, type KidsResult } from '../components/KidsQuiz';
import { buildKidQuiz } from '../game/kids';
import { hashString, mulberry32 } from '../game/rng';
import { useLandmarkPhotos } from '../data/photos';
import { href } from '../router';
import { t } from '../i18n';

/** “Little travellers” quiz (Play): 6 picture questions read aloud, no timer. */
export default function Kids() {
  const { game, stamp } = useApp();
  const photos = useLandmarkPhotos();
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<KidsResult | null>(null);
  const qs = useMemo(() => (photos ? buildKidQuiz(game, photos, { count: 6, rnd: mulberry32(hashString(`kids-${Date.now()}-${round}`)) }) : []),
    [game, photos, round]);

  if (!photos) return <div className="page"><Mascot mood="idle" text={t('app.loading')} /></div>;
  if (result) return <KidsDone result={result} again={() => { setResult(null); setRound((r) => r + 1); }} />;
  return (
    <div className="page stack">
      <h1>🧸 {t('kids.title')}</h1>
      <KidsQuiz key={round} questions={qs} onFinish={(r) => {
        setResult(r);
        stamp([...new Set(qs.flatMap((q) => q.countries))].slice(0, 3), 'quiz');
      }} />
    </div>
  );
}

export function KidsDone({ result, again, backHref = '/play' }: { result: KidsResult; again?: () => void; backHref?: string }) {
  return (
    <div className="stack">
      <Confetti />
      <div className="card result-hero">
        <div className="big-score">🌟 {result.total}/{result.total}</div>
        <p className="display" style={{ fontSize: 22 }}>{t('kids.allFound')}</p>
        <p className="display" style={{ fontSize: 24, margin: 0 }}>+{result.xp} XP</p>
        {result.stickers.length > 0 && <p className="kids-sticker">{result.stickers.join(' ')} {t('kids.stickersWon', { n: result.stickers.length })}</p>}
      </div>
      <Mascot mood="perfect" text={t('kids.doneMascot')} />
      <div className="row">
        {again && <button className="btn green" onClick={again}>{t('qs.playAgain')}</button>}
        <a className="btn ghost" href={href(backHref)}>{t('common.back')}</a>
      </div>
    </div>
  );
}
