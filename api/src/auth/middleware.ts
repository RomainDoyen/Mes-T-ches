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
