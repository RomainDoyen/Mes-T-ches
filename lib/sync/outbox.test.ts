import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OutboxEntry } from './types';
import { enqueueOutbox, listOutbox, removeOutbox } from './outbox';

const USER_KEY = 'auth:user';
const userId = 'user-1';
const outboxKey = `sync:outbox:${userId}`;

function createMemoryStorage() {
  const data = new Map<string, unknown>();

  return {
    get(keys: string | string[] | Record<string, unknown>) {
      const result: Record<string, unknown> = {};
      const list = Array.isArray(keys)
        ? keys
        : typeof keys === 'string'
          ? [keys]
          : Object.keys(keys);
      for (const key of list) {
        if (data.has(key)) result[key] = data.get(key);
      }
      return Promise.resolve(result);
    },
    set(items: Record<string, unknown>) {
      for (const [key, value] of Object.entries(items)) {
        data.set(key, value);
      }
      return Promise.resolve();
    },
    remove(keys: string | string[]) {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const key of list) data.delete(key);
      return Promise.resolve();
    },
    clear() {
      data.clear();
    },
  };
}

let storage: ReturnType<typeof createMemoryStorage>;

beforeEach(() => {
  storage = createMemoryStorage();
  vi.stubGlobal('chrome', {
    storage: { local: storage },
  });
  storage.set({
    [USER_KEY]: { id: userId, email: 'a@b.c', name: 'Test' },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('outbox', () => {
  it('starts empty', async () => {
    expect(await listOutbox()).toEqual([]);
  });

  it('enqueues and lists entries', async () => {
    const entry: Omit<OutboxEntry, 'id'> = {
      entity: 'tasks',
      entityId: 'task-1',
      op: 'upsert',
      payload: { title: 'Buy milk' },
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await enqueueOutbox(entry);

    const list = await listOutbox();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject(entry);
    expect(list[0]?.id).toBeTruthy();
  });

  it('appends multiple entries', async () => {
    await enqueueOutbox({
      entity: 'tags',
      entityId: 'tag-1',
      op: 'upsert',
      payload: { name: 'home' },
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await enqueueOutbox({
      entity: 'tags',
      entityId: 'tag-2',
      op: 'delete',
      payload: {},
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    expect(await listOutbox()).toHaveLength(2);
  });

  it('removes entries by id', async () => {
    await enqueueOutbox({
      entity: 'profiles',
      entityId: 'p1',
      op: 'upsert',
      payload: { name: 'Perso' },
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await enqueueOutbox({
      entity: 'categories',
      entityId: 'c1',
      op: 'upsert',
      payload: { name: 'Work' },
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const [first, second] = await listOutbox();
    await removeOutbox([first!.id]);

    const remaining = await listOutbox();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe(second!.id);
  });

  it('returns empty list when no user is logged in', async () => {
    storage.remove(USER_KEY);
    await enqueueOutbox({
      entity: 'tasks',
      entityId: 't1',
      op: 'upsert',
      payload: {},
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(await listOutbox()).toEqual([]);
    expect(storage.get([outboxKey])).resolves.toEqual({});
  });
});
