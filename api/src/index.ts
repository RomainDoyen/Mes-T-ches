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
