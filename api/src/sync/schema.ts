import { z } from 'zod';
import { COLLECTIONS, type CollectionKey } from './collections';

const collectionKeys = Object.keys(COLLECTIONS) as [CollectionKey, ...CollectionKey[]];

export type CloudDoc = {
  id: string;
  userId: string;
  updatedAt: string;
  deletedAt: string | null;
  [key: string]: unknown;
};

const APPWRITE_META = new Set([
  '$id',
  '$createdAt',
  '$updatedAt',
  '$permissions',
  '$collectionId',
  '$databaseId',
  '$sequence',
]);

export const collectionKeySchema = z.enum(collectionKeys);

export const mutationSchema = z.object({
  collection: collectionKeySchema,
  id: z.string().min(1),
  op: z.enum(['upsert', 'delete']),
  payload: z.record(z.string(), z.unknown()).default({}),
  updatedAt: z.string().min(1),
});

export const pushBodySchema = z.object({
  mutations: z.array(mutationSchema),
});

export function isCloudWinner(cloudUpdatedAt: string, mutationUpdatedAt: string): boolean {
  return cloudUpdatedAt > mutationUpdatedAt;
}

export function stripAppwriteMeta(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!APPWRITE_META.has(key)) out[key] = value;
  }
  return out;
}

export function toCloudDoc(raw: Record<string, unknown>): CloudDoc {
  const id = String(raw.$id ?? '');
  const payload = stripAppwriteMeta(raw);
  const { userId, updatedAt, deletedAt, ...rest } = payload;
  return {
    id,
    ...rest,
    userId: String(userId ?? ''),
    updatedAt: String(updatedAt ?? ''),
    deletedAt: deletedAt == null || deletedAt === '' ? null : String(deletedAt),
  };
}

export function emptyDocumentsRecord(): Record<CollectionKey, CloudDoc[]> {
  return {
    profiles: [],
    categories: [],
    tags: [],
    tasks: [],
    task_tags: [],
    subtasks: [],
  };
}
