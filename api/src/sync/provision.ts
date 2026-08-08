import type { Env } from '../env';
import { COLLECTIONS, DATABASE_ID } from './collections';

type ColumnSpec =
  | { key: string; type: 'string'; size: number; required: boolean }
  | { key: string; type: 'integer'; required: boolean };

type TableSpec = {
  id: string;
  columns: ColumnSpec[];
  indexes: Array<{ key: string; columns: string[] }>;
};

const SYNC_META: ColumnSpec[] = [
  { key: 'userId', type: 'string', size: 64, required: true },
  { key: 'updatedAt', type: 'string', size: 64, required: true },
  { key: 'deletedAt', type: 'string', size: 64, required: false },
];

export const TABLE_SPECS: TableSpec[] = [
  {
    id: COLLECTIONS.profiles,
    columns: [
      ...SYNC_META,
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'color', type: 'string', size: 32, required: true },
      { key: 'created_at', type: 'string', size: 64, required: true },
    ],
    indexes: [
      { key: 'userId', columns: ['userId'] },
      { key: 'updatedAt', columns: ['updatedAt'] },
    ],
  },
  {
    id: COLLECTIONS.categories,
    columns: [
      ...SYNC_META,
      { key: 'profile_id', type: 'string', size: 64, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'color', type: 'string', size: 32, required: true },
      { key: 'emoji', type: 'string', size: 32, required: false },
      { key: 'created_at', type: 'string', size: 64, required: true },
    ],
    indexes: [
      { key: 'userId', columns: ['userId'] },
      { key: 'updatedAt', columns: ['updatedAt'] },
      { key: 'profile_id', columns: ['profile_id'] },
    ],
  },
  {
    id: COLLECTIONS.tags,
    columns: [
      ...SYNC_META,
      { key: 'profile_id', type: 'string', size: 64, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'color', type: 'string', size: 32, required: true },
      { key: 'created_at', type: 'string', size: 64, required: true },
    ],
    indexes: [
      { key: 'userId', columns: ['userId'] },
      { key: 'updatedAt', columns: ['updatedAt'] },
      { key: 'profile_id', columns: ['profile_id'] },
    ],
  },
  {
    id: COLLECTIONS.tasks,
    columns: [
      ...SYNC_META,
      { key: 'profile_id', type: 'string', size: 64, required: true },
      { key: 'title', type: 'string', size: 512, required: true },
      { key: 'description', type: 'string', size: 4096, required: false },
      { key: 'status', type: 'string', size: 32, required: true },
      { key: 'priority', type: 'string', size: 32, required: true },
      { key: 'due_at', type: 'string', size: 64, required: false },
      { key: 'category_id', type: 'string', size: 64, required: false },
      { key: 'pinned', type: 'integer', required: true },
      { key: 'position', type: 'integer', required: true },
      { key: 'created_at', type: 'string', size: 64, required: true },
      { key: 'updated_at', type: 'string', size: 64, required: true },
      { key: 'completed_at', type: 'string', size: 64, required: false },
    ],
    indexes: [
      { key: 'userId', columns: ['userId'] },
      { key: 'updatedAt', columns: ['updatedAt'] },
      { key: 'profile_id', columns: ['profile_id'] },
      { key: 'due_at', columns: ['due_at'] },
    ],
  },
  {
    id: COLLECTIONS.task_tags,
    columns: [
      ...SYNC_META,
      { key: 'task_id', type: 'string', size: 64, required: true },
      { key: 'tag_id', type: 'string', size: 64, required: true },
    ],
    indexes: [
      { key: 'userId', columns: ['userId'] },
      { key: 'updatedAt', columns: ['updatedAt'] },
      { key: 'task_id', columns: ['task_id'] },
      { key: 'tag_id', columns: ['tag_id'] },
    ],
  },
  {
    id: COLLECTIONS.subtasks,
    columns: [
      ...SYNC_META,
      { key: 'task_id', type: 'string', size: 64, required: true },
      { key: 'title', type: 'string', size: 512, required: true },
      { key: 'done', type: 'integer', required: true },
      { key: 'position', type: 'integer', required: true },
    ],
    indexes: [
      { key: 'userId', columns: ['userId'] },
      { key: 'updatedAt', columns: ['updatedAt'] },
      { key: 'task_id', columns: ['task_id'] },
    ],
  },
];

function endpoint(env: Env) {
  return env.APPWRITE_ENDPOINT.replace(/\/$/, '');
}

async function call(
  env: Env,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const headers: Record<string, string> = {
    'X-Appwrite-Project': env.APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': env.APPWRITE_API_KEY,
    accept: 'application/json',
  };
  if (body) headers['content-type'] = 'application/json';

  const res = await fetch(`${endpoint(env)}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  return { ok: res.ok, status: res.status, data };
}

function messageOf(data: unknown): string {
  if (data && typeof data === 'object' && 'message' in data) {
    return String((data as { message: unknown }).message);
  }
  return String(data ?? '');
}

export async function inspectSchema(env: Env) {
  const tables: Record<string, unknown> = {};
  for (const spec of TABLE_SPECS) {
    const table = await call(env, 'GET', `/tablesdb/${DATABASE_ID}/tables/${spec.id}`);
    const cols = await call(env, 'GET', `/tablesdb/${DATABASE_ID}/tables/${spec.id}/columns`);
    tables[spec.id] = {
      tableExists: table.ok,
      tableError: table.ok ? undefined : messageOf(table.data),
      columns: cols.ok ? cols.data : { error: messageOf(cols.data) },
    };
  }
  return { databaseId: DATABASE_ID, tables };
}

export async function provisionSchema(env: Env, onlyTableId?: string) {
  const log: Array<{ step: string; ok: boolean; detail?: string }> = [];
  const specs = onlyTableId
    ? TABLE_SPECS.filter((s) => s.id === onlyTableId)
    : TABLE_SPECS;

  if (onlyTableId && specs.length === 0) {
    return { databaseId: DATABASE_ID, error: `Unknown table: ${onlyTableId}`, log };
  }

  for (const spec of specs) {
    const existing = await call(env, 'GET', `/tablesdb/${DATABASE_ID}/tables/${spec.id}`);
    if (!existing.ok) {
      const created = await call(env, 'POST', `/tablesdb/${DATABASE_ID}/tables`, {
        tableId: spec.id,
        name: spec.id,
        rowSecurity: false,
        enabled: true,
      });
      log.push({
        step: `table:${spec.id}`,
        ok: created.ok || created.status === 409,
        detail: created.ok ? 'created' : messageOf(created.data),
      });
    } else {
      log.push({ step: `table:${spec.id}`, ok: true, detail: 'exists' });
    }

    const colsRes = await call(env, 'GET', `/tablesdb/${DATABASE_ID}/tables/${spec.id}/columns`);
    const existingKeys = new Set<string>();
    if (colsRes.ok && colsRes.data && typeof colsRes.data === 'object') {
      const list = (colsRes.data as { columns?: Array<{ key?: string }> }).columns ?? [];
      for (const c of list) if (c.key) existingKeys.add(c.key);
    }

    for (const col of spec.columns) {
      if (existingKeys.has(col.key)) {
        log.push({ step: `column:${spec.id}.${col.key}`, ok: true, detail: 'exists' });
        continue;
      }
      // required:false avoids Appwrite rejecting adds on non-empty tables
      const path =
        col.type === 'string'
          ? `/tablesdb/${DATABASE_ID}/tables/${spec.id}/columns/string`
          : `/tablesdb/${DATABASE_ID}/tables/${spec.id}/columns/integer`;
      const body =
        col.type === 'string'
          ? { key: col.key, size: col.size, required: false }
          : { key: col.key, required: false, min: -1_000_000, max: 1_000_000 };
      const created = await call(env, 'POST', path, body);
      log.push({
        step: `column:${spec.id}.${col.key}`,
        ok: created.ok || created.status === 409,
        detail: created.ok ? 'created' : messageOf(created.data),
      });
    }

    for (const index of spec.indexes) {
      const created = await call(
        env,
        'POST',
        `/tablesdb/${DATABASE_ID}/tables/${spec.id}/indexes`,
        { key: index.key, type: 'key', columns: index.columns },
      );
      log.push({
        step: `index:${spec.id}.${index.key}`,
        ok: created.ok || created.status === 409,
        detail: created.ok ? 'created' : messageOf(created.data),
      });
    }
  }

  return { databaseId: DATABASE_ID, log };
}
