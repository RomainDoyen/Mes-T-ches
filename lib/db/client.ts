import sqlite3InitModule, {
  type Database,
  type SqlValue,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import { MIGRATION_V1, SCHEMA_VERSION } from './schema';

const IDB_STORE = 'sqlite';
const IDB_KEY = 'main';

export type DbRow = Record<string, SqlValue | unknown>;

let sqlite3: Sqlite3Static | null = null;
let db: Database | null = null;
let currentUserId: string | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistEnabled = true;

function getIdbName(): string {
  if (!currentUserId) {
    throw new Error('IndexedDB user not set. Call initDb(userId) first.');
  }
  return `todo-extension-db:${currentUserId}`;
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(getIdbName(), 1);
    req.onupgradeneeded = () => {
      const database = req.result;
      if (!database.objectStoreNames.contains(IDB_STORE)) {
        database.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadBytes(): Promise<Uint8Array | null> {
  if (typeof indexedDB === 'undefined') return null;
  const database = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(IDB_KEY);
    req.onsuccess = () => {
      const value = req.result;
      if (!value) {
        resolve(null);
        return;
      }
      resolve(value instanceof Uint8Array ? value : new Uint8Array(value));
    };
    req.onerror = () => reject(req.error);
  });
}

async function saveBytes(bytes: Uint8Array): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const database = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

function getSqlite3(): Sqlite3Static {
  if (!sqlite3) throw new Error('SQLite module not initialized.');
  return sqlite3;
}

function runMigrations(database: Database): void {
  database.exec(MIGRATION_V1);
  const row = database.selectObjects(
    'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1',
  )[0] as { version?: number } | undefined;
  const current = row?.version ?? 0;
  if (current < SCHEMA_VERSION) {
    database.exec({
      sql: 'INSERT OR REPLACE INTO schema_migrations (version) VALUES (?)',
      bind: [SCHEMA_VERSION],
    });
  }
}

function schedulePersist(): void {
  if (!persistEnabled || !db || !sqlite3) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void flushPersist();
  }, 150);
}

export async function flushPersist(): Promise<void> {
  if (!persistEnabled || !db || !sqlite3) return;
  if (db.pointer == null) return;
  const bytes = sqlite3.capi.sqlite3_js_db_export(db.pointer);
  await saveBytes(bytes);
}

export function resetDbConnection(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (db) {
    db.close();
    db = null;
  }
  sqlite3 = null;
  currentUserId = null;
}

export async function initDb(
  userId: string,
  options?: { memoryOnly?: boolean },
): Promise<void> {
  if (!userId.trim()) {
    throw new Error('initDb requires a userId');
  }
  if (db && currentUserId === userId) return;
  if (db && currentUserId !== userId) {
    resetDbConnection();
  }

  currentUserId = userId;
  persistEnabled = !options?.memoryOnly;
  sqlite3 = await sqlite3InitModule();

  const memory = new sqlite3.oo1.DB(':memory:', 'c');
  const bytes = options?.memoryOnly ? null : await loadBytes();

  if (bytes && bytes.byteLength > 0 && memory.pointer != null) {
    const p = sqlite3.wasm.allocFromTypedArray(bytes);
    const rc = sqlite3.capi.sqlite3_deserialize(
      memory.pointer,
      'main',
      p,
      bytes.byteLength,
      bytes.byteLength,
      sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE |
        sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE,
    );
    if (rc !== 0) {
      console.warn('Failed to deserialize DB, starting fresh', rc);
    }
  }

  runMigrations(memory);
  db = memory;

  if (!options?.memoryOnly) {
    await flushPersist();
  }
}

export async function resetDbForTests(): Promise<void> {
  resetDbConnection();
  await initDb('test', { memoryOnly: true });
}

export function query<T = DbRow>(
  sql: string,
  params: SqlValue[] = [],
): T[] {
  const database = getDb();
  return database.selectObjects(sql, params) as T[];
}

export function queryOne<T = DbRow>(
  sql: string,
  params: SqlValue[] = [],
): T | null {
  const rows = query<T>(sql, params);
  return rows[0] ?? null;
}

export function run(sql: string, params: SqlValue[] = []): void {
  const database = getDb();
  database.exec({ sql, bind: params });
  schedulePersist();
}

export function transaction(fn: () => void): void {
  const database = getDb();
  database.exec('BEGIN');
  try {
    fn();
    database.exec('COMMIT');
    schedulePersist();
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function isDbReady(): boolean {
  return db !== null;
}

export { getSqlite3, getDb };
