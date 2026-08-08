import type { CollectionKey } from './collections';

/** Maps extension outbox camelCase keys → Appwrite TablesDB column keys. */
const FIELD_MAP: Record<CollectionKey, Record<string, string>> = {
  profiles: {
    name: 'name',
    color: 'color',
    createdAt: 'created_at',
    created_at: 'created_at',
  },
  categories: {
    profileId: 'profile_id',
    profile_id: 'profile_id',
    name: 'name',
    color: 'color',
    emoji: 'emoji',
    createdAt: 'created_at',
    created_at: 'created_at',
  },
  tags: {
    profileId: 'profile_id',
    profile_id: 'profile_id',
    name: 'name',
    color: 'color',
    createdAt: 'created_at',
    created_at: 'created_at',
  },
  tasks: {
    profileId: 'profile_id',
    profile_id: 'profile_id',
    title: 'title',
    description: 'description',
    status: 'status',
    priority: 'priority',
    dueAt: 'due_at',
    due_at: 'due_at',
    categoryId: 'category_id',
    category_id: 'category_id',
    pinned: 'pinned',
    position: 'position',
    createdAt: 'created_at',
    created_at: 'created_at',
    updatedAt: 'updated_at',
    updated_at: 'updated_at',
    completedAt: 'completed_at',
    completed_at: 'completed_at',
  },
  task_tags: {
    taskId: 'task_id',
    task_id: 'task_id',
    tagId: 'tag_id',
    tag_id: 'tag_id',
  },
  subtasks: {
    taskId: 'task_id',
    task_id: 'task_id',
    title: 'title',
    done: 'done',
    position: 'position',
  },
};

const INT_FIELDS = new Set(['pinned', 'position', 'done']);

function coerceValue(column: string, value: unknown): unknown {
  if (value === undefined) return undefined;
  if (!INT_FIELDS.has(column)) return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string' && value !== '') return Number(value);
  return value;
}

/**
 * Keep only known Appwrite columns and map camelCase → snake_case.
 * Drops `id`, `tagIds`, and any other client-only fields.
 */
export function payloadToAppwrite(
  collection: CollectionKey,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const map = FIELD_MAP[collection];
  const out: Record<string, unknown> = {};

  for (const [from, to] of Object.entries(map)) {
    if (!(from in payload)) continue;
    if (to in out) continue;
    const coerced = coerceValue(to, payload[from]);
    if (coerced !== undefined) out[to] = coerced;
  }

  return out;
}

/** Keep sync meta + whitelisted business columns when soft-deleting. */
export function existingToAppwrite(
  collection: CollectionKey,
  existing: Record<string, unknown>,
): Record<string, unknown> {
  return payloadToAppwrite(collection, existing);
}
