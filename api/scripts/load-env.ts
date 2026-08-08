import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Parse wrangler-style `.dev.vars` / dotenv KEY=VALUE files. */
export function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of contents.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function loadAppwriteCredentials(
  cwd = process.cwd(),
): {
  APPWRITE_ENDPOINT: string;
  APPWRITE_PROJECT_ID: string;
  APPWRITE_API_KEY: string;
} {
  const fromFile: Record<string, string> = {};
  const candidates = [
    resolve(cwd, '.dev.vars'),
    resolve(cwd, '.env'),
    resolve(cwd, '../.env'),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    Object.assign(fromFile, parseEnvFile(readFileSync(path, 'utf8')));
  }

  const pick = (key: string): string =>
    (process.env[key] ?? fromFile[key] ?? '').trim();

  const APPWRITE_ENDPOINT = pick('APPWRITE_ENDPOINT');
  const APPWRITE_PROJECT_ID = pick('APPWRITE_PROJECT_ID');
  const APPWRITE_API_KEY = pick('APPWRITE_API_KEY');

  const missing = [
    !APPWRITE_ENDPOINT && 'APPWRITE_ENDPOINT',
    !APPWRITE_PROJECT_ID && 'APPWRITE_PROJECT_ID',
    !APPWRITE_API_KEY && 'APPWRITE_API_KEY',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Missing Appwrite credentials: ${missing.join(', ')} (set env or api/.dev.vars)`,
    );
  }

  return { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY };
}
