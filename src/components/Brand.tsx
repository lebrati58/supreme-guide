const B = import.meta.env.BASE_URL;

/** The official Supreme Guide logo (from the original artwork). */
export function Logo({ size = 420, orbit = true }: { size?: number; orbit?: boolean }) {
  return (
    <div className="hero-logo" style={{ maxWidth: size }}>
      {orbit && <div className="hero-orbit" aria-hidden="true"><span>✈️</span></div>}
      <picture>
        <source srcSet={`${B}brand/logo-640.webp 640w, ${B}brand/logo-1024.webp 1024w`} sizes={`(max-width: 600px) 84vw, ${size}px`} type="image/webp" />
        <img src={`${B}brand/logo-640.jpg`} width={size} height={size} alt="Supreme Guide — The Global Travel Quiz Game" fetchPriority="high" />
      </picture>
    </div>
  );
}

/** Compact lockup: round mascot badge + wordmark (top bar). */
export function BrandMini() {
  return (
    <a className="brand-mini" href="#/" aria-label="Supreme Guide home">
      <img src={`${B}brand/mascot-round-256.webp`} alt="" width={40} height={40} />
      <span className="wordmark"><b>SUPREME</b> GUIDE</span>
    </a>
  );
}

export const mascotSrc = `${B}brand/mascot-round-256.webp`;
