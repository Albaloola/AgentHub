/**
 * Schema migrations.
 *
 * Each migration is a `safeAlter` call — runs the ALTER, ignores "duplicate
 * column" errors, so it's safe to re-run on databases that already have the
 * column. That's how we support users upgrading from older versions without
 * writing a real migration runner.
 *
 * When you add a new column to an existing table:
 *   1. Add the column to the `CREATE TABLE` in `schema.ts` (for fresh DBs).
 *   2. Add a `safeAlter` call below (for existing DBs upgrading).
 *
 * Do NOT remove entries here — even old ones. They're idempotent, and
 * removing them will strand any user whose DB predates the removed one.
 */

import type Database from "better-sqlite3";

export function applyMigrations(db: Database.Database): void {
  const safeAlter = (sql: string) => {
    try { db.exec(sql); } catch { /* column already exists — skip */ }
  };

  // --- Original migrations ------------------------------------------------
  safeAlter("ALTER TABLE messages ADD COLUMN thinking_content TEXT DEFAULT ''");
  safeAlter("ALTER TABLE messages ADD COLUMN token_count INTEGER DEFAULT 0");
  safeAlter("ALTER TABLE messages ADD COLUMN parent_message_id TEXT");
  safeAlter("ALTER TABLE messages ADD COLUMN branch_point TEXT");
  safeAlter("ALTER TABLE conversations ADD COLUMN is_pinned INTEGER DEFAULT 0");
  safeAlter("ALTER TABLE conversations ADD COLUMN template_id TEXT");
  safeAlter("ALTER TABLE conversations ADD COLUMN parent_conversation_id TEXT");
  safeAlter("ALTER TABLE conversations ADD COLUMN summary TEXT");
  safeAlter("ALTER TABLE conversations ADD COLUMN max_responses_per_turn INTEGER DEFAULT 0");
  safeAlter("ALTER TABLE conversations ADD COLUMN stop_on_completion INTEGER DEFAULT 0");
  safeAlter("ALTER TABLE conversation_agents ADD COLUMN agent_role TEXT DEFAULT 'contributor'");
  safeAlter("ALTER TABLE agents ADD COLUMN is_available INTEGER DEFAULT 1");
  safeAlter("ALTER TABLE agents ADD COLUMN avg_response_time_ms INTEGER DEFAULT 0");
  safeAlter("ALTER TABLE agents ADD COLUMN total_messages INTEGER DEFAULT 0");
  safeAlter("ALTER TABLE agents ADD COLUMN total_tokens INTEGER DEFAULT 0");
  safeAlter("ALTER TABLE agents ADD COLUMN error_count INTEGER DEFAULT 0");

  // --- v3: Smart Context, Handoff, Routing, Cost, Behavior, Fallback, Cache, Scheduling
  safeAlter("ALTER TABLE messages ADD COLUMN is_pinned INTEGER DEFAULT 0");
  safeAlter("ALTER TABLE messages ADD COLUMN is_summary INTEGER DEFAULT 0");
  safeAlter("ALTER TABLE messages ADD COLUMN original_message_id TEXT");
  safeAlter("ALTER TABLE messages ADD COLUMN is_handoff INTEGER DEFAULT 0");
  safeAlter("ALTER TABLE messages ADD COLUMN handoff_from_agent_id TEXT");
  safeAlter("ALTER TABLE messages ADD COLUMN handoff_to_agent_id TEXT");
  safeAlter("ALTER TABLE messages ADD COLUMN handoff_context TEXT");
  safeAlter("ALTER TABLE conversations ADD COLUMN estimated_token_count INTEGER DEFAULT 0");
  safeAlter("ALTER TABLE conversations ADD COLUMN auto_compact_enabled INTEGER DEFAULT 0");
  safeAlter("ALTER TABLE conversations ADD COLUMN compact_threshold INTEGER DEFAULT 0");
  safeAlter("ALTER TABLE conversations ADD COLUMN is_autonomous INTEGER DEFAULT 0");
  safeAlter("ALTER TABLE conversations ADD COLUMN ghost_user_ids TEXT DEFAULT '[]'");
  safeAlter("ALTER TABLE conversations ADD COLUMN total_cost REAL DEFAULT 0");
  safeAlter("ALTER TABLE conversations ADD COLUMN behavior_mode TEXT DEFAULT 'default'");
  safeAlter("ALTER TABLE agents ADD COLUMN capability_weights TEXT DEFAULT '{}'");
  safeAlter("ALTER TABLE agents ADD COLUMN cost_per_token REAL DEFAULT 0");
  safeAlter("ALTER TABLE agents ADD COLUMN cost_per_request REAL DEFAULT 0");
  safeAlter("ALTER TABLE agents ADD COLUMN fallback_chain TEXT DEFAULT '[]'");
  safeAlter("ALTER TABLE agents ADD COLUMN timeout_multiplier REAL DEFAULT 3.0");
  safeAlter("ALTER TABLE agents ADD COLUMN adaptive_timeout_enabled INTEGER DEFAULT 1");
  safeAlter("ALTER TABLE agents ADD COLUMN behavior_modes TEXT DEFAULT '{}'");
  safeAlter("ALTER TABLE agents ADD COLUMN health_score INTEGER DEFAULT 100");
  safeAlter("ALTER TABLE messages ADD COLUMN is_edited INTEGER DEFAULT 0");
  safeAlter("ALTER TABLE conversations ADD COLUMN folder_id TEXT");
}
