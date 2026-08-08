import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './auth/routes';
import { syncRoutes } from './sync/routes';
import type { Env } from './env';
import { DATABASE_ID } from './sync/collections';

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

app.get('/health', (c) => c.json({ ok: true, databaseId: DATABASE_ID }));
app.route('/auth', authRoutes);
app.route('/sync', syncRoutes);

export default app;
