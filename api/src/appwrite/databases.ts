import { AppwriteException } from 'node-appwrite';
import type { Env } from '../env';

type ListDocumentsResponse = {
  total: number;
  documents: Record<string, unknown>[];
};

function endpoint(env: Env) {
  return env.APPWRITE_ENDPOINT.replace(/\/$/, '');
}

async function adminCall<T>(
  env: Env,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const headers: Record<string, string> = {
    'X-Appwrite-Project': env.APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': env.APPWRITE_API_KEY,
    'X-Appwrite-Response-Format': '1.9.5',
    accept: 'application/json',
  };
  if (body) headers['content-type'] = 'application/json';

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

  return (data ?? {}) as T;
}

export async function listDocuments(
  env: Env,
  databaseId: string,
  collectionId: string,
  queries: string[],
): Promise<ListDocumentsResponse> {
  const params = new URLSearchParams();
  for (const q of queries) params.append('queries[]', q);
  const qs = params.toString();
  const path = `/databases/${databaseId}/collections/${collectionId}/documents${qs ? `?${qs}` : ''}`;
  return adminCall<ListDocumentsResponse>(env, 'GET', path);
}

export async function getDocument(
  env: Env,
  databaseId: string,
  collectionId: string,
  documentId: string,
): Promise<Record<string, unknown> | null> {
  try {
    return await adminCall<Record<string, unknown>>(
      env,
      'GET',
      `/databases/${databaseId}/collections/${collectionId}/documents/${documentId}`,
    );
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 404) return null;
    throw e;
  }
}

export async function createDocument(
  env: Env,
  databaseId: string,
  collectionId: string,
  documentId: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return adminCall<Record<string, unknown>>(
    env,
    'POST',
    `/databases/${databaseId}/collections/${collectionId}/documents`,
    { documentId, data },
  );
}

export async function updateDocument(
  env: Env,
  databaseId: string,
  collectionId: string,
  documentId: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return adminCall<Record<string, unknown>>(
    env,
    'PATCH',
    `/databases/${databaseId}/collections/${collectionId}/documents/${documentId}`,
    { data },
  );
}
