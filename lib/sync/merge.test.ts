import { describe, expect, it } from 'vitest';
import { pickWinner, shouldApplyCloud } from './merge';

describe('pickWinner', () => {
  it('prefers newer updatedAt', () => {
    const a = { updatedAt: '2026-01-01T00:00:00.000Z', v: 1 };
    const b = { updatedAt: '2026-02-01T00:00:00.000Z', v: 2 };
    expect(pickWinner(a, b)?.v).toBe(2);
  });
});

describe('shouldApplyCloud', () => {
  it('deletes when cloud soft-deleted and newer', () => {
    expect(
      shouldApplyCloud('2026-01-01T00:00:00.000Z', {
        updatedAt: '2026-02-01T00:00:00.000Z',
        deletedAt: '2026-02-01T00:00:00.000Z',
      }),
    ).toBe('delete');
  });

  it('skips when local newer', () => {
    expect(
      shouldApplyCloud('2026-03-01T00:00:00.000Z', {
        updatedAt: '2026-02-01T00:00:00.000Z',
        deletedAt: null,
      }),
    ).toBe('skip');
  });
});
