import { useMemo } from 'react';
import { lineText, nextLine, type Mood } from '../game/mascot';
import { mascotSrc } from './Brand';
import { t } from '../i18n';

/** The animated Supreme Guide mascot with a contextual speech bubble. */
export function Mascot({ mood = 'idle', text, nonce = 0, size = 76 }: { mood?: Mood; text?: string; nonce?: number; size?: number }) {
  // A new line is drawn whenever mood or nonce changes — never repeating until the pool is exhausted.
  // Only its index is remembered: the text is translated on every render, so switching language updates it.
  const idx = useMemo(() => nextLine(mood), [mood, nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  const line = text ?? lineText(mood, idx);
  return (
    <div className={`mascot ${mood}`} key={`${mood}-${nonce}`}>
      <div className="mascot-face" style={{ width: size, height: size }}>
        <img src={mascotSrc} alt={t('mascot.alt')} width={size} height={size} />
      </div>
      <div className="bubble" role="status" aria-live="polite">{line}</div>
    </div>
  );
}
