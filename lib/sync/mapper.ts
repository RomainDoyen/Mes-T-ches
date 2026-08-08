import { queryOne, run } from '@/lib/db/client';
import type { CloudDocument, SyncEntity } from './types';

function pick(
  doc: Record<string, unknown>,
  camel: string,
  snake: string,
): unknown {
  const v = doc[camel];
  if (v !== undefined) return v;
  return doc[snake];
}

function str(doc: Record<string, unknown>, camel: string, snake: string): string {
  const v = pick(doc, camel, snake);
  return v == null ? '' : String(v);
}

function strOrNull(
  doc: Record<string, unknown>,
  camel: string,
  snake: string,
): string | null {
  const v = pick(doc, camel, snake);
  return v == null || v === '' ? null : String(v);
}

function boolInt(
  doc: Record<string, unknown>,
  camel: string,
  snake: string,
  fallback = 0,
): number {
  const v = pick(doc, camel, snake);
  if (v == null) return fallback;
  return v === true || v === 1 || v === '1' ? 1 : 0;
}

export function docId(doc: CloudDocument | Record<string, unknown>): string {
  return String(doc.id ?? doc.$id ?? '');
}

export function getLocalUpdatedAt(
  entity: SyncEntity,
  id: string,
): string | null {
  switch (entity) {
    case 'profiles': {
      const row = queryOne<{ created_at: string }>(
        'SELECT created_at FROM profiles WHERE id = ?',
        [id],
      );
      return row?.created_at ?? null;
    }
    case 'categories': {
      const row = queryOne<{ created_at: string }>(
        'SELECT created_at FROM categories WHERE id = ?',
        [id],
      );
      return row?.created_at ?? null;
    }
    case 'tags': {
      const row = queryOne<{ created_at: string }>(
        'SELECT created_at FROM tags WHERE id = ?',
        [id],
      );
      return row?.created_at ?? null;
    }
    case 'tasks': {
      const row = queryOne<{ updated_at: string }>(
        'SELECT updated_at FROM tasks WHERE id = ?',
        [id],
      );
      return row?.updated_at ?? null;
    }
    case 'task_tags':
    case 'subtasks':
      return null;
  }
}

function upsertProfile(doc: Record<string, unknown>): void {
  run(
    'INSERT OR REPLACE INTO profiles (id, name, color, created_at) VALUES (?, ?, ?, ?)',
    [
      docId(doc),
      str(doc, 'name', 'name'),
      str(doc, 'color', 'color'),
      str(doc, 'createdAt', 'created_at'),
    ],
  );
}

function upsertCategory(doc: Record<string, unknown>): void {
  run(
    `INSERT OR REPLACE INTO categories (id, profile_id, name, color, emoji, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      docId(doc),
      str(doc, 'profileId', 'profile_id'),
      str(doc, 'name', 'name'),
      str(doc, 'color', 'color'),
      strOrNull(doc, 'emoji', 'emoji'),
      str(doc, 'createdAt', 'created_at'),
    ],
  );
}

function upsertTag(doc: Record<string, unknown>): void {
  run(
    `INSERT OR REPLACE INTO tags (id, profile_id, name, color, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      docId(doc),
      str(doc, 'profileId', 'profile_id'),
      str(doc, 'name', 'name'),
      str(doc, 'color', 'color'),
      str(doc, 'createdAt', 'created_at'),
    ],
  );
}

function upsertTask(doc: Record<string, unknown>): void {
  const id = docId(doc);
  run(
    `INSERT OR REPLACE INTO tasks (
      id, profile_id, title, description, status, priority, due_at,
      category_id, pinned, position, created_at, updated_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      str(doc, 'profileId', 'profile_id'),
      str(doc, 'title', 'title'),
      strOrNull(doc, 'description', 'description'),
      str(doc, 'status', 'status'),
      str(doc, 'priority', 'priority'),
      strOrNull(doc, 'dueAt', 'due_at'),
      strOrNull(doc, 'categoryId', 'category_id'),
      boolInt(doc, 'pinned', 'pinned'),
      Number(pick(doc, 'position', 'position') ?? 0),
      str(doc, 'createdAt', 'created_at'),
      str(doc, 'updatedAt', 'updated_at'),
      strOrNull(doc, 'completedAt', 'completed_at'),
    ],
  );

  const tagIds = pick(doc, 'tagIds', 'tag_ids');
  if (Array.isArray(tagIds)) {
    run('DELETE FROM task_tags WHERE task_id = ?', [id]);
    for (const tagId of tagIds) {
      run('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [
        id,
        String(tagId),
      ]);
    }
  }
}

function upsertTaskTag(doc: Record<string, unknown>): void {
  run('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [
    str(doc, 'taskId', 'task_id'),
    str(doc, 'tagId', 'tag_id'),
  ]);
}

function upsertSubtask(doc: Record<string, unknown>): void {
  run(
    `INSERT OR REPLACE INTO subtasks (id, task_id, title, done, position)
     VALUES (?, ?, ?, ?, ?)`,
    [
      docId(doc),
      str(doc, 'taskId', 'task_id'),
      str(doc, 'title', 'title'),
      boolInt(doc, 'done', 'done'),
      Number(pick(doc, 'position', 'position') ?? 0),
    ],
  );
}

export function upsertEntity(
  entity: SyncEntity,
  doc: CloudDocument,
): void {
  const raw = doc as Record<string, unknown>;
  switch (entity) {
    case 'profiles':
      upsertProfile(raw);
      break;
    case 'categories':
      upsertCategory(raw);
      break;
    case 'tags':
      upsertTag(raw);
      break;
    case 'tasks':
      upsertTask(raw);
      break;
    case 'task_tags':
      upsertTaskTag(raw);
      break;
    case 'subtasks':
      upsertSubtask(raw);
      break;
  }
}

export function deleteEntity(entity: SyncEntity, doc: CloudDocument): void {
  const id = docId(doc);
  const raw = doc as Record<string, unknown>;

  switch (entity) {
    case 'profiles':
      run('DELETE FROM profiles WHERE id = ?', [id]);
      break;
    case 'categories':
      run('DELETE FROM categories WHERE id = ?', [id]);
      break;
    case 'tags':
      run('DELETE FROM task_tags WHERE tag_id = ?', [id]);
      run('DELETE FROM tags WHERE id = ?', [id]);
      break;
    case 'tasks':
      run('DELETE FROM task_tags WHERE task_id = ?', [id]);
      run('DELETE FROM subtasks WHERE task_id = ?', [id]);
      run('DELETE FROM tasks WHERE id = ?', [id]);
      break;
    case 'task_tags':
      run('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?', [
        str(raw, 'taskId', 'task_id'),
        str(raw, 'tagId', 'tag_id'),
      ]);
      break;
    case 'subtasks':
      run('DELETE FROM subtasks WHERE id = ?', [id]);
      break;
  }
}
