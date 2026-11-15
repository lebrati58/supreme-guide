import { useEffect, useRef, useState } from 'react';
import { useApp } from '../state';
import { store } from '../storage/db';
import { makeBackup, parseBackup, type Backup } from '../storage/backup';
import { normCode, roomCode } from '../live/logic';
import { startReceiver, startSender, type Sender } from '../live/transfer';
import { RestorePreview } from '../components/RestorePreview';
import { href } from '../router';
import { t, type Key } from '../i18n';

type Phase = 'menu' | 'connecting' | 'waiting' | 'confirm' | 'sending' | 'sent' | 'received' | 'done' | 'error';

/** Move the whole progress (all players and trips) to another phone, directly, without an account. */
export default function Transfer({ query }: { query: URLSearchParams }) {
  const { profile, profiles, online } = useApp();
  const [phase, setPhase] = useState<Phase>('menu');
  const [code, setCode] = useState(normCode(query.get('code') ?? ''));
  const [qr, setQr] = useState('');
  const [peerName, setPeerName] = useState('');
  const [err, setErr] = useState<Key>('transfer.errNetwork');
  const [backup, setBackup] = useState<Backup | null>(null);
  const sender = useRef<Sender | null>(null);
  const sendFn = useRef<((json: string) => void) | null>(null);
  const receiver = useRef<{ thanks: () => void; close: () => void } | null>(null);
  useEffect(() => () => { sender.current?.close(); receiver.current?.close(); }, []);

  const send = async () => {
    setPhase('connecting');
    for (let k = 0; k < 4; k++) {
      const c = roomCode();
      try {
        sender.current = await startSender(c, {
          connected: (name, fn) => { setPeerName(name); sendFn.current = fn; setPhase('confirm'); },
          done: () => setPhase('done'),
          lost: () => setPhase((p) => (p === 'done' || p === 'sent' ? p : 'waiting')),
        });
        setCode(c); setPhase('waiting');
        const url = `${location.origin}${location.pathname}#/transfer?code=${c}`;
        import('qrcode').then((Q) => Q.toDataURL(url, { margin: 1, width: 220 })).then(setQr).catch(() => {});
        return;
      } catch (e) { if ((e as { type?: string }).type !== 'unavailable-id') break; }
    }
    setErr('transfer.errNetwork'); setPhase('error');
  };

  const confirmSend = async () => {
    setPhase('sending');
    const json = JSON.stringify(makeBackup(profiles, await store.getTrips()));
    sendFn.current?.(json);
    setPhase('sent');
  };

  const receive = async (c: string) => {
    setPhase('connecting');
    try {
      receiver.current = await startReceiver(c, profile.name, {
        backup: (json) => {
          const b = parseBackup(json);
          if (typeof b === 'string') { setErr('transfer.errData'); setPhase('error'); return; }
          setBackup(b); setPhase('received');
        },
        lost: () => setPhase((p) => (p === 'received' || p === 'done' ? p : 'error')),
      });
      setPhase('waiting');
    } catch (e) {
      setErr((e as Error).message === 'no-sender' ? 'transfer.errNoSender' : 'transfer.errNetwork'); setPhase('error');
    }
  };

  return (
    <div className="page stack">
      <h1>📲 {t('transfer.title')}</h1>
      {!online && phase === 'menu' && <p className="notice warn">{t('transfer.needOnline')}</p>}

      {phase === 'menu' && (
        <>
          <section className="card stack">
            <h2 style={{ margin: 0 }}>📤 {t('transfer.send')}</h2>
            <p className="small dim" style={{ margin: 0 }}>{t('transfer.sendHelp')}</p>
            <button className="btn" disabled={!online} onClick={send}>{t('transfer.sendBtn')}</button>
          </section>
          <section className="card stack">
            <h2 style={{ margin: 0 }}>📥 {t('transfer.receive')}</h2>
            <p className="small dim" style={{ margin: 0 }}>{t('transfer.receiveHelp')}</p>
            <div className="field">
              <label htmlFor="xfer-code">{t('live.code')}</label>
              <input id="xfer-code" className="input live-code" value={code} maxLength={8} autoComplete="off" onChange={(e) => setCode(normCode(e.target.value))} placeholder="ABC23" />
            </div>
            <button className="btn blue" disabled={!online || code.length < 4} onClick={() => receive(code)}>{t('transfer.receiveBtn')}</button>
          </section>
          <p className="small dim">{t('transfer.privacy')}</p>
        </>
      )}

      {phase === 'connecting' && <p className="splash-tip">{t('live.connecting')}</p>}

      {phase === 'waiting' && sender.current && (
        <section className="card stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          <span className="small dim">{t('live.codeIs')}</span>
          <b className="live-code-big">{code}</b>
          {qr && <img src={qr} width={180} height={180} alt={t('transfer.qrAlt')} className="live-qr" />}
          <p className="small" style={{ margin: 0 }}>{t('transfer.waitReceiver')}</p>
        </section>
      )}
      {phase === 'waiting' && !sender.current && <p className="splash-tip">{t('transfer.waitData')}</p>}

      {phase === 'confirm' && (
        <section className="card stack">
          <p style={{ margin: 0 }}>{t('transfer.confirm', { name: peerName || '?' })}</p>
          <button className="btn green" onClick={confirmSend}>📤 {t('transfer.sendNow')}</button>
          <button className="btn small ghost" onClick={() => { sender.current?.close(); setPhase('menu'); }}>{t('common.cancel')}</button>
        </section>
      )}
      {(phase === 'sending' || phase === 'sent') && <p className="notice">{t('transfer.sentWait')}</p>}

      {phase === 'received' && backup && (
        <section className="card stack">
          <h2 style={{ margin: 0 }}>{t('transfer.received')}</h2>
          <RestorePreview backup={backup} onCancel={() => { receiver.current?.close(); setPhase('menu'); }} onDone={() => { receiver.current?.thanks(); setPhase('done'); }} />
        </section>
      )}

      {phase === 'done' && (
        <section className="card stack">
          <p style={{ margin: 0 }}>✅ {t('transfer.done')}</p>
          <a className="btn" href={href('/')}>{t('nav.home')}</a>
        </section>
      )}

      {phase === 'error' && (
        <section className="card stack">
          <p className="notice warn" style={{ margin: 0 }}>{t(err)}</p>
          <button className="btn" onClick={() => setPhase('menu')}>{t('live.back')}</button>
        </section>
      )}
    </div>
  );
}
