import { describe, expect, it } from 'vitest';
import { taskTagEntityId } from './ids';

const APPWRITE_UID = /^[a-zA-Z0-9][a-zA-Z0-9_]{0,35}$/;

describe('taskTagEntityId', () => {
  it('fits Appwrite UID constraints', () => {
    const taskId = '550e8400-e29b-41d4-a716-446655440000';
    const tagId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const id = taskTagEntityId(taskId, tagId);

    expect(id.length).toBeLessThanOrEqual(36);
    expect(id).toMatch(APPWRITE_UID);
    expect(id.startsWith('_')).toBe(false);
  });

  it('is deterministic and distinct per pair', () => {
    const a = taskTagEntityId('task-a', 'tag-1');
    const b = taskTagEntityId('task-a', 'tag-1');
    const c = taskTagEntityId('task-a', 'tag-2');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
