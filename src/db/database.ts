import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('todo-calendar.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS todos (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          date TEXT NOT NULL,
          kind TEXT NOT NULL,
          start_minutes INTEGER,
          duration_minutes INTEGER NOT NULL DEFAULT 30,
          completed INTEGER NOT NULL DEFAULT 0,
          calendar_id TEXT,
          google_event_id TEXT,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          recurrence TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_todos_date ON todos(date);
        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY NOT NULL,
          todo_id TEXT NOT NULL,
          op TEXT NOT NULL,
          payload TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
      // Migrations for existing installs
      try {
        await db.execAsync('ALTER TABLE todos ADD COLUMN recurrence TEXT');
      } catch {
        // column already exists
      }
      return db;
    })();
  }
  return dbPromise;
}

export async function ensureDb(): Promise<void> {
  await getDb();
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}
