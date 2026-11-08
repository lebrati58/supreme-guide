import { useEffect, useState } from 'react';
import { useApp } from '../state';
import { fmtDate, fmtNum, t, tn } from '../i18n';
import { storageEstimate, store } from '../storage/db';
import { XPBar, Modal } from '../components/Bits';
import { LanguageList } from '../components/LanguagePicker';

const AVATARS = ['🧭', '🧳', '🦊', '🐼', '🐯', '🦁', '🐨', '🐧', '🦄', '🚀', '⚽', '🎨'];

export default function Profile({ install }: { install: { canInstall: boolean; prompt: () => void; installed: boolean } }) {
  const { profile, profiles, switchProfile, createProfile, removeProfile, update, online } = useApp();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [kid, setKid] = useState(false);
  const [est, setEst] = useState<{ usage: number; quota: number } | null>(null);
  const [credits, setCredits] = useState(false);
  useEffect(() => { storageEstimate().then(setEst); }, []);

  const exportData = async () => {
    const blob = new Blob([JSON.stringify({ profiles, trips: await store.getTrips(), exportedAt: new Date().toISOString(), app: 'supreme-guide' }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `supreme-guide-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div className="page stack">
      <h1>{profile.avatar} {profile.name}</h1>
      <div className="card"><XPBar xp={profile.xp} /></div>

      <section className="card stack" id="language">
        <h2>🌐 {t('lang.title')}</h2>
        <LanguageList />
        <p className="small dim" style={{ margin: 0 }}>{t('lang.help')}</p>
      </section>

      <section className="card stack">
        <h2>{t('profile.family')}</h2>
        <p className="small dim" style={{ margin: 0 }}>{t('profile.familyHelp')}</p>
        <div className="stack">
          {profiles.map((p) => (
            <div key={p.id} className="tile" style={{ cursor: 'default' }}>
              <span className="ti">{p.avatar}</span>
              <span className="grow"><b>{p.name}{p.kidMode ? ` · ${t('profile.kidTag')}` : ''}</b><span className="small dim">{fmtNum(p.xp)} XP · {tn('profile.stampsCount', Object.keys(p.stamps).length)}</span></span>
              {p.id === profile.id ? <span className="pill gold">{t('profile.playing')}</span> : <button className="btn small" onClick={() => switchProfile(p.id)}>{t('profile.play')}</button>}
              {profiles.length > 1 && p.id !== profile.id && <button className="btn small red" aria-label={t('profile.remove', { name: p.name })} onClick={() => confirm(t('profile.removeConfirm', { name: p.name })) && removeProfile(p.id)}>✕</button>}
            </div>
          ))}
        </div>
        <button className="btn blue" onClick={() => setAdding(true)}>{t('profile.add')}</button>
      </section>

      <section className="card stack">
        <h2>{t('profile.settings')}</h2>
        <div className="field"><label htmlFor="nm">{t('profile.name')}</label><input id="nm" className="input" value={profile.name} maxLength={24} onChange={(e) => update((p) => { p.name = e.target.value || t('profile.defaultName'); })} /></div>
        <div className="field"><label>{t('profile.avatar')}</label><div className="chips">{AVATARS.map((a) => <button key={a} className={`chip ${profile.avatar === a ? 'on' : ''}`} onClick={() => update((p) => { p.avatar = a; })} aria-label={t('profile.avatarAria', { avatar: a })}>{a}</button>)}</div></div>
        <label className="row"><input type="checkbox" checked={profile.kidMode} onChange={(e) => update((p) => { p.kidMode = e.target.checked; })} /> {t('profile.kidMode')}</label>
        <label className="row"><input type="checkbox" checked={profile.settings.reducedMotion} onChange={(e) => { update((p) => { p.settings.reducedMotion = e.target.checked; }); document.documentElement.classList.toggle('reduce-motion', e.target.checked); }} /> {t('profile.reduceMotion')}</label>
      </section>

      <section className="card stack">
        <h2>{t('profile.app')}</h2>
        <p className="small" style={{ margin: 0 }}>{t('profile.status')} {online ? t('profile.online') : t('profile.offline')} · {navigator.serviceWorker?.controller ? t('profile.cached') : t('profile.caching')}</p>
        {est && <p className="small dim" style={{ margin: 0 }}>{t('profile.storage', { used: (est.usage / 1048576).toFixed(1), quota: (est.quota / 1073741824).toFixed(1) })}</p>}
        {install.installed ? <p className="small">{t('profile.installed')}</p> : install.canInstall ? <button className="btn green" onClick={install.prompt}>{t('profile.install')}</button>
          : <p className="small dim" style={{ margin: 0 }}>{t('profile.installHelp')}</p>}
        <p className="small dim" style={{ margin: 0 }}>{t('profile.version', { version: __APP_VERSION__, date: fmtDate(new Date(__BUILD_TIME__), { dateStyle: 'medium' }) })}</p>
      </section>

      <section className="card stack">
        <h2>{t('profile.privacy')}</h2>
        <ul className="small" style={{ margin: 0, paddingInlineStart: 18 }}>
          <li>{t('profile.privacy1')}</li>
          <li>{t('profile.privacy2')}</li>
          <li>{t('profile.privacy3')}</li>
          <li>{t('profile.privacy4')}</li>
        </ul>
        <div className="row">
          <button className="btn small ghost" onClick={exportData}>{t('profile.export')}</button>
          <button className="btn small red" onClick={async () => { if (confirm(t('profile.eraseConfirm'))) { indexedDB.deleteDatabase('supreme-guide'); location.reload(); } }}>{t('profile.erase')}</button>
        </div>
      </section>

      <button className="link-btn" onClick={() => setCredits(true)}>{t('profile.credits')}</button>

      {adding && (
        <Modal label={t('profile.newPlayer')} onClose={() => setAdding(false)}>
          <h2>{t('profile.newPlayer')}</h2>
          <div className="field"><label htmlFor="pn">{t('profile.name')}</label><input id="pn" className="input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="chips" style={{ marginBottom: 12 }}>{AVATARS.map((a) => <button key={a} className={`chip ${avatar === a ? 'on' : ''}`} onClick={() => setAvatar(a)}>{a}</button>)}</div>
          <label className="row" style={{ marginBottom: 12 }}><input type="checkbox" checked={kid} onChange={(e) => setKid(e.target.checked)} /> {t('profile.kidTag')}</label>
          <button className="btn block" disabled={!name.trim()} onClick={async () => { await createProfile(name.trim(), avatar, kid); setAdding(false); setName(''); }}>{t('profile.create')}</button>
        </Modal>
      )}
      {credits && (
        <Modal label={t('profile.credits')} onClose={() => setCredits(false)}>
          <h2>{t('profile.credits')}</h2>
          {/* Licence notices stay in English: they quote the licences' official names. */}
          <ul className="small" dir="ltr" lang="en">
            <li>Supreme Guide logo & mascot © Supreme Guide.</li>
            <li>Country data: <a href="https://github.com/mledoze/countries">mledoze/countries</a> — ODbL 1.0.</li>
            <li>Country borders: <a href="https://www.naturalearthdata.com/">Natural Earth</a> via world-atlas — public domain.</li>
            <li>Airports: <a href="https://ourairports.com/data/">OurAirports</a> via airport-data-js — CC BY 4.0.</li>
            <li>Cities: <a href="https://www.geonames.org/">GeoNames</a> via all-the-cities — CC BY 4.0.</li>
            <li>Country, language and currency names: <a href="https://cldr.unicode.org/">Unicode CLDR</a> (via the browser's Intl API).</li>
            <li>Detailed map: <a href="https://openfreemap.org">OpenFreeMap</a>, © <a href="https://www.openmaptiles.org/">OpenMapTiles</a>, data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> (ODbL).</li>
            <li>Routing: <a href="https://project-osrm.org/">OSRM</a> & <a href="https://routing.openstreetmap.de/">FOSSGIS routing</a>, OSM data. Search: <a href="https://nominatim.org/">Nominatim</a>.</li>
            <li>Place cards & photos: <a href="https://www.wikipedia.org/">Wikipedia</a> / Wikimedia Commons — CC BY-SA.</li>
            <li>Map engine: <a href="https://maplibre.org/">MapLibre GL JS</a> — BSD-3-Clause. Plane icon: Material Icons — Apache-2.0. Fonts: Baloo 2 & Nunito — SIL OFL.</li>
          </ul>
          <button className="btn block" onClick={() => setCredits(false)}>{t('common.close')}</button>
        </Modal>
      )}
    </div>
  );
}
