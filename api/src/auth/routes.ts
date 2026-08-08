import { Hono } from 'hono';
import { AppwriteException, ID } from 'node-appwrite';
import type { Env } from '../env';
import {
  createAccount,
  createEmailPasswordSession,
  createSessionFromToken,
  getAccount,
} from '../appwrite/fetch';
import {
  bridgeHtml,
  buildGoogleOAuthUrl,
  consumeOAuthCode,
  storeOAuthCode,
} from './oauth';
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

authRoutes.get('/google', (c) => c.redirect(buildGoogleOAuthUrl(c.env)));

authRoutes.get('/callback', async (c) => {
  const userId = c.req.query('userId');
  const secret = c.req.query('secret');
  if (!userId || !secret) {
    return c.redirect(`${c.env.APP_ORIGIN}/auth/bridge?error=1`);
  }

  try {
    const session = await createSessionFromToken(c.env, { userId, secret });
    const code = await storeOAuthCode(c.env, {
      userId,
      appwriteSession: session.secret,
    });
    return c.redirect(`${c.env.APP_ORIGIN}/auth/bridge?code=${code}`);
  } catch (e) {
    if (e instanceof AppwriteException) {
      return c.redirect(`${c.env.APP_ORIGIN}/auth/bridge?error=1`);
    }
    throw e;
  }
});

authRoutes.get('/bridge', (c) => {
  const error = c.req.query('error');
  return c.html(bridgeHtml({ error: error === '1' }), 200, {
    'Content-Type': 'text/html; charset=utf-8',
  });
});

authRoutes.post('/exchange', async (c) => {
  const body = await c.req.json<{ code?: string }>();
  const { code } = body;
  if (!code) {
    return c.json({ error: 'code required' }, 400);
  }

  const data = await consumeOAuthCode(c.env, code);
  if (!data) {
    return c.json({ error: 'invalid_code' }, 400);
  }

  try {
    const user = await getAccount(c.env, data.appwriteSession);
    const token = await issueBearer(c.env, data);
    return c.json({ token, user: formatUser(user) } satisfies AuthResponse);
  } catch (e) {
    if (e instanceof AppwriteException) {
      return c.json({ error: e.message }, appwriteStatus(e));
    }
    throw e;
  }
});

export { authRoutes };
