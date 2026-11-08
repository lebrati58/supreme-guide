import { useEffect, useState } from 'react';
import { levelFromXp } from '../game/progression';
import { useApp } from '../state';
import { href, useRoute } from '../router';
import { t } from '../i18n';

export function XPBar({ xp }: { xp: number }) {
  const l = levelFromXp(xp);
  return (
    <div className="xp" aria-label={`Level ${l.level}, ${l.into} of ${l.need} XP`}>
      <div className="xp-level">{l.level}</div>
      <div style={{ flex: 1 }}>
        <div className="row spread small"><b>{l.title}</b><span className="dim">{l.into} / {l.need} XP</span></div>
        <div className="xp-bar"><i style={{ width: `${(100 * l.into) / l.need}%` }} /></div>
      </div>
    </div>
  );
}

const COLORS = ['#ffd36b', '#ff7a1a', '#22c55e', '#5aa0ff', '#ff5a5f', '#9b5de5', '#ffffff'];
export function Confetti({ n = 80 }: { n?: number }) {
  const [pieces] = useState(() => Array.from({ length: n }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.6, dur: 1.6 + Math.random() * 1.6, color: COLORS[i % COLORS.length], rot: Math.random() * 360,
  })));
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => <i key={i} style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.rot}deg)` }} />)}
    </div>
  );
}

export function XPFloat({ xp, nonce }: { xp: number; nonce: number }) {
  const [show, setShow] = useState(true);
  useEffect(() => { setShow(true); const t = setTimeout(() => setShow(false), 1200); return () => clearTimeout(t); }, [nonce]);
  return show && xp > 0 ? <div className="xp-float" key={nonce} aria-hidden="true">+{xp} XP</div> : null;
}

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((x) => <div className="toast" key={x.id}><span className="ti">{x.icon}</span><div><b>{x.title}</b>{x.body && <span className="small">{x.body}</span>}</div></div>)}
    </div>
  );
}

const NAV: [string, string, Parameters<typeof t>[0]][] = [
  ['/', '🏠', 'nav.home'], ['/trips', '🧳', 'nav.trips'], ['/play', '🎯', 'nav.challenges'], ['/passport', '🛂', 'nav.passport'], ['/profile', '😎', 'nav.profile'],
];
export function BottomNav() {
  const { path } = useRoute();
  const active = (p: string) => (p === '/' ? path === '/' : path.startsWith(p) || (p === '/trips' && (path.startsWith('/plan') || path.startsWith('/trip'))));
  return (
    <nav className="bottom-nav" aria-label="Main">
      {NAV.map(([p, ico, key]) => (
        <a key={p} href={href(p)} className={active(p) ? 'active' : ''} aria-current={active(p) ? 'page' : undefined}>
          <span className="ico" aria-hidden="true">{ico}</span>{t(key)}
        </a>
      ))}
    </nav>
  );
}

export function Modal({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal card paper" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
