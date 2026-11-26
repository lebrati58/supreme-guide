import { useState } from 'react';
import { MODES, type Mode } from '../types';
import { Bingo } from '../components/Bingo';
import { MODE_META } from '../transport/trips';
import { href } from '../router';
import { t, type Key } from '../i18n';

/** Road bingo from Play: pick how you travel, then play (fully offline). */
export default function BingoScreen() {
  const [mode, setMode] = useState<Mode | null>(null);
  return (
    <div className="page stack">
      {!mode ? (
        <>
          <h1>🎯 {t('bingo.title')}</h1>
          <p className="dim" style={{ margin: 0 }}>{t('bingo.pickMode')}</p>
          <div className="chips">
            {MODES.map((m) => <button key={m} className="chip" onClick={() => setMode(m)}>{MODE_META[m].emoji} {t(`mode.${m}` as Key)}</button>)}
          </div>
          <a className="btn ghost" href={href('/play')}>{t('common.back')}</a>
        </>
      ) : <Bingo key={mode} mode={mode} saveKey={`bingo-play-${mode}`} onExit={() => setMode(null)} />}
    </div>
  );
}
