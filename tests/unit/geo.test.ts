import { describe, expect, it } from 'vitest';
import { greatCircle, haversineKm, locateOnPath, pathLengthKm, pointAlong, slicePath, unwrap } from '../../src/geo/geo';
import type { LngLat } from '../../src/types';

const CDG: LngLat = [2.5479, 49.0097];
const JFK: LngLat = [-73.7781, 40.6413];

describe('geodesy', () => {
  it('haversine CDG–JFK ≈ 5,835 km', () => {
    expect(haversineKm(CDG, JFK)).toBeGreaterThan(5800);
    expect(haversineKm(CDG, JFK)).toBeLessThan(5870);
  });
  it('great circle keeps endpoints and length', () => {
    const g = greatCircle(CDG, JFK, 50);
    expect(g[0][0]).toBeCloseTo(CDG[0], 5);
    expect(g[g.length - 1][1]).toBeCloseTo(JFK[1], 5);
    expect(pathLengthKm(g)).toBeCloseTo(haversineKm(CDG, JFK), 0);
    // A great circle from Paris to New York bulges north of both endpoints.
    expect(Math.max(...g.map((p) => p[1]))).toBeGreaterThan(51);
  });
  it('pointAlong and locateOnPath are consistent', () => {
    const g = greatCircle(CDG, JFK, 25);
    const mid = pointAlong(g, 0.5);
    const loc = locateOnPath(g, mid);
    expect(loc.fraction).toBeGreaterThan(0.47);
    expect(loc.fraction).toBeLessThan(0.53);
    expect(loc.offKm).toBeLessThan(5);
    expect(pathLengthKm(slicePath(g, 0.25))).toBeCloseTo(pathLengthKm(g) * 0.25, -1);
  });
  it('unwrap makes antimeridian crossings continuous', () => {
    const g = unwrap(greatCircle([-118.4, 33.9], [151.2, -33.9], 100)); // LAX → SYD
    for (let i = 1; i < g.length; i++) expect(Math.abs(g[i][0] - g[i - 1][0])).toBeLessThan(180);
  });
});
