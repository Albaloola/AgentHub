/**
 * Barrel for the database layer.
 *
 *   import { db, toBooleans } from "@/lib/backend/db";
 *
 * Which file does what:
 *   connection.ts — opens SQLite, caches on globalThis, exposes `db` Proxy.
 *   migrations.ts — idempotent ALTER TABLE calls for upgrading old DBs.
 *   schema.ts     — CREATE TABLE + CREATE INDEX for fresh DBs.
 *   seed.ts       — default agents + preference singletons, first run only.
 */

export { db, toBooleans } from "./connection";
