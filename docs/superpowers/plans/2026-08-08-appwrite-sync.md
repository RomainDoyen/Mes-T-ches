# Appwrite Sync Hybrid — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter auth obligatoire (email + Google) et sync hybride SQLite ↔ Appwrite Cloud via un Cloudflare Worker, sans exposer de secrets dans l’extension.

**Architecture:** Le popup garde SQLite WASM pour le CRUD offline. Un service worker d’extension draine une outbox vers `POST /sync/push` et tire les deltas via `GET /sync/pull`. Un Worker Cloudflare proxyfie Auth + Databases Appwrite et délivre des Bearer tokens opaques. Isolation locale par `userId` (clé IndexedDB).

**Tech Stack:** WXT + React + Zustand + SQLite WASM (existant) · Cloudflare Workers (Hono) · Appwrite Cloud SDK Node · Vitest · Zod

**Spec:** `docs/superpowers/specs/2026-08-08-appwrite-sync-design.md`

## Global Constraints

- Auth obligatoire : pas de shell tâches sans session valide
- Aucune clé secrète Appwrite dans le bundle extension
- Conflits V1 : last-write-wins sur `updatedAt`
- Soft delete cloud via `deletedAt`
- Export/import JSON conservé
- Design UI teal existant ; nouveaux écrans auth uniquement
- Hors scope : invité, collab, realtime, Safari, self-host Appwrite
- Commits : initialiser git si absent ; ne pas `--no-verify` ; messages en français ou conventional `feat:`/`test:`/`chore:`

## File Structure

```
todo-extension/
  api/                          # Cloudflare Worker (nouveau package)
    src/
      index.ts                  # Hono app + CORS
      env.ts                    # typage Env
      appwrite.ts               # clients Appwrite (admin + session)
      auth/
        routes.ts               # register/login/google/callback/exchange/logout/me
        tokens.ts               # opaque bearer ↔ session Appwrite (KV)
      sync/
        routes.ts               # pull/push
        collections.ts          # noms collections + mapping
    wrangler.toml
    package.json
  lib/
    sync/
      types.ts                  # OutboxEntry, SyncEntity, SyncStatus, PullPayload
      merge.ts                  # LWW merge pure
      outbox.ts                 # queue chrome.storage
      mapper.ts                 # document ↔ row SQLite
      client.ts                 # fetch API Worker (Bearer)
    db/
      client.ts                 # IDB key scoped userId (modify)
  stores/
    authStore.ts                # session, login, logout, me
    syncStore.ts                # status, lastSyncAt, trigger
  components/
    LoginScreen.tsx             # UI auth
    LoginScreen.scss
    SyncBadge.tsx               # pastille header
  entrypoints/
    background.ts               # OAuth bridge intercept + outbox drain
    popup/App.tsx               # gate login
  wxt.config.ts                 # host_permissions API
```

---

### Task 1: Init git + scaffold Worker `api/`

**Files:**
- Create: `api/package.json`, `api/tsconfig.json`, `api/wrangler.toml`, `api/src/index.ts`, `api/src/env.ts`
- Create: `api/.dev.vars.example`
- Modify: root `README.md` (section API)

**Interfaces:**
- Produces: Worker Hono health `GET /health` → `{ ok: true }` ; Env typé `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `SESSION_SECRET`, `EXTENSION_ID`

- [ ] **Step 1: Initialiser git à la racine si absent**

```bash
cd /home/romain/Documents/Projets/todo-extension
git init
printf 'node_modules/\n.output/\n.wxt/\ndist/\napi/node_modules/\napi/.wrangler/\napi/.dev.vars\n.env\n*.local\n' > .gitignore
git add .gitignore docs/
git commit -m "chore: init git et docs design Appwrite"
```

- [ ] **Step 2: Scaffold `api/`**

```bash
mkdir -p api/src
cd api && npm init -y
npm install hono node-appwrite
npm install -D wrangler typescript @cloudflare/workers-types
```

`api/wrangler.toml` :

```toml
name = "mes-taches-api"
main = "src/index.ts"
compatibility_date = "2026-08-01"

[[kv_namespaces]]
binding = "SESSIONS"
id = "REPLACE_AFTER_CREATE"
preview_id = "REPLACE_AFTER_CREATE"
```

`api/src/env.ts` :

```ts
export interface Env {
  SESSIONS: KVNamespace;
  APPWRITE_ENDPOINT: string;
  APPWRITE_PROJECT_ID: string;
  APPWRITE_API_KEY: string;
  SESSION_SECRET: string;
  EXTENSION_ID: string;
  APP_ORIGIN: string; // URL publique du Worker, ex. https://mes-taches-api.<sub>.workers.dev
}
```

`api/src/index.ts` :

```ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') ?? '';
  const allow =
    origin.startsWith('chrome-extension://') ||
    origin.startsWith('http://localhost') ||
    origin === c.env.APP_ORIGIN;
  return cors({
    origin: allow ? origin : c.env.APP_ORIGIN,
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  })(c, next);
});

app.get('/health', (c) => c.json({ ok: true }));

export default app;
```

`api/.dev.vars.example` :

```
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
SESSION_SECRET=change-me-long-random
EXTENSION_ID=
APP_ORIGIN=http://127.0.0.1:8787
```

- [ ] **Step 3: Vérifier le Worker en local**

```bash
cd api && npx wrangler dev
curl -s http://127.0.0.1:8787/health
```

Expected: `{"ok":true}`

- [ ] **Step 4: Commit**

```bash
git add api README.md
git commit -m "chore: scaffold Cloudflare Worker API"
```

---

### Task 2: Checklist Appwrite Cloud (manuel) + constantes collections

**Files:**
- Create: `api/src/sync/collections.ts`
- Create: `docs/superpowers/setup-appwrite.md`

**Interfaces:**
- Produces: `COLLECTION_IDS` map + attribute list documentée pour création console

- [ ] **Step 1: Écrire le guide setup**

Créer `docs/superpowers/setup-appwrite.md` avec cases à cocher :

1. Créer projet Appwrite Cloud
2. Activer Email/Password auth
3. Activer Google OAuth (Client ID/Secret Google Cloud) ; success URL = `$APP_ORIGIN/auth/callback`
4. Créer Database `mes_taches`
5. Créer collections : `profiles`, `categories`, `tags`, `tasks`, `task_tags`, `subtasks`
6. Sur chaque collection : attributs alignés schéma SQLite + `userId` (string, required, indexed), `updatedAt` (string, required, indexed), `deletedAt` (string, optional)
7. Permissions documents : create users → any ; read/update/delete → `userId == $userId` (Document Security) **ou** Worker API key + filtre `userId` (si Document Security trop long V1 : **API key serveur + filtre strict `equal("userId", userId)` obligatoire**)
8. Noter `PROJECT_ID`, endpoint régional, API key server

Décision V1 figée dans le guide : **API key serveur sur le Worker** + toujours filtrer/écrire `userId` depuis la session authentifiée (plus simple que Document Security pour le MVP).

- [ ] **Step 2: Constantes**

```ts
// api/src/sync/collections.ts
export const DATABASE_ID = 'mes_taches';

export const COLLECTIONS = {
  profiles: 'profiles',
  categories: 'categories',
  tags: 'tags',
  tasks: 'tasks',
  task_tags: 'task_tags',
  subtasks: 'subtasks',
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;
```

- [ ] **Step 3: Commit**

```bash
git add api/src/sync/collections.ts docs/superpowers/setup-appwrite.md
git commit -m "docs: setup Appwrite Cloud et IDs collections"
```

---

### Task 3: Tokens Bearer opaques (KV) + client Appwrite

**Files:**
- Create: `api/src/appwrite.ts`
- Create: `api/src/auth/tokens.ts`
- Test: `api/src/auth/tokens.test.ts` (vitest dans `api/`)

**Interfaces:**
- Produces:
  - `createAppwriteAdmin(env): { users, databases, accountWithSession(session: string) }`
  - `issueBearer(env, { userId, appwriteSession }): Promise<string>`
  - `resolveBearer(env, token): Promise<{ userId: string; appwriteSession: string } | null>`
  - `revokeBearer(env, token): Promise<void>`

- [ ] **Step 1: Installer vitest dans `api/` et écrire le test tokens**

```ts
// api/src/auth/tokens.test.ts
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
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd api && npx vitest run src/auth/tokens.test.ts
```

- [ ] **Step 3: Implémenter `tokens.ts` + `appwrite.ts`**

```ts
// api/src/auth/tokens.ts
export async function issueBearer(
  env: { SESSIONS: KVNamespace; SESSION_SECRET: string },
  data: { userId: string; appwriteSession: string },
): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID();
  await env.SESSIONS.put(
    `bearer:${token}`,
    JSON.stringify(data),
    { expirationTtl: 60 * 60 * 24 * 30 },
  );
  return token;
}

export async function resolveBearer(
  env: { SESSIONS: KVNamespace },
  token: string,
): Promise<{ userId: string; appwriteSession: string } | null> {
  const raw = await env.SESSIONS.get(`bearer:${token}`);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function revokeBearer(
  env: { SESSIONS: KVNamespace },
  token: string,
): Promise<void> {
  await env.SESSIONS.delete(`bearer:${token}`);
}
```

```ts
// api/src/appwrite.ts
import { Client, Account, Databases, Users } from 'node-appwrite';
import type { Env } from './env';

export function adminClient(env: Env) {
  const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_API_KEY);
  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
    users: new Users(client),
  };
}

export function sessionClient(env: Env, sessionSecret: string) {
  const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID)
    .setSession(sessionSecret);
  return { client, account: new Account(client), databases: new Databases(client) };
}
```

- [ ] **Step 4: Tests pass**

```bash
cd api && npx vitest run src/auth/tokens.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/
git commit -m "feat(api): bearer tokens KV et clients Appwrite"
```

---

### Task 4: Routes auth email (register / login / me / logout)

**Files:**
- Create: `api/src/auth/routes.ts`
- Create: `api/src/auth/middleware.ts`
- Modify: `api/src/index.ts` — `app.route('/auth', authRoutes)`

**Interfaces:**
- Consumes: `issueBearer`, `resolveBearer`, `revokeBearer`, `adminClient`, `sessionClient`
- Produces:
  - `POST /auth/register` body `{ email, password, name? }` → `{ token, user: { id, email, name } }`
  - `POST /auth/login` body `{ email, password }` → idem
  - `GET /auth/me` Authorization Bearer → user
  - `POST /auth/logout` → `{ ok: true }`

- [ ] **Step 1: Middleware Bearer**

```ts
// api/src/auth/middleware.ts
import { createMiddleware } from 'hono/factory';
import { resolveBearer } from './tokens';
import type { Env } from '../env';

export type AuthVars = {
  userId: string;
  appwriteSession: string;
  bearer: string;
};

export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: AuthVars;
}>(async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return c.json({ error: 'unauthorized' }, 401);
  const session = await resolveBearer(c.env, token);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  c.set('userId', session.userId);
  c.set('appwriteSession', session.appwriteSession);
  c.set('bearer', token);
  await next();
});
```

- [ ] **Step 2: Routes register/login via Appwrite Account**

Utiliser `Account.create` / `Account.createEmailPasswordSession` avec le client admin ou un client sans session selon la doc Appwrite Node (`createEmailPasswordSession` sur Account avec project id). Stocker le secret de session Appwrite dans KV via `issueBearer`.

Réponse JSON standardisée :

```ts
type AuthResponse = {
  token: string;
  user: { id: string; email: string; name: string };
};
```

- [ ] **Step 3: Brancher sur Hono + tester manuellement**

```bash
cd api && npx wrangler dev
curl -s -X POST http://127.0.0.1:8787/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"test@example.com","password":"Password123!","name":"Test"}'
```

Expected: JSON avec `token` et `user.id`

- [ ] **Step 4: Commit**

```bash
git add api/src
git commit -m "feat(api): auth email register login me logout"
```

---

### Task 5: OAuth Google + bridge code one-shot

**Files:**
- Modify: `api/src/auth/routes.ts`
- Create: `api/src/auth/oauth.ts`

**Interfaces:**
- Produces:
  - `GET /auth/google` → redirect Appwrite OAuth
  - `GET /auth/callback` → crée session, stocke code one-shot TTL 2 min dans KV, redirect `/auth/bridge?code=...`
  - `GET /auth/bridge` → HTML minimal « Connexion réussie, vous pouvez fermer cet onglet. »
  - `POST /auth/exchange` body `{ code }` → `{ token, user }` puis invalide le code

- [ ] **Step 1: Implémenter start OAuth**

Utiliser Appwrite `account.createOAuth2Token` / `createOAuth2Session` selon version SDK, avec :
- `success` = `${env.APP_ORIGIN}/auth/callback`
- `failure` = `${env.APP_ORIGIN}/auth/bridge?error=1`

- [ ] **Step 2: Callback → code**

```ts
const code = crypto.randomUUID();
await env.SESSIONS.put(
  `oauth:${code}`,
  JSON.stringify({ userId, appwriteSession }),
  { expirationTtl: 120 },
);
return c.redirect(`${env.APP_ORIGIN}/auth/bridge?code=${code}`);
```

- [ ] **Step 3: Exchange**

```ts
const raw = await env.SESSIONS.get(`oauth:${code}`);
if (!raw) return c.json({ error: 'invalid_code' }, 400);
await env.SESSIONS.delete(`oauth:${code}`);
const data = JSON.parse(raw);
const token = await issueBearer(env, data);
// fetch user via sessionClient
return c.json({ token, user });
```

- [ ] **Step 4: Commit**

```bash
git add api/src/auth
git commit -m "feat(api): Google OAuth bridge et exchange"
```

---

### Task 6: Sync pull / push Worker

**Files:**
- Create: `api/src/sync/routes.ts`
- Create: `api/src/sync/schema.ts` (zod payloads)
- Modify: `api/src/index.ts`

**Interfaces:**
- Consumes: `requireAuth`, `adminClient`, `COLLECTIONS`, `DATABASE_ID`
- Produces:
  - `GET /sync/pull?since=ISO` → `{ since, documents: Record<CollectionKey, CloudDoc[]> }`
  - `POST /sync/push` body `{ mutations: Array<{ collection, id, op: 'upsert'|'delete', payload, updatedAt }> }` → `{ applied: string[], winners: CloudDoc[] }`

`CloudDoc` = payload plat + `userId`, `updatedAt`, `deletedAt`.

- [ ] **Step 1: Pull — queries Appwrite**

Pour chaque collection, `databases.listDocuments` avec queries :
- `Query.equal('userId', userId)`
- `Query.greaterThan('updatedAt', since || '1970-01-01T00:00:00.000Z')`
- `Query.limit(100)` + pagination cursor si besoin (V1 : boucle jusqu’à vide, max 10 pages)

- [ ] **Step 2: Push — LWW**

Pour chaque mutation :
1. `getDocument` si existe
2. Si cloud.updatedAt > mutation.updatedAt → ajouter à `winners`, skip write
3. Sinon `upsert` (create or update) avec `userId` forcé = session ; `op=delete` → set `deletedAt=now` + `updatedAt=now`

- [ ] **Step 3: Smoke test curl avec Bearer**

- [ ] **Step 4: Commit**

```bash
git add api/src/sync api/src/index.ts
git commit -m "feat(api): sync pull et push LWW"
```

---

### Task 7: Types sync + merge LWW (extension) — TDD

**Files:**
- Create: `lib/sync/types.ts`
- Create: `lib/sync/merge.ts`
- Test: `lib/sync/merge.test.ts`

**Interfaces:**
- Produces:

```ts
export type SyncEntity =
  | 'profiles' | 'categories' | 'tags' | 'tasks' | 'task_tags' | 'subtasks';

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error';

export interface OutboxEntry {
  id: string;          // uuid outbox
  entity: SyncEntity;
  entityId: string;
  op: 'upsert' | 'delete';
  payload: Record<string, unknown>;
  updatedAt: string;
}

export interface CloudDocument {
  $id: string;
  userId: string;
  updatedAt: string;
  deletedAt: string | null;
  [key: string]: unknown;
}

export function pickWinner<T extends { updatedAt: string }>(
  local: T | null,
  cloud: T | null,
): T | null;

export function shouldApplyCloud(
  localUpdatedAt: string | null,
  cloud: { updatedAt: string; deletedAt: string | null },
): 'apply' | 'delete' | 'skip';
```

- [ ] **Step 1: Tests merge**

```ts
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
```

- [ ] **Step 2: Run — FAIL puis implémenter `merge.ts` — PASS**

```bash
npm test -- lib/sync/merge.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add lib/sync
git commit -m "feat(sync): types et merge LWW"
```

---

### Task 8: Client API extension + authStore

**Files:**
- Create: `lib/sync/client.ts`
- Create: `stores/authStore.ts`
- Modify: `wxt.config.ts` — `host_permissions: ['https://*.workers.dev/*']` + env `WXT_API_BASE_URL`
- Create: `.env.example` à la racine `WXT_API_BASE_URL=http://127.0.0.1:8787`

**Interfaces:**
- Produces:

```ts
// lib/sync/client.ts
export function getApiBase(): string;
export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<T>;

// stores/authStore.ts
interface AuthState {
  token: string | null;
  user: { id: string; email: string; name: string } | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>; // opens tab to /auth/google
  exchangeCode: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}
```

Stockage token : `chrome.storage.local` clé `auth:token` + `auth:user`.

- [ ] **Step 1: Implémenter client + store**
- [ ] **Step 2: `compile` TypeScript OK**

```bash
npm run compile
```

- [ ] **Step 3: Commit**

```bash
git add lib/sync/client.ts stores/authStore.ts wxt.config.ts .env.example
git commit -m "feat(ext): client API et authStore"
```

---

### Task 9: LoginScreen + gate dans App.tsx

**Files:**
- Create: `components/LoginScreen.tsx`, `components/LoginScreen.scss`
- Modify: `entrypoints/popup/App.tsx`

**Interfaces:**
- Consumes: `useAuthStore`
- UI : onglets Connexion / Créer un compte ; champs email/mdp ; bouton Google ; erreurs inline

- [ ] **Step 1: Composant LoginScreen** (style tokens existants, pas de cards inutiles)
- [ ] **Step 2: Gate**

```tsx
const { hydrated, token, hydrate } = useAuthStore();
useEffect(() => { void hydrate(); }, [hydrate]);
if (!hydrated) return <BootScreen />;
if (!token) return <LoginScreen />;
// existing shell…
```

- [ ] **Step 3: Smoke manuel `npm run dev` — login bloqué sans token**
- [ ] **Step 4: Commit**

```bash
git add components/LoginScreen.* entrypoints/popup/App.tsx
git commit -m "feat(ui): écran login et gate auth obligatoire"
```

---

### Task 10: Background OAuth bridge + permissions

**Files:**
- Modify: `entrypoints/background.ts`
- Modify: `wxt.config.ts` — `permissions` / `host_permissions` pour `APP` origin

**Interfaces:**
- Sur `chrome.tabs.onUpdated`, si URL match `${API}/auth/bridge?code=` → `exchangeCode` via message ou import store helpers → fermer l’onglet

```ts
export default defineBackground(() => {
  const base = import.meta.env.WXT_API_BASE_URL as string;
  chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
    if (info.status !== 'complete' || !tab.url) return;
    if (!tab.url.startsWith(`${base}/auth/bridge`)) return;
    const code = new URL(tab.url).searchParams.get('code');
    if (!code) return;
    await chrome.runtime.sendMessage({ type: 'oauth-code', code });
    // ou écrire directement storage + notify
    void chrome.tabs.remove(tabId);
  });
});
```

Popup écoute `chrome.runtime.onMessage` pour `oauth-code` → `exchangeCode`.

- [ ] **Step 1: Implémenter + tester Google flow bout-en-bout**
- [ ] **Step 2: Commit**

```bash
git add entrypoints/background.ts wxt.config.ts entrypoints/popup/App.tsx
git commit -m "feat(ext): interception OAuth bridge"
```

---

### Task 11: IndexedDB scoped par userId

**Files:**
- Modify: `lib/db/client.ts` — `IDB_NAME` dynamique `todo-extension-db:${userId}` ; `initDb(userId: string)` ; refuser init sans userId
- Modify: boot `App.tsx` — après auth, `initDb(user.id)`

**Interfaces:**
- `initDb(userId: string): Promise<void>`
- `resetDbConnection(): void` au logout / changement user

- [ ] **Step 1: Paramétrer IDB_KEY/NAME**
- [ ] **Step 2: Tests manuels : deux users → deux stores séparés**
- [ ] **Step 3: Commit**

```bash
git add lib/db/client.ts entrypoints/popup/App.tsx stores/authStore.ts
git commit -m "feat(db): isolation IndexedDB par userId"
```

---

### Task 12: Outbox + enqueue depuis repositories

**Files:**
- Create: `lib/sync/outbox.ts`
- Test: `lib/sync/outbox.test.ts` (mock storage mémoire)
- Modify: `lib/repositories/tasks.ts`, `tags.ts`, `categories.ts`, `profiles.ts` — après mutation réussie, `enqueueOutbox(...)`
- Soft-delete local optionnel V1 : delete hard local + outbox `op:'delete'`

**Interfaces:**

```ts
export async function enqueueOutbox(entry: Omit<OutboxEntry, 'id'>): Promise<void>;
export async function listOutbox(): Promise<OutboxEntry[]>;
export async function removeOutbox(ids: string[]): Promise<void>;
```

Storage clé : `sync:outbox:${userId}`.

- [ ] **Step 1: TDD outbox list/enqueue/remove**
- [ ] **Step 2: Brancher repos**
- [ ] **Step 3: Commit**

```bash
git add lib/sync/outbox.ts lib/sync/outbox.test.ts lib/repositories
git commit -m "feat(sync): outbox et hooks repositories"
```

---

### Task 13: syncStore + pull/push engine + background drain

**Files:**
- Create: `lib/sync/engine.ts` — `pullFromCloud()`, `pushOutbox()`
- Create: `lib/sync/mapper.ts` — document ↔ inserts SQL
- Create: `stores/syncStore.ts`
- Modify: `entrypoints/background.ts` — alarm/interval drain toutes les 30s + à `runtime.onStartup`
- Modify: `App.tsx` — `pull` après `initDb`

**Interfaces:**

```ts
// engine.ts
export async function runPull(token: string, userId: string): Promise<void>;
export async function runPush(token: string, userId: string): Promise<void>;

// syncStore
status: SyncStatus;
lastSyncAt: string | null;
lastError: string | null;
refreshStatus: () => Promise<void>;
syncNow: () => Promise<void>;
```

Merge pull : pour chaque doc, `shouldApplyCloud` puis mapper → SQL upsert/delete.

- [ ] **Step 1: mapper + engine**
- [ ] **Step 2: background `chrome.alarms.create('sync', { periodInMinutes: 0.5 })`**
- [ ] **Step 3: Test manuel offline → online**
- [ ] **Step 4: Commit**

```bash
git add lib/sync stores/syncStore.ts entrypoints/background.ts entrypoints/popup/App.tsx
git commit -m "feat(sync): engine pull/push et drain background"
```

---

### Task 14: SyncBadge + compte dans Settings

**Files:**
- Create: `components/SyncBadge.tsx`, `components/SyncBadge.scss`
- Modify: `components/Header.tsx` — afficher SyncBadge
- Modify: `components/Settings.tsx` — email, lastSyncAt, bouton Sync now, Déconnexion

- [ ] **Step 1: UI pastille + settings compte**
- [ ] **Step 2: Logout appelle `authStore.logout` + `resetDbConnection` + clear outbox mémoire session
- [ ] **Step 3: Commit**

```bash
git add components/SyncBadge.* components/Header.tsx components/Settings.tsx
git commit -m "feat(ui): pastille sync et compte dans paramètres"
```

---

### Task 15: README + QA manuel final

**Files:**
- Modify: `README.md` — architecture cloud, env, `api/` scripts, setup Appwrite link
- Modify: `package.json` description

**Checklist QA (cocher dans la PR / notes) :**

1. Register email → shell accessible  
2. Logout → Login gate  
3. Login Google → bridge ferme l’onglet → shell  
4. Créer tâche offline (devtools offline) → pending → online → synced  
5. Désinstall / reinstall → login → données revenues  
6. Aucune `APPWRITE_API_KEY` dans `.output/chrome-mv3` (`rg APPWRITE_API_KEY .output` vide)

- [ ] **Step 1: Doc**
- [ ] **Step 2: QA**
- [ ] **Step 3: Commit**

```bash
git add README.md package.json
git commit -m "docs: sync Appwrite et instructions API"
```

---

## Spec coverage (self-review)

| Spec | Task |
|---|---|
| Worker API gateway | 1, 4–6 |
| Auth email + Google obligatoire | 4, 5, 9, 10 |
| Bearer opaque | 3, 8 |
| Collections + userId + soft delete | 2, 6 |
| Pull/push LWW | 6, 7, 13 |
| Outbox background | 12, 13 |
| IDB par userId | 11 |
| Login UI + badge + settings | 9, 14 |
| Export JSON conservé | (existant, inchangé Task 14) |
| Pas de secrets extension | 1, 8, 15 |
| Tests merge/outbox | 7, 12 |

## Execution Handoff

Plan enregistré dans `docs/superpowers/plans/2026-08-08-appwrite-sync.md`.

**Deux options d’exécution :**

1. **Subagent-Driven (recommandé)** — un sous-agent par tâche, review entre chaque  
2. **Inline Execution** — exécution dans cette session avec checkpoints  

**Laquelle préfères-tu ?**
