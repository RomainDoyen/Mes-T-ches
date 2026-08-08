export type TaskStatus = 'todo' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type QuickFilter = 'all' | 'today' | 'urgent' | 'week';

export interface Profile {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Category {
  id: string;
  profileId: string;
  name: string;
  color: string;
  emoji: string | null;
  createdAt: string;
}

export interface Tag {
  id: string;
  profileId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  position: number;
}

export interface Task {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  categoryId: string | null;
  pinned: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  tags: Tag[];
  subtasks: Subtask[];
}

export interface TaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueAt?: string | null;
  categoryId?: string | null;
  pinned?: boolean;
  tagIds?: string[];
  subtasks?: Array<{ title: string; done?: boolean }>;
}

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  profile: Profile;
  categories: Category[];
  tags: Tag[];
  tasks: Array<Omit<Task, 'tags' | 'subtasks'> & { tagIds: string[] }>;
  subtasks: Subtask[];
}
