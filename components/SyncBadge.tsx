import { useEffect } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import type { SyncStatus } from '@/lib/sync/types';
import './SyncBadge.scss';

const LABELS: Record<SyncStatus, string> = {
  synced: 'Synchronisé',
  pending: 'Synchronisation en cours',
  offline: 'Hors ligne',
  error: 'Erreur de synchronisation',
};

export function SyncBadge() {
  const status = useSyncStore((s) => s.status);
  const refreshStatus = useSyncStore((s) => s.refreshStatus);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  return (
    <span
      className={`sync-badge sync-badge--${status}`}
      title={LABELS[status]}
      aria-label={LABELS[status]}
    />
  );
}
