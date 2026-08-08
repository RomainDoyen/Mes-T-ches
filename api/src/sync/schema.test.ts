import { describe, expect, it } from 'vitest';
import { payloadToAppwrite } from './payload';
import { buildListQueries } from './queries';
import {
  isCloudWinner,
  pushBodySchema,
  toCloudDoc,
} from './schema';

describe('buildListQueries', () => {
  it('emits Appwrite JSON query strings (not legacy equal("…"))', () => {
    const queries = buildListQueries(
      'user-1',
      '1970-01-01T00:00:00.000Z',
      'cursor-9',
    );

    for (const q of queries) {
      expect(() => JSON.parse(q)).not.toThrow();
      expect(q.startsWith('equal(')).toBe(false);
    }

    expect(JSON.parse(queries[0])).toEqual({
      method: 'equal',
      attribute: 'userId',
      values: ['user-1'],
    });
    expect(JSON.parse(queries[1])).toEqual({
      method: 'greaterThan',
      attribute: 'updatedAt',
      values: ['1970-01-01T00:00:00.000Z'],
    });
    expect(JSON.parse(queries[2])).toEqual({
      method: 'limit',
      values: [100],
    });
    expect(JSON.parse(queries[3])).toEqual({
      method: 'cursorAfter',
      values: ['cursor-9'],
    });
  });
});

describe('payloadToAppwrite', () => {
  it('maps camelCase profile fields and drops id', () => {
    expect(
      payloadToAppwrite('profiles', {
        id: 'p1',
        name: 'Perso',
        color: '#0F766E',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toEqual({
      name: 'Perso',
      color: '#0F766E',
      created_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('maps task fields and drops tagIds', () => {
    expect(
      payloadToAppwrite('tasks', {
        id: 't1',
        profileId: 'p1',
        title: 'Hello',
        description: null,
        status: 'todo',
        priority: 'medium',
        dueAt: null,
        categoryId: null,
        pinned: true,
        position: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        completedAt: null,
        tagIds: ['a', 'b'],
      }),
    ).toEqual({
      profile_id: 'p1',
      title: 'Hello',
      description: null,
      status: 'todo',
      priority: 'medium',
      due_at: null,
      category_id: null,
      pinned: 1,
      position: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
      completed_at: null,
    });
  });
});

describe('isCloudWinner', () => {
  it('returns true when cloud is strictly newer', () => {
    expect(
      isCloudWinner('2026-02-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ).toBe(true);
  });

  it('returns false when timestamps are equal', () => {
    expect(
      isCloudWinner('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ).toBe(false);
  });

  it('returns false when mutation is newer', () => {
    expect(
      isCloudWinner('2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z'),
    ).toBe(false);
  });
});

describe('toCloudDoc', () => {
  it('strips Appwrite metadata and normalizes deletedAt', () => {
    const doc = toCloudDoc({
      $id: 'doc-1',
      $createdAt: '2026-01-01T00:00:00.000Z',
      $permissions: [],
      userId: 'u1',
      updatedAt: '2026-02-01T00:00:00.000Z',
      deletedAt: null,
      title: 'Hello',
    });
    expect(doc).toEqual({
      id: 'doc-1',
      userId: 'u1',
      updatedAt: '2026-02-01T00:00:00.000Z',
      deletedAt: null,
      title: 'Hello',
    });
  });
});

describe('pushBodySchema', () => {
  it('accepts valid push payload', () => {
    const result = pushBodySchema.safeParse({
      mutations: [
        {
          collection: 'tasks',
          id: 't1',
          op: 'upsert',
          payload: { title: 'Test' },
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown collection', () => {
    const result = pushBodySchema.safeParse({
      mutations: [
        {
          collection: 'unknown',
          id: 't1',
          op: 'upsert',
          payload: {},
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('defaults payload to empty object', () => {
    const result = pushBodySchema.parse({
      mutations: [
        {
          collection: 'tags',
          id: 'tag-1',
          op: 'delete',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    expect(result.mutations[0].payload).toEqual({});
  });
});
