import { useEffect, useState } from 'react';

/**
 * Small offline photos of the landmarks (public/photos/landmarks, precached), from Wikimedia Commons
 * under free licences. Each one comes with its credit — author, licence, file page — which is shown
 * with the photo, as the licences require. Built by scripts/build_landmark_photos.py.
 */
export interface LandmarkPhoto { f: string; a: string; l: string; u: string; lu?: string }
export type LandmarkPhotos = Record<string, LandmarkPhoto>;

let cache: LandmarkPhotos | null = null;
let pending: Promise<LandmarkPhotos> | null = null;

export function loadLandmarkPhotos(): Promise<LandmarkPhotos> {
  pending ??= fetch(`${import.meta.env.BASE_URL}data/landmark-photos.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .then((d: LandmarkPhotos) => (cache = d))
    .catch(() => { pending = null; return {}; });
  return pending;
}

export const photoUrl = (p: LandmarkPhoto) => `${import.meta.env.BASE_URL}${p.f}`;

/** The photos once loaded (null while loading). */
export function useLandmarkPhotos(): LandmarkPhotos | null {
  const [p, setP] = useState<LandmarkPhotos | null>(cache);
  useEffect(() => { if (!cache) { let alive = true; loadLandmarkPhotos().then((d) => alive && setP(d)); return () => { alive = false; }; } }, []);
  return p;
}
