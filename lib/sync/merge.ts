export type { CloudDocument, OutboxEntry, SyncEntity, SyncStatus } from './types';

function compareUpdatedAt(a: string, b: string): number {
  return a.localeCompare(b);
}

export function pickWinner<T extends { updatedAt: string }>(
  local: T | null,
  cloud: T | null,
): T | null {
  if (local == null) return cloud;
  if (cloud == null) return local;
  return compareUpdatedAt(cloud.updatedAt, local.updatedAt) >= 0 ? cloud : local;
}

export function shouldApplyCloud(
  localUpdatedAt: string | null,
  cloud: { updatedAt: string; deletedAt: string | null },
): 'apply' | 'delete' | 'skip' {
  if (localUpdatedAt != null && compareUpdatedAt(localUpdatedAt, cloud.updatedAt) > 0) {
    return 'skip';
  }

  if (cloud.deletedAt != null) {
    return 'delete';
  }

  return 'apply';
}
