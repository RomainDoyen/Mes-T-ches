#!/usr/bin/env npx tsx
/**
 * Provision Appwrite TablesDB: database + tables + columns + indexes.
 *
 * Usage (from api/):
 *   npm run provision
 *   npm run provision -- --table=tasks
 *
 * Credentials: env vars or api/.dev.vars
 */
import { loadAppwriteCredentials } from './load-env';
import {
  ensureDatabase,
  provisionAll,
  provisionSchema,
} from '../src/sync/provision';

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

async function main() {
  const env = loadAppwriteCredentials();
  const table = argValue('table');

  if (table) {
    const db = await ensureDatabase(env);
    console.log(JSON.stringify(db));
    if (!db.ok) process.exit(1);
    const result = await provisionSchema(env, table);
    console.log(JSON.stringify(result, null, 2));
    const failed = result.log.filter((e) => !e.ok);
    if (failed.length > 0 || result.error) process.exit(1);
    return;
  }

  const result = await provisionAll(env);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
  console.log('Provision OK');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
