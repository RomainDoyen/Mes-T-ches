import { Hono } from 'hono';
import { AppwriteException } from 'node-appwrite';
import {
  createDocument,
  getDocument,
  listDocuments,
  updateDocument,
} from '../appwrite/databases';
import { requireAuth, type AuthVars } from '../auth/middleware';
import type { Env } from '../env';
import { COLLECTIONS, DATABASE_ID, type CollectionKey } from './collections';
import { existingToAppwrite, payloadToAppwrite } from './payload';
import { PAGE_SIZE, buildListQueries } from './queries';
import {
  emptyDocumentsRecord,
  isCloudWinner,
  pushBodySchema,
  stripAppwriteMeta,
  toCloudDoc,
  type CloudDoc,
} from './schema';

const DEFAULT_SINCE = '1970-01-01T00:00:00.000Z';
const MAX_PAGES = 10;

async function pullCollection(
  env: Env,
  userId: string,
  collectionId: string,
  since: string,
): Promise<CloudDoc[]> {
  const docs: CloudDoc[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await listDocuments(
      env,
      DATABASE_ID,
      collectionId,
      buildListQueries(userId, since, cursor),
    );
    if (result.documents.length === 0) break;

    for (const doc of result.documents) {
      docs.push(toCloudDoc(doc));
    }

    if (result.documents.length < PAGE_SIZE) break;
    const last = result.documents[result.documents.length - 1];
    cursor = String(last.$id);
  }

  return docs;
}

function appwriteStatus(e: AppwriteException): 400 | 401 | 404 | 409 | 500 {
  const code = e.code;
  if (code === 400 || code === 401 || code === 404 || code === 409) return code;
  return 500;
}

const syncRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

syncRoutes.get('/pull', requireAuth, async (c) => {
  const since = c.req.query('since')?.trim() || DEFAULT_SINCE;
  const userId = c.get('userId');
  const documents = emptyDocumentsRecord();

  try {
    for (const key of Object.keys(COLLECTIONS) as CollectionKey[]) {
      documents[key] = await pullCollection(c.env, userId, COLLECTIONS[key], since);
    }
    return c.json({ since, documents });
  } catch (e) {
    if (e instanceof AppwriteException) {
      return c.json({ error: e.message }, appwriteStatus(e));
    }
    throw e;
  }
});

syncRoutes.post('/push', requireAuth, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }

  const parsed = pushBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', details: parsed.error.flatten() }, 400);
  }

  const userId = c.get('userId');
  const applied: string[] = [];
  const winners: CloudDoc[] = [];
  const now = new Date().toISOString();

  try {
    for (const mutation of parsed.data.mutations) {
      const collectionId = COLLECTIONS[mutation.collection];
      const existing = await getDocument(c.env, DATABASE_ID, collectionId, mutation.id);

      if (existing && existing.userId !== userId) continue;

      if (existing) {
        const cloudUpdatedAt = String(existing.updatedAt ?? '');
        if (isCloudWinner(cloudUpdatedAt, mutation.updatedAt)) {
          winners.push(toCloudDoc(existing));
          continue;
        }
      }

      if (mutation.op === 'delete') {
        const base = existing
          ? existingToAppwrite(mutation.collection, stripAppwriteMeta(existing))
          : payloadToAppwrite(mutation.collection, mutation.payload);
        const data = {
          ...base,
          userId,
          updatedAt: now,
          deletedAt: now,
        };
        if (existing) {
          await updateDocument(c.env, DATABASE_ID, collectionId, mutation.id, data);
        } else {
          await createDocument(c.env, DATABASE_ID, collectionId, mutation.id, data);
        }
      } else {
        const data = {
          ...payloadToAppwrite(mutation.collection, mutation.payload),
          userId,
          updatedAt: mutation.updatedAt,
          deletedAt: null,
        };
        if (existing) {
          await updateDocument(c.env, DATABASE_ID, collectionId, mutation.id, data);
        } else {
          await createDocument(c.env, DATABASE_ID, collectionId, mutation.id, data);
        }
      }

      applied.push(mutation.id);
    }

    return c.json({ applied, winners });
  } catch (e) {
    if (e instanceof AppwriteException) {
      return c.json({ error: e.message }, appwriteStatus(e));
    }
    throw e;
  }
});

export { syncRoutes };
