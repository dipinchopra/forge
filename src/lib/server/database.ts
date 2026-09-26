import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { initializeStorage } from './storage';
const globalDb = globalThis as unknown as { forgeDb?: DatabaseSync };
export function getDatabase() {
 if (globalDb.forgeDb) return globalDb.forgeDb;
 const db = new DatabaseSync(path.join(initializeStorage(), 'forge.sqlite'));
 db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
 db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, appliedAt TEXT NOT NULL)');
 try {
  const directory = path.join(process.cwd(), 'migrations');
  for (const name of readdirSync(directory).filter(name => name.endsWith('.sql')).sort()) {
   db.exec('BEGIN IMMEDIATE');
   try { if (!db.prepare('SELECT name FROM schema_migrations WHERE name = ?').get(name)) { db.exec(readFileSync(path.join(directory, name), 'utf8')); db.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run(name, new Date().toISOString()); } db.exec('COMMIT'); }
   catch (error) { db.exec('ROLLBACK'); throw error; }
  }
 } catch(error) { db.close(); throw error; }
 globalDb.forgeDb = db;
 return db;
}
