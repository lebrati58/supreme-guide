import { openDB, type IDBPDatabase } from 'idb';
import type { Trip } from '../types';
import type { Profile } from '../game/progression';

/**
 * Local-first persistence. Everything stays on the device (privacy by default, works offline).
 * `outbox` queues events for an optional future sync backend (none is configured).
 */
const DB_NAME = 'supreme-guide';
const DB_VERSION = 1;

interface OutboxItem { id?: number; type: string; payload: unknown; at: number }

let dbp: Promise<IDBPDatabase> | null = null;
const memory = { profiles: new Map<string, Profile>(), trips: new Map<string, Trip>(), kv: new Map<string, unknown>(), outbox: [] as OutboxItem[] };
let useMemory = false;

function db() {
  if (useMemory) return null;
  if (!dbp) {
    if (typeof indexedDB === 'undefined') { useMemory = true; return null; }
    dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        d.createObjectStore('profiles', { keyPath: 'id' });
        d.createObjectStore('trips', { keyPath: 'id' });
        d.createObjectStore('kv');
        d.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
      },
    }).catch((e) => { console.warn('IndexedDB unavailable, using memory', e); useMemory = true; throw e; });
  }
  return dbp;
}

async function run<T>(idb: (d: IDBPDatabase) => Promise<T>, mem: () => T): Promise<T> {
  const p = db();
  if (!p) return mem();
  try { return await idb(await p); } catch { useMemory = true; return mem(); }
}

export const store = {
  getProfiles: () => run((d) => d.getAll('profiles') as Promise<Profile[]>, () => [...memory.profiles.values()]),
  putProfile: (p: Profile) => run((d) => d.put('profiles', structuredClone(p)).then(() => undefined), () => { memory.profiles.set(p.id, structuredClone(p)); }),
  deleteProfile: (id: string) => run((d) => d.delete('profiles', id), () => { memory.profiles.delete(id); }),
  getTrips: () => run((d) => d.getAll('trips') as Promise<Trip[]>, () => [...memory.trips.values()]),
  getTrip: (id: string) => run((d) => d.get('trips', id) as Promise<Trip | undefined>, () => memory.trips.get(id)),
  putTrip: (t: Trip) => run((d) => d.put('trips', structuredClone(t)).then(() => undefined), () => { memory.trips.set(t.id, structuredClone(t)); }),
  deleteTrip: (id: string) => run((d) => d.delete('trips', id), () => { memory.trips.delete(id); }),
  get: <T,>(k: string) => run((d) => d.get('kv', k) as Promise<T | undefined>, () => memory.kv.get(k) as T | undefined),
  set: (k: string, v: unknown) => run((d) => d.put('kv', v, k).then(() => undefined), () => { memory.kv.set(k, v); }),
  enqueue: (type: string, payload: unknown) => run((d) => d.add('outbox', { type, payload, at: Date.now() }).then(() => undefined), () => { memory.outbox.push({ type, payload, at: Date.now() }); }),
  outbox: () => run((d) => d.getAll('outbox') as Promise<OutboxItem[]>, () => memory.outbox.slice()),
  clearOutbox: (ids: number[]) => run(async (d) => { const tx = d.transaction('outbox', 'readwrite'); await Promise.all(ids.map((i) => tx.store.delete(i))); await tx.done; }, () => { memory.outbox = []; }),
  isPersistent: () => !useMemory,
};

/** Ask the browser not to evict offline packs under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try { const e = await navigator.storage?.estimate?.(); return e ? { usage: e.usage ?? 0, quota: e.quota ?? 0 } : null; } catch { return null; }
}
