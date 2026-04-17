/**
 * SQLite connection management.
 *
 * One connection per Node process, cached on `globalThis` so it survives
 * Next.js HMR cycles (which otherwise re-import the module and open a fresh
 * connection every time — eventually exhausting file handles in dev).
 *
 * Import `db` from `@/lib/backend/db` anywhere on the server — the first
 * access opens the connection, runs migrations, creates tables, and seeds
 * default agents if the DB is empty.
 */

import Database from "better-sqlite3";
import { getDbPath } from "@/lib/backend/runtime-paths";
import { applyMigrations } from "./migrations";
import { createTablesAndIndexes } from "./schema";
import { seedIfEmpty } from "./seed";

const DB_PATH = getDbPath();

function openAndPrepare(): Database.Database {
  // Return the cached instance across HMR reloads.
  const g = globalThis as unknown as { __agenthub_db?: Database.Database };
  if (g.__agenthub_db) return g.__agenthub_db;

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");      // concurrent readers, single writer
  db.pragma("busy_timeout = 5000");     // wait up to 5s for locks
  db.pragma("foreign_keys = ON");       // enforce FK constraints
  g.__agenthub_db = db;

  // Wrap schema setup in a transaction so a half-applied state can't persist.
  db.exec("BEGIN IMMEDIATE");
  try {
    applyMigrations(db);
    createTablesAndIndexes(db);
    seedIfEmpty(db);
    db.exec("COMMIT");
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch { /* best-effort rollback */ }
    throw error;
  }
  return db;
}

/**
 * Lazy-initialised database handle.
 *
 * Exposed as a Proxy so `import { db }` is cheap — the connection is only
 * opened the first time anyone actually calls a method on it.
 */
export const db = new Proxy({} as Database.Database, {
  get(_target, property, receiver) {
    const instance = openAndPrepare();
    const value = Reflect.get(instance as object, property, receiver);
    // Functions must be bound so `this` is the real Database instance.
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
}) as Database.Database;

/**
 * SQLite stores booleans as INTEGER 0/1. This helper converts known boolean
 * columns on a row back to proper `true` / `false` for the API layer.
 *
 * Add new boolean column names to `BOOLEAN_FIELDS` below when the schema
 * gains new ones — otherwise JSON responses will leak `0` / `1`.
 */
const BOOLEAN_FIELDS = new Set([
  "is_active", "is_available", "is_pinned", "is_summary", "is_handoff", "is_edited",
  "is_read", "is_resolved", "is_published", "is_builtin", "is_complete", "is_autonomous",
  "is_archived", "is_running",
  "adaptive_timeout_enabled", "auto_compact_enabled", "stop_on_completion", "error_occurred",
]);

export function toBooleans<T extends Record<string, unknown>>(row: T): T {
  const result = { ...row };
  for (const key of Object.keys(result)) {
    if (BOOLEAN_FIELDS.has(key)) {
      (result as Record<string, unknown>)[key] = !!(result as Record<string, unknown>)[key];
    }
  }
  return result;
}
