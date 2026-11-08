import { useApp } from '../state';
import { LANDMARKS } from '../content/landmarks';
import { href } from '../router';
import { isRegionUnlocked } from '../game/progression';
import { SvgWorldMap } from '../components/SvgWorldMap';
import { fmtDate, fmtNum, listJoin, locale, t } from '../i18n';
import { capitalsList, countryName, currencyLabel, languagesLabel, lmCity, lmFact, lmName, regionLabel, subregionLabel } from '../i18n/content';

export default function CountryPage({ iso3 }: { iso3: string }) {
  const { byIso3, profile, world110 } = useApp();
  const c = byIso3.get(iso3);
  if (!c) return <div className="page"><h1>{t('country.unknown')}</h1><a href={href('/')}>{t('nav.home')}</a></div>;
  const marks = LANDMARKS.filter((l) => l.iso3 === iso3 || l.shared?.includes(iso3));
  const stamp = profile.stamps[iso3];
  const unlocked = isRegionUnlocked(profile, c.region);
  const pad = Math.max(8, Math.sqrt(c.area) / 60);
  const name = countryName(c);
  const neighbours = c.borders.map((b) => byIso3.get(b)).filter((x): x is NonNullable<typeof x> => !!x).map(countryName);
  return (
    <div className="page stack">
      <a className="link-btn" href="#/" onClick={(e) => { e.preventDefault(); history.back(); }}>{t('common.backArrow')}</a>
      <h1><span style={{ fontSize: '1.2em' }}>{c.flag}</span> {name}</h1>
      <p className="dim" style={{ marginTop: -8 }}>{locale() === 'en' ? `${c.official} · ` : ''}{subregionLabel(c.subregion)}</p>
      {world110 && <SvgWorldMap world={world110} view={[c.lng - pad * 2, c.lat - pad, c.lng + pad * 2, c.lat + pad]} label={t('country.mapLabel', { country: name })} classOf={(n) => (n === c.num ? 'target' : undefined)} />}
      <div className="card paper">
        <table className="simple" style={{ color: 'var(--ink)' }}>
          <tbody>
            {c.capitals.length > 0 && <tr><th>{c.capitals.length > 1 ? t('country.capitals') : t('country.capital')}</th><td>{listJoin(capitalsList(c))}</td></tr>}
            <tr><th>{t('country.region')}</th><td>{regionLabel(c.region)}</td></tr>
            <tr><th>{t('country.area')}</th><td>{fmtNum(Math.round(c.area))} km²</td></tr>
            {c.languages.length > 0 && <tr><th>{t('country.languages')}</th><td>{listJoin(languagesLabel(c))}</td></tr>}
            {c.currencies.length > 0 && <tr><th>{t('country.currency')}</th><td>{listJoin(c.currencies.map((_, i) => currencyLabel(c, i)))}</td></tr>}
            <tr><th>{t('country.neighbours')}</th><td>{neighbours.length ? listJoin(neighbours) : t('country.noBorders')}</td></tr>
          </tbody>
        </table>
        <p className="small" style={{ color: 'var(--ink-2)' }}>{t('country.source')} <a href={`https://${locale()}.wikipedia.org/wiki/${encodeURIComponent(name)}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-2)' }}>{t('country.wiki')}</a></p>
      </div>
      {marks.length > 0 && (
        <section className="stack">
          <h2>{t('country.landmarks')}</h2>
          {marks.map((l) => <div key={l.id} className="tile"><span className="ti">{l.emoji}</span><span className="grow"><b>{lmName(l)}</b><span className="small dim">{lmCity(l)} · {lmFact(l)}</span></span></div>)}
        </section>
      )}
      <div className="row">
        {unlocked ? <a className="btn" href={href(`/quiz/country?iso=${iso3}`)}>{t('country.quiz', { country: name })}</a> : <span className="pill">{t('country.locked', { region: regionLabel(c.region) })}</span>}
        {stamp && <span className="pill gold">{t('country.stamped', { date: fmtDate(stamp.at, { dateStyle: 'medium' }) })}</span>}
      </div>
    </div>
  );
}
