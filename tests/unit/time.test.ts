import { describe, expect, it } from 'vitest';
import { formatLocal, zonedToUtc } from '../../src/transport/time';
import { buildSchedule, flightStatus, normaliseFlightNumber, estimateBlockMinutes } from '../../src/transport/flight';
import type { Airport, FlightInfo } from '../../src/types';

const ap = (iata: string, lat: number, lng: number, tz: string): Airport => ({ iata, icao: '', name: iata, cc: '', lat, lng, tz, size: 'L' });
const CDG = ap('CDG', 49.0097, 2.5479, 'Europe/Paris');
const JFK = ap('JFK', 40.6413, -73.7781, 'America/New_York');
const TLV = ap('TLV', 32.0114, 34.8867, 'Asia/Jerusalem');
const LAX = ap('LAX', 33.9416, -118.4085, 'America/Los_Angeles');
const SYD = ap('SYD', -33.9399, 151.1753, 'Australia/Sydney');

describe('time zones', () => {
  it('converts local wall time to UTC (summer and winter)', () => {
    expect(new Date(zonedToUtc('2026-07-01', '10:00', 'Europe/Paris')).toISOString()).toBe('2026-07-01T08:00:00.000Z');
    expect(new Date(zonedToUtc('2026-01-15', '10:00', 'Europe/Paris')).toISOString()).toBe('2026-01-15T09:00:00.000Z');
    expect(new Date(zonedToUtc('2026-07-01', '18:30', 'America/New_York')).toISOString()).toBe('2026-07-01T22:30:00.000Z');
    expect(new Date(zonedToUtc('2026-03-08', '12:00', 'Asia/Tokyo')).toISOString()).toBe('2026-03-08T03:00:00.000Z');
  });
  it('round-trips through formatLocal', () => {
    const t = zonedToUtc('2026-10-20', '23:45', 'Asia/Jerusalem');
    expect(formatLocal(t, 'Asia/Jerusalem')).toBe('23:45');
  });
});

describe('flight schedule & estimate', () => {
  it('rolls an overnight eastbound arrival to the next day', () => {
    const s = buildSchedule(JFK, CDG, { date: '2026-06-10', depLocal: '18:00', arrLocal: '07:30' });
    expect((s.arrUtc - s.depUtc) / 3600000).toBeCloseTo(7.5, 5);
  });
  it('handles crossing the date line (LAX → SYD arrives two calendar days later)', () => {
    const s = buildSchedule(LAX, SYD, { date: '2026-06-10', depLocal: '22:30', arrLocal: '06:30' });
    const h = (s.arrUtc - s.depUtc) / 3600000;
    expect(h).toBeGreaterThan(14);
    expect(h).toBeLessThan(16);
  });
  it('estimates block time when arrival is unknown and flags it', () => {
    const s = buildSchedule(TLV, CDG, { date: '2026-06-10', depLocal: '08:00' });
    expect(s.estimated).toBe(true);
    const h = (s.arrUtc - s.depUtc) / 3600000;
    expect(h).toBeGreaterThan(4); expect(h).toBeLessThan(6);
    expect(estimateBlockMinutes(0)).toBe(30);
  });
  it('computes progress phases with delays', () => {
    const f: FlightInfo = { from: 'CDG', to: 'JFK', date: '', depLocal: '', arrLocal: '', depUtc: 0, arrUtc: 8 * 3600000, delayMin: 60, scheduleSource: 'player' };
    const path: [number, number][] = [[2.5, 49], [-73.8, 40.6]];
    expect(flightStatus(f, path, 30 * 60000).phase).toBe('before');
    const mid = flightStatus(f, path, 5 * 3600000);
    expect(mid.phase).toBe('enroute');
    expect(mid.fraction).toBeCloseTo(0.5, 5);
    expect(flightStatus(f, path, 10 * 3600000).phase).toBe('arrived');
  });
  it('validates flight numbers', () => {
    expect(normaliseFlightNumber('af 1234')).toBe('AF1234');
    expect(normaliseFlightNumber('LY315')).toBe('LY315');
    expect(normaliseFlightNumber('U21234')).toBe('U21234');
    expect(normaliseFlightNumber('hello')).toBeNull();
  });
});
