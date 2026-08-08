/** Appwrite database ID (not the display name). */
export const DATABASE_ID = '6a77520c003a40bce2e4';

/** Display name used when auto-creating the database. */
export const DATABASE_NAME = 'mes_taches';

export const COLLECTIONS = {
  profiles: 'profiles',
  categories: 'categories',
  tags: 'tags',
  tasks: 'tasks',
  task_tags: 'task_tags',
  subtasks: 'subtasks',
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;
