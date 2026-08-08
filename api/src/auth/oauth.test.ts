import { describe, expect, it, vi } from 'vitest';
import {
  bridgeHtml,
  buildGoogleOAuthUrl,
  consumeOAuthCode,
  storeOAuthCode,
} from './oauth';

function mockKv() {
  const map = new Map<string, string>();
  return {
    get: vi.fn(async (k: string) => map.get(k) ?? null),
    put: vi.fn(async (k: string, v: string) => {
      map.set(k, v);
    }),
    delete: vi.fn(async (k: string) => {
      map.delete(k);
    }),
  } as unknown as KVNamespace;
}

describe('oauth', () => {
  const env = {
    APPWRITE_ENDPOINT: 'https://fra.cloud.appwrite.io/v1',
    APPWRITE_PROJECT_ID: 'proj-123',
    APP_ORIGIN: 'http://127.0.0.1:8787/',
    SESSIONS: mockKv(),
  } as any;

  it('builds Google OAuth URL with project + success/failure redirects', () => {
    const url = buildGoogleOAuthUrl(env);
    expect(url).toBe(
      'https://fra.cloud.appwrite.io/v1/account/tokens/oauth2/google?' +
        'project=proj-123&' +
        'success=http%3A%2F%2F127.0.0.1%3A8787%2Fauth%2Fcallback&' +
        'failure=http%3A%2F%2F127.0.0.1%3A8787%2Fauth%2Fbridge%3Ferror%3D1',
    );
  });

  it('stores and consumes a one-shot OAuth code', async () => {
    const code = await storeOAuthCode(env, {
      userId: 'u1',
      appwriteSession: 'sess-abc',
    });
    expect(code).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    const data = await consumeOAuthCode(env, code);
    expect(data).toEqual({ userId: 'u1', appwriteSession: 'sess-abc' });
    expect(await consumeOAuthCode(env, code)).toBeNull();
  });

  it('returns success and error bridge HTML', () => {
    expect(bridgeHtml({})).toContain('Connexion réussie');
    expect(bridgeHtml({ error: true })).toContain('échoué');
  });
});
