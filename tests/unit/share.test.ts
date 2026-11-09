import { describe, expect, it } from 'vitest';
import { decodeGeohash, parseShared } from '../../src/transport/shareParse';

describe('shared navigation links', () => {
  it('decodes geohashes (Waze short links)', () => {
    const p = decodeGeohash('u4pruydqqvj')!; // reference example from the geohash article: 57.64911, 10.40744
    expect(p.lat).toBeCloseTo(57.64911, 4);
    expect(p.lng).toBeCloseTo(10.40744, 4);
    expect(decodeGeohash('not-a-hash!')).toBeNull();
  });
  it('reads Waze links', () => {
    expect(parseShared({ url: 'https://waze.com/ul?ll=48.8584%2C2.2945&navigate=yes' })).toMatchObject({ kind: 'point', lat: 48.8584, lng: 2.2945 });
    expect(parseShared({ text: 'Drive to Eiffel Tower https://waze.com/ul/hu09tvw0f' })).toMatchObject({ kind: 'point', label: 'Drive to Eiffel Tower' });
    expect(parseShared({ url: 'https://www.waze.com/live-map/directions?to=ll.43.2965%2C5.3698' })).toMatchObject({ lat: 43.2965, lng: 5.3698 });
  });
  it('reads Google Maps, Apple Maps and geo: links', () => {
    expect(parseShared({ url: 'https://www.google.com/maps/place/Lyon/@45.764,4.8357,13z' })).toMatchObject({ lat: 45.764, lng: 4.8357 });
    expect(parseShared({ url: 'https://www.google.com/maps/dir/?api=1&destination=41.9028,12.4964' })).toMatchObject({ lat: 41.9028, lng: 12.4964 });
    expect(parseShared({ url: 'https://www.google.com/maps/place/X/data=!3d35.6586!4d139.7454' })).toMatchObject({ lat: 35.6586, lng: 139.7454 });
    expect(parseShared({ url: 'https://maps.apple.com/?ll=37.8199,-122.4783&q=Golden%20Gate' })).toMatchObject({ lat: 37.8199, lng: -122.4783 });
    expect(parseShared({ text: 'geo:31.7767,35.2345' })).toMatchObject({ lat: 31.7767, lng: 35.2345 });
    expect(parseShared({ text: '32.0853, 34.7818' })).toMatchObject({ lat: 32.0853, lng: 34.7818 });
  });
  it('falls back to a place search for plain text or text queries', () => {
    expect(parseShared({ url: 'https://maps.google.com/?q=Piazza+Navona+Roma' })).toEqual({ kind: 'query', query: 'Piazza Navona Roma' });
    expect(parseShared({ text: 'Mont-Saint-Michel, France' })).toEqual({ kind: 'query', query: 'Mont-Saint-Michel, France' });
    expect(parseShared({})).toBeNull();
  });
});
