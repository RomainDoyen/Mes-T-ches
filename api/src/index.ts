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

app.get('/debug/databases', async (c) => {
  try {
    const { listTablesDatabases } = await import('./appwrite/databases');
    const listed = await listTablesDatabases(c.env);
    return c.json({
      configuredDatabaseId: DATABASE_ID,
      listed,
    });
  } catch (e) {
    return c.json(
      {
        configuredDatabaseId: DATABASE_ID,
        error: e instanceof Error ? e.message : String(e),
      },
      500,
    );
  }
});

app.get('/debug/schema', async (c) => {
  try {
    const { inspectSchema } = await import('./sync/provision');
    return c.json(await inspectSchema(c.env));
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

app.post('/debug/provision-schema', async (c) => {
  try {
    const table = c.req.query('table') ?? undefined;
    const { provisionSchema } = await import('./sync/provision');
    return c.json(await provisionSchema(c.env, table));
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

app.route('/auth', authRoutes);
app.route('/sync', syncRoutes);

export default app;
