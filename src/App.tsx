import { lazy, Suspense, useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useApp } from './state';
import { useRoute } from './router';
import { BottomNav, Toasts } from './components/Bits';
import { BrandMini } from './components/Brand';
import { levelFromXp } from './game/progression';
import Home from './screens/Home';
import { MODES, type Mode } from './types';
import { t, useLocale } from './i18n';
import { LanguageButton } from './components/LanguagePicker';
import { setSfxOptions } from './game/sfx';

const Trips = lazy(() => import('./screens/Trips'));
const Planner = lazy(() => import('./screens/Planner'));
const TripView = lazy(() => import('./screens/TripView'));
const Play = lazy(() => import('./screens/Play'));
const QuizScreen = lazy(() => import('./screens/QuizScreen'));
const Passport = lazy(() => import('./screens/Passport'));
const Profile = lazy(() => import('./screens/Profile'));
const CountryPage = lazy(() => import('./screens/Country'));
const Share = lazy(() => import('./screens/Share'));
const Live = lazy(() => import('./screens/Live'));

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export default function App() {
  const lang = useLocale(); // re-render the whole tree when the language changes
  const { profile, online } = useApp();
  const route = useRoute();
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(() => matchMedia('(display-mode: standalone)').matches);
  const { needRefresh: [needRefresh, setNeedRefresh], offlineReady: [offlineReady, setOfflineReady], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) { if (reg) setInterval(() => { if (navigator.onLine) void reg.update(); }, 60 * 60 * 1000); },
  });

  useEffect(() => {
    const boot = document.getElementById('boot');
    if (boot) { boot.style.opacity = '0'; setTimeout(() => boot.remove(), 450); }
    const onBip = (e: Event) => { e.preventDefault(); setBip(e as BIPEvent); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onBip); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  useEffect(() => { document.documentElement.classList.toggle('reduce-motion', profile.settings.reducedMotion); }, [profile.settings.reducedMotion]);
  useEffect(() => { setSfxOptions({ sound: profile.settings.sound !== false, haptics: profile.settings.haptics !== false }); }, [profile.settings.sound, profile.settings.haptics]);
  useEffect(() => {
    if (!offlineReady) return;
    const id = setTimeout(() => setOfflineReady(false), 5000);
    return () => clearTimeout(id);
  }, [offlineReady, setOfflineReady]);

  const [a, b] = route.parts;
  let screen: JSX.Element;
  switch (a) {
    case undefined: screen = <Home />; break;
    case 'trips': screen = <Trips />; break;
    case 'plan': screen = <Planner key={b} mode={(MODES.includes(b as Mode) ? b : 'flight') as Mode} />; break;
    case 'trip': screen = <TripView key={b} id={b} />; break;
    case 'play': screen = <Play />; break;
    case 'quiz': screen = <QuizScreen key={route.path + route.query.toString() + lang} type={b ?? 'quick'} query={route.query} />; break;
    case 'passport': screen = <Passport />; break;
    case 'country': screen = <CountryPage key={b} iso3={b} />; break;
    case 'live': screen = <Live query={route.query} />; break;
    case 'share': screen = <Share key={route.query.toString()} query={route.query} />; break;
    case 'profile': screen = <Profile install={{ canInstall: !!bip, installed, prompt: () => { void bip?.prompt(); setBip(null); } }} />; break;
    default: screen = <Home />;
  }

  const lvl = levelFromXp(profile.xp).level;
  return (
    <div className={`app ${needRefresh || offlineReady ? 'with-bar' : ''}`}>
      <header className="topbar">
        <BrandMini />
        <span className="grow" />
        <LanguageButton />
        <span className={`pill ${online ? 'on' : 'off'}`} title={online ? t('app.online') : t('app.offlineTitle')}>{online ? '●' : `✈︎ ${t('app.offline')}`}</span>
        <a className="pill gold" href="#/passport" style={{ textDecoration: 'none' }} aria-label={t('app.levelAria', { level: lvl, xp: profile.xp })}>⭐ {lvl}</a>
      </header>
      <main id="main">
        <Suspense fallback={<div className="page"><p className="splash-tip">{t('app.loading')}</p></div>}>{screen}</Suspense>
      </main>
      <Toasts />
      {(needRefresh || offlineReady) && (
        <div className="update-bar" role="status">
          <span>{needRefresh ? t('app.updateReady') : t('app.offlineReady')}</span>
          {needRefresh ? <button className="btn small" onClick={() => updateServiceWorker(true)}>{t('app.update')}</button>
            : <button className="btn small ghost" style={{ color: 'var(--ink)' }} onClick={() => { setOfflineReady(false); setNeedRefresh(false); }}>{t('common.ok')}</button>}
        </div>
      )}
      <BottomNav />
    </div>
  );
}
