import { transaction } from '@/lib/db/client';
import { apiFetch } from './client';
import {
  deleteEntity,
  docId,
  getLocalUpdatedAt,
  upsertEntity,
} from './mapper';
import { shouldApplyCloud } from './merge';
import { listOutbox, removeOutbox } from './outbox';
import type { CloudDocument, OutboxEntry, SyncEntity } from './types';

const DEFAULT_SINCE = '1970-01-01T00:00:00.000Z';
const SYNC_ENTITY_ORDER: SyncEntity[] = [
  'profiles',
  'categories',
  'tags',
  'tasks',
  'task_tags',
  'subtasks',
];

type PullResponse = {
  since: string;
  documents: Record<SyncEntity, CloudDocument[]>;
};

type PushResponse = {
  applied: string[];
  winners: CloudDocument[];
};

function lastSyncKey(userId: string): string {
  return `sync:lastSyncAt:${userId}`;
}

export async function getLastSyncAt(userId: string): Promise<string | null> {
  const stored = await chrome.storage.local.get([lastSyncKey(userId)]);
  return (stored[lastSyncKey(userId)] as string | undefined) ?? null;
}

export async function setLastSyncAt(
  userId: string,
  iso: string,
): Promise<void> {
  await chrome.storage.local.set({ [lastSyncKey(userId)]: iso });
}

function normalizeCloudDoc(doc: Record<string, unknown>): CloudDocument {
  return {
    ...doc,
    $id: String(doc.id ?? doc.$id ?? ''),
  } as CloudDocument;
}

function applyDocument(entity: SyncEntity, doc: CloudDocument): void {
  const id = docId(doc);
  const localUpdatedAt = getLocalUpdatedAt(entity, id);
  const action = shouldApplyCloud(localUpdatedAt, doc);
  if (action === 'skip') return;
  if (action === 'delete') {
    deleteEntity(entity, doc);
    return;
  }
  upsertEntity(entity, doc);
}

function applyPullDocuments(documents: Record<SyncEntity, CloudDocument[]>): void {
  transaction(() => {
    for (const entity of SYNC_ENTITY_ORDER) {
      const docs = documents[entity] ?? [];
      for (const raw of docs) {
        applyDocument(entity, normalizeCloudDoc(raw));
      }
    }
  });
}

export async function runPull(token: string, userId: string): Promise<void> {
  const since = (await getLastSyncAt(userId)) ?? DEFAULT_SINCE;
  const response = await apiFetch<PullResponse>(
    `/sync/pull?since=${encodeURIComponent(since)}`,
    { token },
  );
  applyPullDocuments(response.documents);
  await setLastSyncAt(userId, new Date().toISOString());
}

export async function runPush(token: string, userId: string): Promise<void> {
  const entries = await listOutbox();
  if (entries.length === 0) return;

  const mutations = entries.map((entry: OutboxEntry) => ({
    collection: entry.entity,
    id: entry.entityId,
    op: entry.op,
    payload: entry.payload,
    updatedAt: entry.updatedAt,
  }));

  const response = await apiFetch<PushResponse>('/sync/push', {
    method: 'POST',
    token,
    body: JSON.stringify({ mutations }),
  });

  const mutationByEntityId = new Map(
    entries.map((entry) => [entry.entityId, entry]),
  );

  transaction(() => {
    for (const winner of response.winners) {
      const normalized = normalizeCloudDoc(winner);
      const entry = mutationByEntityId.get(docId(normalized));
      if (entry) {
        applyDocument(entry.entity, normalized);
      }
    }
  });

  const resolvedEntityIds = new Set([
    ...response.applied,
    ...response.winners.map((w) => docId(w)),
  ]);

  const removeIds = entries
    .filter((entry) => resolvedEntityIds.has(entry.entityId))
    .map((entry) => entry.id);

  if (removeIds.length > 0) {
    await removeOutbox(removeIds);
  }
}
