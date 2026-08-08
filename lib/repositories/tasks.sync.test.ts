import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDbForTests } from '@/lib/db/client';
import { profilesRepo } from '@/lib/repositories/profiles';
import { tagsRepo } from '@/lib/repositories/tags';
import { subtasksRepo, tasksRepo, taskTagEntityId } from '@/lib/repositories/tasks';
import { listOutbox } from '@/lib/sync/outbox';

const USER_KEY = 'auth:user';
const userId = 'user-sync-1';

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
    },
  };
}

beforeEach(async () => {
  await resetDbForTests();
  const storage = createMemoryStorage();
  vi.stubGlobal('chrome', { storage: { local: storage } });
  await storage.set({
    [USER_KEY]: { id: userId, email: 'a@b.c', name: 'Test' },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('task relations outbox', () => {
  it('enqueues task_tags and subtasks when creating a task', async () => {
    const profile = profilesRepo.ensureDefault();
    const tag = tagsRepo.create(profile.id, { name: 'maison', color: '#0F766E' });

    const task = tasksRepo.create(profile.id, {
      title: 'Ranger',
      tagIds: [tag.id],
      subtasks: [{ title: 'Salon' }, { title: 'Cuisine' }],
    });

    // Allow async void enqueueOutbox calls to settle
    await vi.waitFor(async () => {
      const entries = await listOutbox();
      expect(entries.some((e) => e.entity === 'task_tags')).toBe(true);
      expect(entries.filter((e) => e.entity === 'subtasks')).toHaveLength(2);
    });

    const entries = await listOutbox();
    const link = entries.find((e) => e.entity === 'task_tags');
    expect(link?.entityId).toBe(taskTagEntityId(task.id, tag.id));
    expect(link?.payload).toMatchObject({
      taskId: task.id,
      tagId: tag.id,
    });

    const subEntries = entries.filter((e) => e.entity === 'subtasks');
    expect(subEntries.map((e) => e.payload.title).sort()).toEqual([
      'Cuisine',
      'Salon',
    ]);
  });

  it('enqueues subtask mutations from subtasksRepo', async () => {
    const profile = profilesRepo.ensureDefault();
    const task = tasksRepo.create(profile.id, { title: 'Parent' });

    const sub = subtasksRepo.add(task.id, 'Étape 1');
    subtasksRepo.toggle(sub.id);

    await vi.waitFor(async () => {
      const entries = await listOutbox();
      const ups = entries.filter(
        (e) => e.entity === 'subtasks' && e.entityId === sub.id && e.op === 'upsert',
      );
      expect(ups.length).toBeGreaterThanOrEqual(2);
      expect(ups.at(-1)?.payload.done).toBe(true);
    });

    subtasksRepo.delete(sub.id);
    await vi.waitFor(async () => {
      const entries = await listOutbox();
      expect(
        entries.some(
          (e) => e.entity === 'subtasks' && e.entityId === sub.id && e.op === 'delete',
        ),
      ).toBe(true);
    });
  });
});
