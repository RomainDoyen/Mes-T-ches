import { transaction } from '@/lib/db/client';
import { enqueueAllLocalRelations } from '@/lib/repositories/tasks';
import { apiFetch } from './client';
import { taskTagEntityId } from './ids';
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

const APPWRITE_UID = /^[a-zA-Z0-9][a-zA-Z0-9_]{0,35}$/;

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

/** Bumped when task_tag id format changes (Appwrite ≤36 chars). */
function relationsSeedKey(userId: string): string {
  return `sync:relationsSeeded:v2:${userId}`;
}

function isValidAppwriteUid(id: string): boolean {
  return id.length <= 36 && APPWRITE_UID.test(id);
}

/** Fix legacy `taskId__tagId` outbox rows that Appwrite rejects. */
function normalizeOutboxEntry(entry: OutboxEntry): OutboxEntry {
  if (entry.entity !== 'task_tags') return entry;
  const taskId = String(entry.payload.taskId ?? '');
  const tagId = String(entry.payload.tagId ?? '');
  if (!taskId || !tagId) return entry;
  const entityId = taskTagEntityId(taskId, tagId);
  if (entry.entityId === entityId) return entry;
  return { ...entry, entityId };
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

async function seedRelationsOnce(userId: string): Promise<void> {
  const key = relationsSeedKey(userId);
  const stored = await chrome.storage.local.get([key]);
  if (stored[key]) return;

  // Drop invalid legacy task_tags outbox rows before re-seeding.
  const entries = await listOutbox();
  const drop = entries
    .filter(
      (e) => e.entity === 'task_tags' && !isValidAppwriteUid(e.entityId),
    )
    .map((e) => e.id);
  if (drop.length > 0) await removeOutbox(drop);

  await enqueueAllLocalRelations();
  await chrome.storage.local.set({ [key]: true });
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
  await seedRelationsOnce(userId);
  const entries = await listOutbox();
  if (entries.length === 0) return;

  const mutations = entries.map((entry: OutboxEntry) => {
    const normalized = normalizeOutboxEntry(entry);
    return {
      collection: normalized.entity,
      id: normalized.entityId,
      op: normalized.op,
      payload: normalized.payload,
      updatedAt: normalized.updatedAt,
    };
  });

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
