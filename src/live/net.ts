import type { DataConnection, Peer, PeerOptions } from 'peerjs';
import { peerIdFor, type ToGuest, type ToHost } from './logic';

/**
 * Peer-to-peer link between phones (WebRTC data channels) via PeerJS. The free public PeerJS
 * server only introduces the phones to each other; game messages then go directly from phone to
 * phone. No account, no data stored. Some strict networks (corporate wifi, a few mobile carriers)
 * block direct connections: the screen then says so.
 * For tests, a local PeerServer can be set with localStorage 'sg.peerServer' = '{"host":…,"port":…}'.
 */
function options(): PeerOptions {
  try {
    const custom = localStorage.getItem('sg.peerServer');
    if (custom) return { ...JSON.parse(custom), debug: 0 } as PeerOptions;
  } catch { /* default */ }
  return { debug: 0 };
}

async function newPeer(id?: string): Promise<Peer> {
  const { Peer } = await import('peerjs');
  return new Promise((resolve, reject) => {
    const p = id ? new Peer(id, options()) : new Peer(options());
    const timer = setTimeout(() => { p.destroy(); reject(new Error('timeout')); }, 15000);
    p.on('open', () => { clearTimeout(timer); resolve(p); });
    p.on('error', (e: Error & { type?: string }) => { clearTimeout(timer); p.destroy(); reject(Object.assign(new Error(e.type ?? e.message), { type: e.type })); });
  });
}

export interface HostLink {
  id: string;
  send: (to: string | null, m: ToGuest) => void;
  close: () => void;
}

/** Open a room. Calls back on each guest message / departure. Throws `unavailable-id` if the code is taken. */
export async function hostRoom(code: string, on: { message: (from: string, m: ToHost) => void; left: (from: string) => void }): Promise<HostLink> {
  const peer = await newPeer(peerIdFor(code));
  const conns = new Map<string, DataConnection>();
  peer.on('connection', (c) => {
    c.on('open', () => { conns.set(c.peer, c); });
    c.on('data', (d) => on.message(c.peer, d as ToHost));
    const gone = () => { if (conns.get(c.peer) === c) { conns.delete(c.peer); on.left(c.peer); } };
    c.on('close', gone);
    c.on('error', gone);
  });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch { /* destroyed */ } });
  return {
    id: peer.id,
    send: (to, m) => {
      if (to === null) conns.forEach((c) => c.open && c.send(m));
      else { const c = conns.get(to); if (c?.open) c.send(m); }
    },
    close: () => peer.destroy(),
  };
}

export interface GuestLink { id: string; send: (m: ToHost) => void; close: () => void }

export async function joinRoom(code: string, on: { message: (m: ToGuest) => void; closed: () => void }): Promise<GuestLink> {
  const peer = await newPeer();
  const conn = peer.connect(peerIdFor(code), { reliable: true });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no-host')), 12000);
    conn.on('open', () => { clearTimeout(timer); resolve(); });
    peer.on('error', (e: Error & { type?: string }) => { clearTimeout(timer); reject(new Error(e.type === 'peer-unavailable' ? 'no-host' : e.type ?? e.message)); });
  }).catch((e) => { peer.destroy(); throw e; });
  conn.on('data', (d) => on.message(d as ToGuest));
  conn.on('close', on.closed);
  return { id: peer.id, send: (m) => { if (conn.open) conn.send(m); }, close: () => peer.destroy() };
}
