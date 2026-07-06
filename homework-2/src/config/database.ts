import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

export type AppDatabase = BetterSQLite3Database;

const MIGRATIONS_FOLDER = './drizzle';
const DB_PATH = 'data/support.db';

export function createDatabase(databaseUrl = ':memory:'): AppDatabase {
  if (databaseUrl !== ':memory:') {
    mkdirSync(dirname(databaseUrl), { recursive: true });
  }

  const sqlite = new Database(databaseUrl);
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}

export function createApplicationDatabase(): AppDatabase {
  return createDatabase(DB_PATH);
}
