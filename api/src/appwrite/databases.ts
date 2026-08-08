import { AppwriteException } from 'node-appwrite';
import type { Env } from '../env';

type ListDocumentsResponse = {
  total: number;
  documents: Record<string, unknown>[];
};

type ListRowsResponse = {
  total: number;
  rows: Record<string, unknown>[];
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

/** TablesDB paths — Appwrite Cloud console uses tables/rows (not collections/documents). */
function tableRowsPath(databaseId: string, tableId: string, rowId?: string) {
  const base = `/tablesdb/${databaseId}/tables/${tableId}/rows`;
  return rowId ? `${base}/${rowId}` : base;
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
  const path = `${tableRowsPath(databaseId, collectionId)}${qs ? `?${qs}` : ''}`;
  const result = await adminCall<ListRowsResponse>(env, 'GET', path);
  return {
    total: result.total ?? 0,
    documents: result.rows ?? [],
  };
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
      tableRowsPath(databaseId, collectionId, documentId),
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
    tableRowsPath(databaseId, collectionId),
    { rowId: documentId, data },
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
    tableRowsPath(databaseId, collectionId, documentId),
    { data },
  );
}

/** Diagnostic: list databases via TablesDB. */
export async function listTablesDatabases(
  env: Env,
): Promise<{ total: number; databases: Array<{ $id: string; name?: string }> }> {
  return adminCall(env, 'GET', '/tablesdb');
}
