import { describe, expect, it } from 'vitest';
import {
  isCloudWinner,
  pushBodySchema,
  toCloudDoc,
} from './schema';

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
