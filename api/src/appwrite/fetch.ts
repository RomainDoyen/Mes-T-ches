import { AppwriteException } from 'node-appwrite';
import type { Env } from '../env';

type AppwriteUser = { $id: string; email: string; name: string };
type AppwriteSessionBody = { secret?: string };

function endpoint(env: Env) {
  return env.APPWRITE_ENDPOINT.replace(/\/$/, '');
}

function extractSessionSecret(
  env: Env,
  headers: Headers,
  body: AppwriteSessionBody,
): string {
  if (body.secret) return body.secret;

  const sessionHeader = headers.get('X-Appwrite-Session');
  if (sessionHeader) return sessionHeader;

  const fallback = headers.get('X-Fallback-Cookies');
  if (fallback) {
    const cookies = JSON.parse(fallback) as Record<string, string>;
    const encoded = cookies[`a_session_${env.APPWRITE_PROJECT_ID}`];
    if (encoded) return encoded;
  }

  throw new AppwriteException('Missing session secret', 500);
}

async function call<T>(
  env: Env,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  session?: string,
): Promise<{ data: T; headers: Headers }> {
  const headers: Record<string, string> = {
    'X-Appwrite-Project': env.APPWRITE_PROJECT_ID,
    'X-Appwrite-Response-Format': '1.9.5',
    accept: 'application/json',
  };
  if (body) headers['content-type'] = 'application/json';
  if (session) headers['X-Appwrite-Session'] = session;

  const res = await fetch(`${endpoint(env)}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: { message?: string; code?: number; type?: string } | null = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    throw new AppwriteException(
      data?.message ?? res.statusText,
      data?.code ?? res.status,
      data?.type,
      text,
    );
  }

  return { data: (data ?? {}) as T, headers: res.headers };
}

export async function createAccount(
  env: Env,
  params: { userId: string; email: string; password: string; name?: string },
): Promise<AppwriteUser> {
  const { data } = await call<AppwriteUser>(env, 'POST', '/account', {
    userId: params.userId,
    email: params.email,
    password: params.password,
    name: params.name ?? '',
  });
  return data;
}

export async function createEmailPasswordSession(
  env: Env,
  params: { email: string; password: string },
): Promise<{ secret: string }> {
  const { data, headers } = await call<AppwriteSessionBody>(
    env,
    'POST',
    '/account/sessions/email',
    params,
  );
  const secret = extractSessionSecret(env, headers, data);
  return { secret };
}

export async function getAccount(env: Env, sessionSecret: string): Promise<AppwriteUser> {
  const { data } = await call<AppwriteUser>(env, 'GET', '/account', undefined, sessionSecret);
  return data;
}

export async function createSessionFromToken(
  env: Env,
  params: { userId: string; secret: string },
): Promise<{ secret: string }> {
  const { data, headers } = await call<AppwriteSessionBody>(
    env,
    'POST',
    '/account/sessions/token',
    params,
  );
  const secret = extractSessionSecret(env, headers, data);
  return { secret };
}
