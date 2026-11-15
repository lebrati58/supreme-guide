import { describe, expect, it } from 'vitest';
import { newProfile } from '../../src/game/progression';
import { makeBackup, mergeProfile, parseBackup, planRestore, type Backup } from '../../src/storage/backup';
import type { Trip } from '../../src/types';

const trip = (id: string, extra: Partial<Trip> = {}): Trip => ({
  id, mode: 'train', title: 'A → B', stops: [{ name: 'A', lat: 48.8, lng: 2.3 }, { name: 'B', lat: 43.3, lng: 5.4 }],
  geometry: [[2.3, 48.8], [5.4, 43.3]], geometrySource: 'stop-to-stop', distanceKm: 660, countries: [{ iso3: 'FRA', at: 0 }], createdAt: 1, ...extra,
});

describe('backup: round trip and validation', () => {
  it('an exported backup restores identically', () => {
    const p = newProfile('Ana', '🦊', false, 'fr');
    p.xp = 420; p.stamps.FRA = { iso3: 'FRA', at: 5, mode: 'train' }; p.badges['first-trip'] = 9; p.records = { survival: 7 };
    const b = parseBackup(JSON.stringify(makeBackup([p], [trip('t1', { progress: 0.5, wiki: [{ title: 'Lyon', extract: 'x', url: 'https://fr.wikipedia.org/wiki/Lyon' }] })]))) as Backup;
    expect(b.profiles[0]).toMatchObject({ id: p.id, name: 'Ana', xp: 420, records: { survival: 7 } });
    expect(b.profiles[0].stamps.FRA.mode).toBe('train');
    expect(b.trips[0].wiki?.[0].url).toBe('https://fr.wikipedia.org/wiki/Lyon');
  });

  it('rejects files that are not Supreme Guide backups', () => {
    expect(parseBackup('not json')).toBe('notJson');
    expect(parseBackup(JSON.stringify({ hello: 1 }))).toBe('notBackup');
    expect(parseBackup(JSON.stringify({ app: 'supreme-guide', profiles: [{ nope: 1 }] }))).toBe('empty');
  });

  it('neutralises hostile content: script links, absurd numbers, huge strings, bad coordinates', () => {
    const evil = {
      app: 'supreme-guide', v: 1,
      profiles: [{ id: 'x', name: 'A'.repeat(500), xp: 1e30, stats: { answered: -5 }, stamps: { FRA: { iso3: 'FRANCE', at: 1, mode: 'car' } } }],
      trips: [
        trip('ok', { wiki: [{ title: 't', extract: 'e', url: 'javascript:alert(1)' }, { title: 'ok', extract: 'e', url: 'https://ok.example', thumb: 'javascript:x' }] }),
        { ...trip('bad'), stops: [{ name: 'X', lat: 999, lng: 0 }] },
        { ...trip('badmode'), mode: 'rocket' },
      ],
    };
    const b = parseBackup(JSON.stringify(evil)) as Backup;
    expect(b.profiles[0].name.length).toBeLessThanOrEqual(24);
    expect(b.profiles[0].xp).toBe(1e9);
    expect(b.profiles[0].stats.answered).toBe(0);
    expect(b.profiles[0].stamps.FRA.iso3).toBe('FRA');
    expect(b.trips.map((t) => t.id)).toEqual(['ok']);
    expect(b.trips[0].wiki).toEqual([{ title: 'ok', extract: 'e', url: 'https://ok.example', thumb: undefined, lat: undefined, lng: undefined }]);
  });
});

describe('backup: merge keeps the best of both', () => {
  it('merges a profile: max XP and records, union of stamps and badges, earliest dates', () => {
    const a = newProfile('Ana'); a.xp = 100; a.stamps.FRA = { iso3: 'FRA', at: 50, mode: 'car' }; a.badges.b1 = 20; a.settings.lang = 'he';
    const b = structuredClone(a); b.name = 'Other name'; b.xp = 300; b.stamps.FRA = { iso3: 'FRA', at: 10, mode: 'train' }; b.stamps.ITA = { iso3: 'ITA', at: 30, mode: 'train' }; b.badges.b1 = 5; b.badges.b2 = 7; b.records = { survival: 12 }; b.settings.lang = 'en';
    const m = mergeProfile(a, b);
    expect(m.xp).toBe(300);
    expect(Object.keys(m.stamps).sort()).toEqual(['FRA', 'ITA']);
    expect(m.stamps.FRA.at).toBe(10);
    expect(m.badges).toEqual({ b1: 5, b2: 7 });
    expect(m.records?.survival).toBe(12);
    expect(m.name).toBe('Ana'); // this phone's name and settings are kept
    expect(m.settings.lang).toBe('he');
  });

  it('plans a merge (adds new, merges same ids) and a replace', () => {
    const local = { profiles: [newProfile('Ana')], trips: [trip('t1', { progress: 0.2, answeredIds: ['q1'] })] };
    const other = newProfile('Ben');
    const b = makeBackup([local.profiles[0], other], [trip('t1', { progress: 0.8, answeredIds: ['q2'] }), trip('t2')]);
    const merge = planRestore(local, b, 'merge');
    expect(merge.profiles.map((p) => p.name).sort()).toEqual(['Ana', 'Ben']);
    expect(merge.added).toEqual({ profiles: 1, trips: 1 });
    expect(merge.merged).toEqual({ profiles: 1, trips: 1 });
    const t1 = merge.trips.find((t) => t.id === 't1')!;
    expect(t1.progress).toBe(0.8);
    expect(t1.answeredIds!.sort()).toEqual(['q1', 'q2']);
    const replace = planRestore(local, b, 'replace');
    expect(replace.trips.map((t) => t.id)).toEqual(['t1', 't2']);
    expect(replace.trips[0].progress).toBe(0.8);
  });
});
