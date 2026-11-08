import { useState } from 'react';
import { useApp } from '../state';
import { LOCALES, locale, t } from '../i18n';
import { Modal } from './Bits';

/** Change the active player's language (saved in their profile, applied instantly, works offline). */
export function useSetLanguage() {
  const { update } = useApp();
  return (code: string) => update((p) => { p.settings.lang = code; });
}

export function LanguageList({ onPicked }: { onPicked?: () => void }) {
  const set = useSetLanguage();
  const cur = locale();
  return (
    <div className="lang-grid" role="listbox" aria-label={t('lang.choose')}>
      {LOCALES.map((l) => (
        <button key={l.code} role="option" aria-selected={l.code === cur} lang={l.code} dir={l.dir}
          className={`chip lang-chip ${l.code === cur ? 'on' : ''}`} onClick={() => { set(l.code); onPicked?.(); }}>
          {l.name}
        </button>
      ))}
    </div>
  );
}

/** Compact 🌐 button for the top bar. */
export function LanguageButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="pill lang-btn" onClick={() => setOpen(true)} aria-label={t('lang.choose')} title={t('lang.choose')}>🌐 {locale().toUpperCase()}</button>
      {open && (
        <Modal label={t('lang.choose')} onClose={() => setOpen(false)}>
          <h2>🌐 {t('lang.choose')}</h2>
          <LanguageList onPicked={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}
