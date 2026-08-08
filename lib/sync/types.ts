export type SyncEntity =
  | 'profiles'
  | 'categories'
  | 'tags'
  | 'tasks'
  | 'task_tags'
  | 'subtasks';

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error';

export interface OutboxEntry {
  id: string;
  entity: SyncEntity;
  entityId: string;
  op: 'upsert' | 'delete';
  payload: Record<string, unknown>;
  updatedAt: string;
}

export interface CloudDocument {
  $id: string;
  userId: string;
  updatedAt: string;
  deletedAt: string | null;
  [key: string]: unknown;
}
