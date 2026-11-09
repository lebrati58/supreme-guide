import { useState } from 'react';
import { DOMAINS, type Domain } from '../content/knowledge';
import { t, type Key } from '../i18n';

export const domainLabel = (d: Domain) => t(`domain.${d}` as Key);

/** Multi-select of the knowledge domains a player enjoys. */
export function InterestPicker({ initial, onSave, saveLabel }: { initial?: Domain[]; onSave: (d: Domain[]) => void; saveLabel?: string }) {
  const [sel, setSel] = useState<Domain[]>(initial ?? []);
  const toggle = (d: Domain) => setSel((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]));
  return (
    <div className="stack">
      <div className="chips" role="group" aria-label={t('interests.title')}>
        {DOMAINS.map(({ id, emoji }) => (
          <button key={id} type="button" aria-pressed={sel.includes(id)} className={`chip ${sel.includes(id) ? 'on' : ''}`} onClick={() => toggle(id)}>{emoji} {domainLabel(id)}</button>
        ))}
      </div>
      <div className="row">
        <button className="btn small blue" disabled={!sel.length} onClick={() => onSave(sel)}>{saveLabel ?? t('interests.save')}</button>
        <button className="btn small ghost" onClick={() => onSave(DOMAINS.map((d) => d.id))}>{t('interests.all')}</button>
      </div>
    </div>
  );
}
