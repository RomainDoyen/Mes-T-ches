import { describe, expect, it, vi } from 'vitest';
import { issueBearer, resolveBearer, revokeBearer } from './tokens';

function mockKv() {
  const map = new Map<string, string>();
  return {
    get: vi.fn(async (k: string) => map.get(k) ?? null),
    put: vi.fn(async (k: string, v: string) => { map.set(k, v); }),
    delete: vi.fn(async (k: string) => { map.delete(k); }),
  } as unknown as KVNamespace;
}

describe('tokens', () => {
  it('issues and resolves a bearer', async () => {
    const env = {
      SESSIONS: mockKv(),
      SESSION_SECRET: 'test-secret',
    } as any;
    const token = await issueBearer(env, {
      userId: 'u1',
      appwriteSession: 'sess-abc',
    });
    expect(token.length).toBeGreaterThan(20);
    const resolved = await resolveBearer(env, token);
    expect(resolved).toEqual({ userId: 'u1', appwriteSession: 'sess-abc' });
  });

  it('returns null after revoke', async () => {
    const env = { SESSIONS: mockKv(), SESSION_SECRET: 'test-secret' } as any;
    const token = await issueBearer(env, { userId: 'u1', appwriteSession: 's' });
    await revokeBearer(env, token);
    expect(await resolveBearer(env, token)).toBeNull();
  });

  it('returns null when KV value is corrupted JSON', async () => {
    const kv = mockKv();
    const env = { SESSIONS: kv, SESSION_SECRET: 'test-secret' } as any;
    await kv.put('bearer:bad-token', '{not valid json');
    expect(await resolveBearer(env, 'bad-token')).toBeNull();
  });
});
