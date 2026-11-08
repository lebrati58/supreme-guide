import { useApp } from '../state';
import { LANDMARKS } from '../content/landmarks';
import { href } from '../router';
import { isRegionUnlocked } from '../game/progression';
import { SvgWorldMap } from '../components/SvgWorldMap';

export default function CountryPage({ iso3 }: { iso3: string }) {
  const { byIso3, profile, world110 } = useApp();
  const c = byIso3.get(iso3);
  if (!c) return <div className="page"><h1>Unknown country</h1><a href={href('/')}>Home</a></div>;
  const marks = LANDMARKS.filter((l) => l.iso3 === iso3 || l.shared?.includes(iso3));
  const stamp = profile.stamps[iso3];
  const unlocked = isRegionUnlocked(profile, c.region);
  const pad = Math.max(8, Math.sqrt(c.area) / 60);
  return (
    <div className="page stack">
      <a className="link-btn" href="#/" onClick={(e) => { e.preventDefault(); history.back(); }}>← Back</a>
      <h1><span style={{ fontSize: '1.2em' }}>{c.flag}</span> {c.name}</h1>
      <p className="dim" style={{ marginTop: -8 }}>{c.official} · {c.subregion}</p>
      {world110 && <SvgWorldMap world={world110} view={[c.lng - pad * 2, c.lat - pad, c.lng + pad * 2, c.lat + pad]} label={`Map of ${c.name}`} classOf={(n) => (n === c.num ? 'target' : undefined)} />}
      <div className="card paper">
        <table className="simple" style={{ color: 'var(--ink)' }}>
          <tbody>
            {c.capitals.length > 0 && <tr><th>Capital{c.capitals.length > 1 ? 's' : ''}</th><td>{c.capitals.join(', ')}</td></tr>}
            <tr><th>Area</th><td>{c.area.toLocaleString('en-US')} km²</td></tr>
            {c.languages.length > 0 && <tr><th>Languages</th><td>{c.languages.join(', ')}</td></tr>}
            {c.currencies.length > 0 && <tr><th>Currency</th><td>{c.currencies.join(', ')}</td></tr>}
            {c.demonym && <tr><th>People</th><td>{c.demonym}</td></tr>}
            <tr><th>Neighbours</th><td>{c.borders.length ? c.borders.map((b) => byIso3.get(b)?.name ?? b).join(', ') : 'No land borders'}</td></tr>
          </tbody>
        </table>
        <p className="small" style={{ color: 'var(--ink-2)' }}>Data: mledoze/countries (ODbL). <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(c.name)}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-2)' }}>Read more on Wikipedia ↗</a></p>
      </div>
      {marks.length > 0 && (
        <section className="stack">
          <h2>Landmarks</h2>
          {marks.map((l) => <div key={l.id} className="tile"><span className="ti">{l.emoji}</span><span className="grow"><b>{l.name}</b><span className="small dim">{l.city} · {l.fact}</span></span></div>)}
        </section>
      )}
      <div className="row">
        {unlocked ? <a className="btn" href={href(`/quiz/country?iso=${iso3}`)}>🎯 Quiz about {c.name}</a> : <span className="pill">🔒 {c.region} unlocks with more XP</span>}
        {stamp && <span className="pill gold">🛂 Stamped {new Date(stamp.at).toLocaleDateString()}</span>}
      </div>
    </div>
  );
}
