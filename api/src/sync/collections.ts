export const DATABASE_ID = 'mes_taches';

export const COLLECTIONS = {
  profiles: 'profiles',
  categories: 'categories',
  tags: 'tags',
  tasks: 'tasks',
  task_tags: 'task_tags',
  subtasks: 'subtasks',
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;
