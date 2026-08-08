import { Hono } from 'hono';
import { AppwriteException, ID } from 'node-appwrite';
import type { Env } from '../env';
import {
  createAccount,
  createEmailPasswordSession,
  getAccount,
} from '../appwrite/fetch';
import { issueBearer, revokeBearer } from './tokens';
import { requireAuth, type AuthVars } from './middleware';

type AuthResponse = {
  token: string;
  user: { id: string; email: string; name: string };
};

function formatUser(user: { $id: string; email: string; name: string }) {
  return { id: user.$id, email: user.email, name: user.name };
}

function appwriteStatus(e: AppwriteException): 400 | 401 | 409 | 500 {
  const code = e.code;
  if (code === 400 || code === 401 || code === 409) return code;
  return 500;
}

const authRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

authRoutes.post('/register', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string; name?: string }>();
  const { email, password, name } = body;
  if (!email || !password) {
    return c.json({ error: 'email and password required' }, 400);
  }

  try {
    const user = await createAccount(c.env, {
      userId: ID.unique(),
      email,
      password,
      name: name ?? '',
    });
    const session = await createEmailPasswordSession(c.env, { email, password });
    const token = await issueBearer(c.env, {
      userId: user.$id,
      appwriteSession: session.secret,
    });
    return c.json({ token, user: formatUser(user) } satisfies AuthResponse);
  } catch (e) {
    if (e instanceof AppwriteException) {
      return c.json({ error: e.message }, appwriteStatus(e));
    }
    throw e;
  }
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const { email, password } = body;
  if (!email || !password) {
    return c.json({ error: 'email and password required' }, 400);
  }

  try {
    const session = await createEmailPasswordSession(c.env, { email, password });
    const user = await getAccount(c.env, session.secret);
    const token = await issueBearer(c.env, {
      userId: user.$id,
      appwriteSession: session.secret,
    });
    return c.json({ token, user: formatUser(user) } satisfies AuthResponse);
  } catch (e) {
    if (e instanceof AppwriteException) {
      return c.json({ error: e.message }, appwriteStatus(e));
    }
    throw e;
  }
});

authRoutes.get('/me', requireAuth, async (c) => {
  try {
    const user = await getAccount(c.env, c.get('appwriteSession'));
    return c.json(formatUser(user));
  } catch (e) {
    if (e instanceof AppwriteException) {
      return c.json({ error: e.message }, appwriteStatus(e));
    }
    throw e;
  }
});

authRoutes.post('/logout', requireAuth, async (c) => {
  await revokeBearer(c.env, c.get('bearer'));
  return c.json({ ok: true });
});

export { authRoutes };
