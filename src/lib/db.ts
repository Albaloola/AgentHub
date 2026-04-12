/**
 * Legacy path — prefer `@/lib/backend/db` in new code.
 *
 * The database layer has been split into:
 *   backend/db/connection.ts   — handle + pragmas + boolean converter
 *   backend/db/migrations.ts   — idempotent ALTER TABLE calls
 *   backend/db/schema.ts       — CREATE TABLE / CREATE INDEX
 *   backend/db/seed.ts         — default data for fresh installs
 *
 * Kept as a shim so existing imports continue to work.
 */

export * from "./backend/db";
