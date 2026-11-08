import { t } from '../i18n';
const B = import.meta.env.BASE_URL;

/** The official Supreme Guide logo (from the original artwork). */
export function Logo({ size = 420, orbit = true }: { size?: number; orbit?: boolean }) {
  return (
    <div className="hero-logo" style={{ maxWidth: size }}>
      <picture>
        <source srcSet={`${B}brand/logo-640.webp 640w, ${B}brand/logo-1024.webp 1024w`} sizes={`(max-width: 600px) 78vw, ${size}px`} type="image/webp" />
        <img src={`${B}brand/logo-640.jpg`} width={size} height={size} alt={t('brand.logoAlt')} fetchPriority="high" />
      </picture>
      {orbit && (
        <>
          <div className="hero-trail" aria-hidden="true" />
          <div className="hero-orbit" aria-hidden="true">
            {/* Airliner silhouette (Material Icons “flight”, Apache-2.0), drawn nose-up and turned to fly clockwise. */}
            <svg className="hero-plane" viewBox="0 0 24 24" focusable="false">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}

/** Compact lockup: round mascot badge + wordmark (top bar). */
export function BrandMini() {
  return (
    <a className="brand-mini" href="#/" aria-label={t('brand.home')}>
      <img src={`${B}brand/mascot-round-256.webp`} alt="" width={40} height={40} />
      <span className="wordmark"><b>SUPREME</b> GUIDE</span>
    </a>
  );
}

export const mascotSrc = `${B}brand/mascot-round-256.webp`;
