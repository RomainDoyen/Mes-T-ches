import { create } from 'zustand';
import { initDb, isDbReady } from '@/lib/db/client';
import { ApiError } from '@/lib/sync/client';
import { getLastSyncAt, runPull, runPush } from '@/lib/sync/engine';
import { listOutbox } from '@/lib/sync/outbox';
import type { SyncStatus } from '@/lib/sync/types';

const TOKEN_KEY = 'auth:token';
const USER_KEY = 'auth:user';

interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  lastError: string | null;
  refreshStatus: () => Promise<void>;
  syncNow: () => Promise<void>;
}

function isOfflineError(error: unknown): boolean {
  return error instanceof TypeError;
}

async function readAuth(): Promise<{
  token: string | null;
  userId: string | null;
}> {
  const stored = await chrome.storage.local.get([TOKEN_KEY, USER_KEY]);
  const token = (stored[TOKEN_KEY] as string | undefined) ?? null;
  const user = stored[USER_KEY] as { id: string } | undefined;
  return { token, userId: user?.id ?? null };
}

async function computeStatus(lastError: string | null): Promise<SyncStatus> {
  if (lastError) return 'error';
  const outbox = await listOutbox();
  if (outbox.length > 0) return 'pending';
  return 'synced';
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'synced',
  lastSyncAt: null,
  lastError: null,

  refreshStatus: async () => {
    const { userId } = await readAuth();
    const lastSyncAt = userId ? await getLastSyncAt(userId) : null;
    const status = await computeStatus(get().lastError);
    set({ lastSyncAt, status });
  },

  syncNow: async () => {
    const { token, userId } = await readAuth();
    if (!token || !userId) return;

    set({ status: 'pending', lastError: null });

    try {
      if (!isDbReady()) {
        await initDb(userId);
      }

      await runPush(token, userId);
      await runPull(token, userId);

      const lastSyncAt = await getLastSyncAt(userId);
      set({
        lastSyncAt,
        lastError: null,
        status: await computeStatus(null),
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Sync failed';

      set({
        lastError: message,
        status: isOfflineError(error) ? 'offline' : 'error',
      });
      throw error;
    }
  },
}));

export async function drainSync(): Promise<void> {
  await useSyncStore.getState().syncNow();
}
