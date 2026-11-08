import { store } from './db';

/**
 * Sync-ready outbox. No remote backend is connected (accounts/leaderboards are a future,
 * opt-in feature — see ARCHITECTURE.md). When a `RemoteSync` is registered, queued events are
 * flushed whenever the connection comes back.
 */
export interface RemoteSync { push(items: { type: string; payload: unknown; at: number }[]): Promise<void> }

let remote: RemoteSync | null = null;
export const registerRemote = (r: RemoteSync | null) => { remote = r; void flush(); };

export async function flush(): Promise<number> {
  if (!remote || !navigator.onLine) return 0;
  const items = await store.outbox();
  if (!items.length) return 0;
  await remote.push(items);
  await store.clearOutbox(items.map((i) => i.id!).filter((x) => x !== undefined));
  return items.length;
}

if (typeof window !== 'undefined') window.addEventListener('online', () => { void flush(); });
