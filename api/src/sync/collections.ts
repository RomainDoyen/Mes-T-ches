/** Appwrite database ID (not the display name). */
export const DATABASE_ID = '6a77520c003a48bce2e4';

export const COLLECTIONS = {
  profiles: 'profiles',
  categories: 'categories',
  tags: 'tags',
  tasks: 'tasks',
  task_tags: 'task_tags',
  subtasks: 'subtasks',
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;
