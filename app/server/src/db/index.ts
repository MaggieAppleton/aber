import BetterSqlite3 from 'better-sqlite3';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
export type Database = BetterSqlite3.Database;

export function createDatabase(path = ':memory:'): Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new BetterSqlite3(path);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  return db;
}

export function migrate(db: Database): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL) STRICT');
  const directory = fileURLToPath(new URL('./migrations/', import.meta.url));
  for (const file of readdirSync(directory).filter(f => f.endsWith('.sql')).sort()) {
    if (db.prepare('SELECT 1 FROM schema_migrations WHERE id=?').get(file)) continue;
    db.transaction(() => {
      db.exec(readFileSync(join(directory, file), 'utf8'));
      db.prepare('INSERT INTO schema_migrations(id,applied_at) VALUES(?,?)').run(file, new Date().toISOString());
    })();
  }
}
