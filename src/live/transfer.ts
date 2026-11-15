import type { DataConnection, Peer } from 'peerjs';
import { newPeer } from './net';
import { normCode } from './logic';

/**
 * Phone-to-phone transfer of a backup over a direct WebRTC channel (PeerJS only introduces the
 * phones). The sending phone shows a code / QR code and sends only after its user confirms.
 */
export const transferPeerId = (code: string) => `supreme-guide-xfer-${normCode(code).toLowerCase()}`;

type Msg = { t: 'hello'; name: string } | { t: 'backup'; json: string } | { t: 'thanks' };

export interface Sender { code: string; close: () => void }

export async function startSender(code: string, on: { connected: (name: string, send: (json: string) => void) => void; done: () => void; lost: () => void }): Promise<Sender> {
  const peer: Peer = await newPeer(transferPeerId(code));
  let busy = false;
  peer.on('connection', (c: DataConnection) => {
    if (busy) { c.on('open', () => c.close()); return; } // one receiver at a time
    busy = true;
    c.on('data', (d) => {
      const m = d as Msg;
      if (m?.t === 'hello') on.connected(String(m.name ?? '').slice(0, 24), (json) => c.send({ t: 'backup', json } satisfies Msg));
      if (m?.t === 'thanks') on.done();
    });
    c.on('close', () => { busy = false; on.lost(); });
  });
  return { code, close: () => peer.destroy() };
}

export async function startReceiver(code: string, name: string, on: { backup: (json: string) => void; lost: () => void }): Promise<{ thanks: () => void; close: () => void }> {
  const peer = await newPeer();
  const conn = peer.connect(transferPeerId(code), { reliable: true });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no-sender')), 12000);
    conn.on('open', () => { clearTimeout(timer); resolve(); });
    peer.on('error', (e: Error & { type?: string }) => { clearTimeout(timer); reject(new Error(e.type === 'peer-unavailable' ? 'no-sender' : e.type ?? e.message)); });
  }).catch((e) => { peer.destroy(); throw e; });
  conn.on('data', (d) => { const m = d as Msg; if (m?.t === 'backup' && typeof m.json === 'string') on.backup(m.json); });
  conn.on('close', on.lost);
  conn.send({ t: 'hello', name } satisfies Msg);
  return { thanks: () => conn.send({ t: 'thanks' } satisfies Msg), close: () => peer.destroy() };
}
