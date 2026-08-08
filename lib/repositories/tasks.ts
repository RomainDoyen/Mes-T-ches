import { query, queryOne, run, transaction } from '@/lib/db/client';
import { enqueueOutbox } from '@/lib/sync/outbox';
import type {
  QuickFilter,
  Subtask,
  Tag,
  Task,
  TaskInput,
  TaskPriority,
  TaskStatus,
} from '@/lib/types';
import {
  createId,
  endOfToday,
  endOfWeek,
  nowIso,
  startOfToday,
} from '@/lib/utils/dates';

interface TaskRow {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  category_id: string | null;
  pinned: number;
  position: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface TagRow {
  id: string;
  profile_id: string;
  name: string;
  color: string;
  created_at: string;
}

interface SubtaskRow {
  id: string;
  task_id: string;
  title: string;
  done: number;
  position: number;
}

function mapTag(row: TagRow): Tag {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  };
}

function mapSubtask(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    done: Boolean(row.done),
    position: row.position,
  };
}

function tagsForTask(taskId: string): Tag[] {
  return query<TagRow>(
    `SELECT t.* FROM tags t
     INNER JOIN task_tags tt ON tt.tag_id = t.id
     WHERE tt.task_id = ?
     ORDER BY t.name ASC`,
    [taskId],
  ).map(mapTag);
}

function subtasksForTask(taskId: string): Subtask[] {
  return query<SubtaskRow>(
    'SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC',
    [taskId],
  ).map(mapSubtask);
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueAt: row.due_at,
    categoryId: row.category_id,
    pinned: Boolean(row.pinned),
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    tags: tagsForTask(row.id),
    subtasks: subtasksForTask(row.id),
  };
}

function taskPayload(task: Task): Record<string, unknown> {
  return {
    id: task.id,
    profileId: task.profileId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueAt: task.dueAt,
    categoryId: task.categoryId,
    pinned: task.pinned,
    position: task.position,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
    tagIds: task.tags.map((tag) => tag.id),
  };
}

function enqueueTaskUpsert(task: Task): void {
  void enqueueOutbox({
    entity: 'tasks',
    entityId: task.id,
    op: 'upsert',
    payload: taskPayload(task),
    updatedAt: task.updatedAt,
  });
}

function setTaskTags(taskId: string, tagIds: string[]): void {
  run('DELETE FROM task_tags WHERE task_id = ?', [taskId]);
  for (const tagId of tagIds) {
    run('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)', [
      taskId,
      tagId,
    ]);
  }
}

function replaceSubtasks(
  taskId: string,
  items: Array<{ title: string; done?: boolean }>,
): void {
  run('DELETE FROM subtasks WHERE task_id = ?', [taskId]);
  items.forEach((item, index) => {
    run(
      `INSERT INTO subtasks (id, task_id, title, done, position)
       VALUES (?, ?, ?, ?, ?)`,
      [createId(), taskId, item.title, item.done ? 1 : 0, index],
    );
  });
}

function matchesFilter(task: Task, filter: QuickFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'urgent') return task.priority === 'urgent' && task.status !== 'done';
  if (!task.dueAt) return false;
  const due = new Date(task.dueAt);
  if (filter === 'today') {
    return due >= startOfToday() && due <= endOfToday();
  }
  if (filter === 'week') {
    return due >= startOfToday() && due <= endOfWeek();
  }
  return true;
}

export const tasksRepo = {
  list(
    profileId: string,
    options?: { filter?: QuickFilter; search?: string; tagId?: string | null },
  ): Task[] {
    const rows = query<TaskRow>(
      `SELECT * FROM tasks
       WHERE profile_id = ?
       ORDER BY pinned DESC, position ASC, created_at DESC`,
      [profileId],
    );
    let tasks = rows.map(mapTask);
    const filter = options?.filter ?? 'all';
    const search = options?.search?.trim().toLowerCase();
    const tagId = options?.tagId ?? null;

    if (filter !== 'all') {
      tasks = tasks.filter((t) => matchesFilter(t, filter));
    }
    if (tagId) {
      tasks = tasks.filter((t) => t.tags.some((tag) => tag.id === tagId));
    }
    if (search) {
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(search) ||
          (t.description?.toLowerCase().includes(search) ?? false),
      );
    }
    return tasks;
  },

  get(id: string): Task | null {
    const row = queryOne<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
    return row ? mapTask(row) : null;
  },

  create(profileId: string, input: TaskInput): Task {
    const id = createId();
    const ts = nowIso();
    const maxPos = queryOne<{ m: number | null }>(
      'SELECT MAX(position) as m FROM tasks WHERE profile_id = ?',
      [profileId],
    );
    const position = (maxPos?.m ?? 0) + 1;
    const status = input.status ?? 'todo';

    transaction(() => {
      run(
        `INSERT INTO tasks (
          id, profile_id, title, description, status, priority, due_at,
          category_id, pinned, position, created_at, updated_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          profileId,
          input.title.trim(),
          input.description ?? null,
          status,
          input.priority ?? 'medium',
          input.dueAt ?? null,
          input.categoryId ?? null,
          input.pinned ? 1 : 0,
          position,
          ts,
          ts,
          status === 'done' ? ts : null,
        ],
      );
      setTaskTags(id, input.tagIds ?? []);
      if (input.subtasks?.length) {
        replaceSubtasks(id, input.subtasks);
      }
    });

    const task = this.get(id)!;
    enqueueTaskUpsert(task);
    return task;
  },

  update(id: string, input: Partial<TaskInput> & { status?: TaskStatus }): Task | null {
    const existing = this.get(id);
    if (!existing) return null;
    const ts = nowIso();
    const status = input.status ?? existing.status;
    const completedAt =
      status === 'done'
        ? existing.completedAt ?? ts
        : status === 'todo'
          ? null
          : existing.completedAt;

    transaction(() => {
      run(
        `UPDATE tasks SET
          title = ?, description = ?, status = ?, priority = ?, due_at = ?,
          category_id = ?, pinned = ?, updated_at = ?, completed_at = ?
         WHERE id = ?`,
        [
          input.title?.trim() ?? existing.title,
          input.description !== undefined
            ? input.description
            : existing.description,
          status,
          input.priority ?? existing.priority,
          input.dueAt !== undefined ? input.dueAt : existing.dueAt,
          input.categoryId !== undefined
            ? input.categoryId
            : existing.categoryId,
          input.pinned !== undefined
            ? input.pinned
              ? 1
              : 0
            : existing.pinned
              ? 1
              : 0,
          ts,
          completedAt,
          id,
        ],
      );
      if (input.tagIds) setTaskTags(id, input.tagIds);
      if (input.subtasks) replaceSubtasks(id, input.subtasks);
    });

    const task = this.get(id);
    if (task) enqueueTaskUpsert(task);
    return task;
  },

  toggleDone(id: string): Task | null {
    const existing = this.get(id);
    if (!existing) return null;
    return this.update(id, {
      status: existing.status === 'done' ? 'todo' : 'done',
    });
  },

  togglePin(id: string): Task | null {
    const existing = this.get(id);
    if (!existing) return null;
    return this.update(id, { pinned: !existing.pinned });
  },

  delete(id: string): void {
    run('DELETE FROM tasks WHERE id = ?', [id]);
    void enqueueOutbox({
      entity: 'tasks',
      entityId: id,
      op: 'delete',
      payload: {},
      updatedAt: nowIso(),
    });
  },

  countActive(profileId: string): number {
    const row = queryOne<{ c: number }>(
      `SELECT COUNT(*) as c FROM tasks
       WHERE profile_id = ? AND status = 'todo'`,
      [profileId],
    );
    return row?.c ?? 0;
  },

  dayProgress(profileId: string): { done: number; total: number } {
    const start = startOfToday().toISOString();
    const end = endOfToday().toISOString();
    const rows = query<TaskRow>(
      `SELECT * FROM tasks
       WHERE profile_id = ?
         AND due_at IS NOT NULL
         AND due_at >= ? AND due_at <= ?`,
      [profileId, start, end],
    );
    const total = rows.length;
    const done = rows.filter((r) => r.status === 'done').length;
    return { done, total };
  },
};

export const subtasksRepo = {
  list(taskId: string): Subtask[] {
    return subtasksForTask(taskId);
  },

  add(taskId: string, title: string): Subtask {
    const maxPos = queryOne<{ m: number | null }>(
      'SELECT MAX(position) as m FROM subtasks WHERE task_id = ?',
      [taskId],
    );
    const subtask: Subtask = {
      id: createId(),
      taskId,
      title: title.trim(),
      done: false,
      position: (maxPos?.m ?? 0) + 1,
    };
    run(
      `INSERT INTO subtasks (id, task_id, title, done, position)
       VALUES (?, ?, ?, ?, ?)`,
      [subtask.id, subtask.taskId, subtask.title, 0, subtask.position],
    );
    return subtask;
  },

  toggle(id: string): Subtask | null {
    const row = queryOne<SubtaskRow>('SELECT * FROM subtasks WHERE id = ?', [
      id,
    ]);
    if (!row) return null;
    const done = row.done ? 0 : 1;
    run('UPDATE subtasks SET done = ? WHERE id = ?', [done, id]);
    return mapSubtask({ ...row, done });
  },

  delete(id: string): void {
    run('DELETE FROM subtasks WHERE id = ?', [id]);
  },
};
