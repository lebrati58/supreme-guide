import { useMemo } from 'react';
import type { Position } from 'geojson';
import type { WorldFC } from '../data/loaders';

/**
 * Lightweight equirectangular SVG world map (Natural Earth 1:110m). No WebGL, no network:
 * used by “find it on the map” questions, the passport, and as a fallback when WebGL is unavailable.
 */
const W = 1000, H = 500;
const px = (lng: number) => ((lng + 180) / 360) * W;
const py = (lat: number) => ((90 - lat) / 180) * H;

function ringPath(ring: Position[]) {
  return ring.map(([x, y], i) => `${i ? 'L' : 'M'}${px(x).toFixed(1)} ${py(y).toFixed(1)}`).join('') + 'Z';
}

export interface SvgMapProps {
  world: WorldFC;
  /** [west, south, east, north] in degrees */
  view?: [number, number, number, number];
  classOf?: (num: string, iso3?: string) => string | undefined;
  onPick?: (num: string, name: string) => void;
  label: string;
  line?: [number, number][];
}

export function SvgWorldMap({ world, view, classOf, onPick, label, line }: SvgMapProps) {
  const paths = useMemo(() => world.features.filter((f) => f.properties.name !== 'Antarctica' || !view).map((f) => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    return { num: f.properties.num, name: f.properties.name, iso3: f.properties.iso3, d: polys.map((p) => p.map(ringPath).join('')).join('') };
  }), [world, view]);
  const [w, s, e, n] = view ?? [-180, -60, 180, 85];
  const vb = `${px(w)} ${py(n)} ${px(e) - px(w)} ${py(s) - py(n)}`;
  return (
    <svg className="svgmap" viewBox={vb} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      {paths.map((p, i) => (
        <path key={i} d={p.d} className={classOf?.(p.num, p.iso3)} onClick={onPick ? () => onPick(p.num, p.name) : undefined}>
          <title>{onPick ? '' : p.name}</title>
        </path>
      ))}
      {line && line.length > 1 && <polyline points={line.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')} fill="none" stroke="#ff7a1a" strokeWidth={2.2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
