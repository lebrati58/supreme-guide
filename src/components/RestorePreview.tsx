import { useEffect, useState } from 'react';
import { useApp } from '../state';
import { store } from '../storage/db';
import { planRestore, type Backup } from '../storage/backup';
import { fmtDate, fmtNum, t, tn } from '../i18n';

/** Shows what a backup contains and applies it — merge (nothing lost) or replace (after confirmation). */
export function RestorePreview({ backup, onDone, onCancel }: { backup: Backup; onDone: () => void; onCancel: () => void }) {
  const { profiles, restore, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const [localTrips, setLocalTrips] = useState<number | null>(null);
  useEffect(() => { store.getTrips().then((x) => setLocalTrips(x.length)); }, []);

  const apply = async (mode: 'merge' | 'replace') => {
    if (mode === 'replace' && !confirm(t('backup.replaceConfirm'))) return;
    setBusy(true);
    try {
      const plan = planRestore({ profiles, trips: await store.getTrips() }, backup, mode);
      await restore(plan, mode);
      toast({ icon: '✅', title: t('backup.restored'), body: tn('backup.restoredBody', plan.profiles.length, { trips: plan.trips.length }) });
      onDone();
    } finally { setBusy(false); }
  };

  const date = Date.parse(backup.exportedAt);
  return (
    <div className="stack">
      <p style={{ margin: 0 }}>{Number.isFinite(date) ? t('backup.fromDate', { date: fmtDate(date, { dateStyle: 'medium', timeStyle: 'short' }) }) : t('backup.found')}</p>
      <ul className="live-board">
        {backup.profiles.map((p) => (
          <li key={p.id}><span aria-hidden="true">{p.avatar}</span><span className="grow">{p.name}</span><b>{fmtNum(p.xp)} XP</b><span className="small dim">· {tn('profile.stampsCount', Object.keys(p.stamps).length)}</span></li>
        ))}
      </ul>
      <p className="small dim" style={{ margin: 0 }}>{tn('backup.tripsIn', backup.trips.length)}{localTrips !== null ? ` · ${tn('backup.tripsHere', localTrips)}` : ''}</p>
      <button className="btn green" disabled={busy} onClick={() => apply('merge')}>🔀 {t('backup.merge')}</button>
      <p className="small dim" style={{ margin: '-6px 0 0' }}>{t('backup.mergeHelp')}</p>
      <button className="btn small red" disabled={busy} onClick={() => apply('replace')}>{t('backup.replace')}</button>
      <button className="btn small ghost" disabled={busy} onClick={onCancel}>{t('common.cancel')}</button>
    </div>
  );
}
