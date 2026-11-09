import type { LegendPack } from '../content/legendary';
import { canSpeak, speak } from '../game/speech';
import { languageName, t, type Key } from '../i18n';

/** Useful phrases in the local language of a legendary journey, read aloud by a local voice. */
export function PhrasesCard({ legend }: { legend: LegendPack }) {
  const { local } = legend;
  const voice = canSpeak();
  const lang = languageName(local.lang, local.name);
  return (
    <section className="card stack phrases" aria-labelledby="phr-h">
      <h3 id="phr-h" style={{ margin: 0 }}>{t('phrase.title', { lang })}</h3>
      <p className="small dim" style={{ margin: 0 }}>{t('phrase.help')}</p>
      <ul className="phrase-list">
        {local.phrases.map((p) => (
          <li key={p.key}>
            <span className="grow">
              <b lang={local.lang}>{p.text}</b>
              {p.say && <span className="small dim"> · {p.say}</span>}
              <span className="small block">{t(`phrase.${p.key}` as Key)}</span>
            </span>
            {voice && <button className="btn small ghost" aria-label={t('phrase.listen', { text: p.text })} onClick={() => speak(p.text, undefined, local.lang)}>🔊</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
