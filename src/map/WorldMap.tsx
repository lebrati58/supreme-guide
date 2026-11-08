import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MLMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre 6 runs its tile parsing in a separate module worker: ship it as a hashed asset (precached for offline).
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import type { LngLat } from '../types';
import type { WorldFC } from '../data/loaders';
import { bbox, slicePath, unwrap } from '../geo/geo';
import { t } from '../i18n';

/**
 * Interactive world map (MapLibre GL JS, BSD-3).
 * - Base layer: Natural Earth 1:50m countries bundled with the app → works fully offline.
 * - “Detailed” layer (online): OpenFreeMap vector tiles (© OpenMapTiles, © OpenStreetMap contributors).
 *   Tiles viewed online are cached by the service worker, but the whole world is NOT available offline.
 */
export interface MapMarker { id: string; lngLat: LngLat; kind: 'stop' | 'end' | 'poi' | 'vehicle' | 'gps'; emoji?: string; label?: string; estimated?: boolean; onClick?: () => void }

export interface WorldMapProps {
  world: WorldFC;
  route?: LngLat[];
  progress?: number;
  markers?: MapMarker[];
  visited?: Set<string>;
  locked?: Set<string>;
  highlight?: Set<string>;
  fit?: 'route' | 'world';
  tall?: boolean;
  detailed?: boolean;
  onCountryClick?: (iso3: string | undefined, name: string) => void;
  label: string;
}

maplibregl.setWorkerUrl(workerUrl);

const OFM_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const ATTR_NE = '<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>';

function baseStyle(world: WorldFC): StyleSpecification {
  return {
    version: 8,
    sources: { countries: { type: 'geojson', data: world, attribution: ATTR_NE } },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': '#5fb4f0' } },
      ...countryLayers(),
    ],
  };
}

function countryLayers(overlay = false): maplibregl.LayerSpecification[] {
  return [
    { id: 'country-fill', type: 'fill', source: 'countries', paint: {
      'fill-color': ['case',
        ['boolean', ['feature-state', 'visited'], false], '#ffcf4d',
        ['boolean', ['feature-state', 'highlight'], false], '#ff9f43',
        ['boolean', ['feature-state', 'locked'], false], '#6b86a3',
        '#7fd17a'],
      'fill-opacity': overlay ? ['case', ['boolean', ['feature-state', 'visited'], false], 0.35, ['boolean', ['feature-state', 'highlight'], false], 0.3, 0] : 1,
    } },
    { id: 'country-line', type: 'line', source: 'countries', paint: { 'line-color': overlay ? 'rgba(80,80,80,.25)' : '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.4, 6, 1.4] } },
  ];
}

const routeLayers: maplibregl.LayerSpecification[] = [
  { id: 'route-casing', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#0b1f4d', 'line-width': 7, 'line-opacity': 0.35 } },
  { id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 3.5, 'line-dasharray': [2, 1.5] } },
  { id: 'route-done', type: 'line', source: 'route-done', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ff7a1a', 'line-width': 5 } },
];

const emptyLine = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] as number[][] } };

function supportsWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

export default function WorldMap(props: WorldMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(!supportsWebGL());
  const propsRef = useRef(props);
  propsRef.current = props;

  // create
  useEffect(() => {
    if (!el.current || failed) return;
    let m: MLMap;
    try {
      m = new maplibregl.Map({
        container: el.current, style: baseStyle(props.world), center: [10, 25], zoom: 0.6, minZoom: 0, maxZoom: 17,
        attributionControl: { compact: true }, renderWorldCopies: true, dragRotate: false, pitchWithRotate: false,
      });
    } catch (e) { console.warn('Map init failed', e); setFailed(true); return; }
    map.current = m;
    m.touchZoomRotate.disableRotation();
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    m.on('load', () => { addRouteSources(m); setLoaded(true); el.current?.setAttribute('data-loaded', '1'); });
    m.on('click', 'country-fill', (e) => {
      const f = e.features?.[0];
      if (f) propsRef.current.onCountryClick?.(f.properties?.iso3 as string | undefined, f.properties?.name as string);
    });
    m.on('error', (e) => console.warn('map error', e.error?.message));
    return () => { m.remove(); map.current = null; setLoaded(false); };
  }, [failed]); // eslint-disable-line react-hooks/exhaustive-deps

  // detailed (online) style toggle — keep our layers on top of the vector basemap
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const p = propsRef.current;
    if (p.detailed) {
      m.setStyle(OFM_STYLE, {
        transformStyle: (_prev, next) => ({
          ...next,
          sources: { ...next.sources, countries: { type: 'geojson', data: p.world, attribution: ATTR_NE }, route: { type: 'geojson', data: emptyLine }, 'route-done': { type: 'geojson', data: emptyLine } },
          layers: [...next.layers, ...countryLayers(true), ...routeLayers],
        }),
      });
    } else {
      m.setStyle(baseStyle(p.world), { diff: false });
      m.once('styledata', () => addRouteSources(m));
    }
    m.once('idle', () => { syncData(m, propsRef.current); });
  }, [props.detailed, loaded]);

  // data sync
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    if (m.isStyleLoaded()) syncData(m, props); else m.once('idle', () => syncData(m, propsRef.current));
  }, [loaded, props.route, props.progress, props.visited, props.locked, props.highlight]); // eslint-disable-line react-hooks/exhaustive-deps

  // fit
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    if (props.fit === 'route' && props.route && props.route.length > 1) {
      const b = bbox(unwrap(props.route));
      m.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 50, maxZoom: 13, duration: 900 });
    }
  }, [loaded, props.fit, props.route]);

  // markers
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    markers.current.forEach((x) => x.remove());
    // Align markers with the unwrapped route (antimeridian-crossing trips).
    let center: number | null = null;
    if (props.route && props.route.length > 1) { const b = bbox(unwrap(props.route)); center = (b[0] + b[2]) / 2; }
    const align = (p: LngLat): LngLat => (center === null ? p : [p[0] + 360 * Math.round((center - p[0]) / 360), p[1]]);
    markers.current = (props.markers ?? []).map((mk) => {
      const d = document.createElement('div');
      d.className = `marker ${mk.kind === 'end' ? 'stop end' : mk.kind}${mk.estimated ? ' est' : ''}`;
      if (mk.emoji && mk.kind !== 'stop' && mk.kind !== 'end' && mk.kind !== 'gps') d.textContent = mk.emoji;
      if (mk.label) { d.title = mk.label; d.setAttribute('aria-label', mk.label); }
      if (mk.onClick) d.addEventListener('click', (e) => { e.stopPropagation(); mk.onClick!(); });
      const marker = new maplibregl.Marker({ element: d }).setLngLat(align(mk.lngLat));
      if (mk.label && !mk.onClick) marker.setPopup(new maplibregl.Popup({ offset: 16, closeButton: false }).setText(mk.label));
      return marker.addTo(m);
    });
  }, [loaded, props.markers, props.route]);

  if (failed) return <div className="map-wrap"><div className={`map ${props.tall ? 'tall' : ''}`} style={{ display: 'grid', placeItems: 'center', padding: 20, textAlign: 'center' }}><p>{t('map.noWebgl')}</p></div></div>;
  return (
    <div className="map-wrap">
      <div ref={el} className={`map ${props.tall ? 'tall' : ''}`} role="region" aria-label={props.label} />
    </div>
  );
}

function addRouteSources(m: MLMap) {
  if (!m.getSource('route')) m.addSource('route', { type: 'geojson', data: emptyLine });
  if (!m.getSource('route-done')) m.addSource('route-done', { type: 'geojson', data: emptyLine });
  for (const l of routeLayers) if (!m.getLayer(l.id)) m.addLayer(l);
}

function syncData(m: MLMap, p: WorldMapProps) {
  if (!m.getSource('countries')) return;
  addRouteSources(m);
  const route = p.route && p.route.length > 1 ? unwrap(p.route) : [];
  (m.getSource('route') as GeoJSONSource | undefined)?.setData({ ...emptyLine, geometry: { type: 'LineString', coordinates: route } });
  const done = route.length && p.progress ? slicePath(route, p.progress) : [];
  (m.getSource('route-done') as GeoJSONSource | undefined)?.setData({ ...emptyLine, geometry: { type: 'LineString', coordinates: done.length > 1 ? done : [] } });
  for (const f of p.world.features) {
    const iso = f.properties.iso3;
    m.setFeatureState({ source: 'countries', id: f.id as number }, {
      visited: !!iso && !!p.visited?.has(iso),
      locked: !!iso && !!p.locked?.has(iso),
      highlight: !!iso && !!p.highlight?.has(iso),
    });
  }
}
