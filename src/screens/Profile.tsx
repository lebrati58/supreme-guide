import { useEffect, useState } from 'react';
import { useApp } from '../state';
import { LOCALES } from '../i18n';
import { storageEstimate, store } from '../storage/db';
import { XPBar, Modal } from '../components/Bits';

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

      <section className="card stack">
        <h2>👨‍👩‍👧 Family mode</h2>
        <p className="small dim" style={{ margin: 0 }}>Several players can share this device. Each has their own XP, passport and badges. Everything stays on this device.</p>
        <div className="stack">
          {profiles.map((p) => (
            <div key={p.id} className="tile" style={{ cursor: 'default' }}>
              <span className="ti">{p.avatar}</span>
              <span className="grow"><b>{p.name}{p.kidMode ? ' · 🧒 Kid mode' : ''}</b><span className="small dim">{p.xp} XP · {Object.keys(p.stamps).length} stamps</span></span>
              {p.id === profile.id ? <span className="pill gold">Playing</span> : <button className="btn small" onClick={() => switchProfile(p.id)}>Play</button>}
              {profiles.length > 1 && p.id !== profile.id && <button className="btn small red" aria-label={`Remove ${p.name}`} onClick={() => confirm(`Remove ${p.name} and their progress?`) && removeProfile(p.id)}>✕</button>}
            </div>
          ))}
        </div>
        <button className="btn blue" onClick={() => setAdding(true)}>➕ Add a player</button>
      </section>

      <section className="card stack">
        <h2>⚙️ Settings</h2>
        <div className="field"><label htmlFor="nm">Name</label><input id="nm" className="input" value={profile.name} maxLength={24} onChange={(e) => update((p) => { p.name = e.target.value || 'Traveller'; })} /></div>
        <div className="field"><label>Avatar</label><div className="chips">{AVATARS.map((a) => <button key={a} className={`chip ${profile.avatar === a ? 'on' : ''}`} onClick={() => update((p) => { p.avatar = a; })} aria-label={`Avatar ${a}`}>{a}</button>)}</div></div>
        <label className="row"><input type="checkbox" checked={profile.kidMode} onChange={(e) => update((p) => { p.kidMode = e.target.checked; })} /> 🧒 Kid mode (easier questions, extra-gentle mascot)</label>
        <label className="row"><input type="checkbox" checked={profile.settings.reducedMotion} onChange={(e) => { update((p) => { p.settings.reducedMotion = e.target.checked; }); document.documentElement.classList.toggle('reduce-motion', e.target.checked); }} /> Reduce animations</label>
        <div className="field">
          <label htmlFor="lang">Language</label>
          <select id="lang" className="input" value={profile.settings.lang} onChange={(e) => update((p) => { p.settings.lang = e.target.value; })}>
            {LOCALES.map((l) => <option key={l.code} value={l.code} disabled={!l.ready}>{l.name}{l.ready ? '' : ' — coming soon'}</option>)}
          </select>
        </div>
      </section>

      <section className="card stack">
        <h2>📲 App & offline</h2>
        <p className="small" style={{ margin: 0 }}>Status: {online ? '🟢 online' : '🔴 offline'} · {navigator.serviceWorker?.controller ? '✅ offline-ready (app cached)' : '⏳ offline cache installing — reload once while online'}</p>
        {est && <p className="small dim" style={{ margin: 0 }}>Storage used: {(est.usage / 1048576).toFixed(1)} MB of {(est.quota / 1073741824).toFixed(1)} GB available.</p>}
        {install.installed ? <p className="small">✅ Installed as an app.</p> : install.canInstall ? <button className="btn green" onClick={install.prompt}>📲 Install Supreme Guide</button>
          : <p className="small dim" style={{ margin: 0 }}>To install: on iPhone use Share → “Add to Home Screen”; on Android/desktop use the browser menu → “Install app”.</p>}
        <p className="small dim" style={{ margin: 0 }}>Version {__APP_VERSION__} · built {new Date(__BUILD_TIME__).toLocaleDateString()}</p>
      </section>

      <section className="card stack">
        <h2>🔒 Privacy</h2>
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>No account, no tracking, no ads, no analytics.</li>
          <li>Progress, trips and family profiles are stored only on this device (IndexedDB).</li>
          <li>GPS is off by default, used only when you switch it on, and never leaves your device.</li>
          <li>Online features call public services directly: OpenFreeMap (detailed map), Wikipedia (place cards), OpenStreetMap Nominatim/OSRM (search & routes).</li>
        </ul>
        <div className="row">
          <button className="btn small ghost" onClick={exportData}>⬇️ Export my data</button>
          <button className="btn small red" onClick={async () => { if (confirm('Erase ALL players, trips and progress on this device?')) { indexedDB.deleteDatabase('supreme-guide'); location.reload(); } }}>🗑️ Erase everything</button>
        </div>
      </section>

      <button className="link-btn" onClick={() => setCredits(true)}>Credits & licences</button>

      {adding && (
        <Modal label="Add a player" onClose={() => setAdding(false)}>
          <h2>➕ New player</h2>
          <div className="field"><label htmlFor="pn">Name</label><input id="pn" className="input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="chips" style={{ marginBottom: 12 }}>{AVATARS.map((a) => <button key={a} className={`chip ${avatar === a ? 'on' : ''}`} onClick={() => setAvatar(a)}>{a}</button>)}</div>
          <label className="row" style={{ marginBottom: 12 }}><input type="checkbox" checked={kid} onChange={(e) => setKid(e.target.checked)} /> 🧒 Kid mode</label>
          <button className="btn block" disabled={!name.trim()} onClick={async () => { await createProfile(name.trim(), avatar, kid); setAdding(false); setName(''); }}>Create</button>
        </Modal>
      )}
      {credits && (
        <Modal label="Credits" onClose={() => setCredits(false)}>
          <h2>Credits & licences</h2>
          <ul className="small">
            <li>Supreme Guide logo & mascot © Supreme Guide.</li>
            <li>Country data: <a href="https://github.com/mledoze/countries">mledoze/countries</a> — ODbL 1.0.</li>
            <li>Country borders: <a href="https://www.naturalearthdata.com/">Natural Earth</a> via world-atlas — public domain.</li>
            <li>Airports: <a href="https://ourairports.com/data/">OurAirports</a> via airport-data-js — CC BY 4.0.</li>
            <li>Cities: <a href="https://www.geonames.org/">GeoNames</a> via all-the-cities — CC BY 4.0.</li>
            <li>Detailed map: <a href="https://openfreemap.org">OpenFreeMap</a>, © <a href="https://www.openmaptiles.org/">OpenMapTiles</a>, data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> (ODbL).</li>
            <li>Routing: <a href="https://project-osrm.org/">OSRM</a> & <a href="https://routing.openstreetmap.de/">FOSSGIS routing</a>, OSM data. Search: <a href="https://nominatim.org/">Nominatim</a>.</li>
            <li>Place cards & photos: <a href="https://www.wikipedia.org/">Wikipedia</a> / Wikimedia Commons — CC BY-SA.</li>
            <li>Map engine: <a href="https://maplibre.org/">MapLibre GL JS</a> — BSD-3-Clause. Fonts: Baloo 2 & Nunito — SIL OFL.</li>
          </ul>
          <button className="btn block" onClick={() => setCredits(false)}>Close</button>
        </Modal>
      )}
    </div>
  );
}
