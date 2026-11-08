import { useMemo } from 'react';
import { say, type Mood } from '../game/mascot';
import { mascotSrc } from './Brand';

/** The animated Supreme Guide mascot with a contextual speech bubble. */
export function Mascot({ mood = 'idle', text, nonce = 0, size = 76 }: { mood?: Mood; text?: string; nonce?: number; size?: number }) {
  // A new line is drawn whenever mood or nonce changes — never repeating until the pool is exhausted.
  const line = useMemo(() => text ?? say(mood), [mood, nonce, text]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`mascot ${mood}`} key={`${mood}-${nonce}`}>
      <div className="mascot-face" style={{ width: size, height: size }}>
        <img src={mascotSrc} alt="Supreme Guide mascot" width={size} height={size} />
      </div>
      <div className="bubble" role="status" aria-live="polite">{line}</div>
    </div>
  );
}
