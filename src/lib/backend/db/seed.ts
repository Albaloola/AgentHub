/**
 * Default data inserted into a fresh database.
 *
 * Runs exactly once — when the `agents` table is empty. That means:
 *  • First-time install: users get a working set of agents out of the box.
 *  • Existing installs: nothing happens, their data is preserved.
 *
 * To add a new seed agent, insert another `db.prepare(...).run(...)` below.
 * Keep the Mock Echo Bot — it's the zero-config "does AgentHub actually work?"
 * test that works without any external gateway.
 */

import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";

export function seedIfEmpty(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) as c FROM agents").get() as { c: number };
  if (count.c > 0) return;

  // --- OpenClaw gateway (Jerry + Jamie) -------------------------------------
  // OpenClaw runs on localhost:18789 with token auth, OpenAI-compatible API.
  const jerryId = insertAgent(db, {
    name: "Jerry",
    gateway_type: "openclaw",
    url: "http://localhost:18789",
    config: {
      api_key: process.env.OPENCLAW_API_KEY || "",
      model: "openclaw/jaimy",
      chat_endpoint: "/v1/chat",
      request_format: "openai",
    },
  });

  const jamieId = insertAgent(db, {
    name: "Jamie",
    gateway_type: "openclaw",
    url: "http://localhost:18789",
    config: {
      api_key: process.env.OPENCLAW_API_KEY || "",
      model: "openclaw/jamie",
      chat_endpoint: "/v1/chat",
      request_format: "openai",
    },
  });

  // --- Hermes (local CLI-based agent, no HTTP API) --------------------------
  const hermesId = insertAgent(db, {
    name: "Hermes",
    gateway_type: "hermes",
    url: "cli://hermes",
    config: {
      hermes_path: `${process.env.HOME}/.hermes/hermes-agent/venv/bin/python`,
      timeout_ms: 60000,
      max_turns: 30,
    },
  });

  // --- Mock Echo Bot (works out of the box for testing) --------------------
  const echoId = insertAgent(db, {
    name: "Echo Bot",
    gateway_type: "mock",
    url: "mock://echo",
    config: { delay_ms: 40, echo: true },
  });

  insertDefaultChannel(db, jerryId, "Jerry Ops", "ops", "#5b6bff", "shield");
  insertDefaultChannel(db, jamieId, "Jamie Build", "build", "#7c56ff", "wrench");
  insertDefaultChannel(db, hermesId, "Hermes Console", "console", "#10b981", "terminal");
  insertDefaultChannel(db, echoId, "Echo Sandbox", "sandbox", "#f59e0b", "message-square");

  // --- Singleton rows for preferences --------------------------------------
  db.prepare(`INSERT OR IGNORE INTO theme_preferences (id) VALUES ('default')`).run();
  db.prepare(`INSERT OR IGNORE INTO onboarding_state (id) VALUES ('default')`).run();
}

interface SeedAgent {
  name: string;
  gateway_type: string;
  url: string;
  config: Record<string, unknown>;
}

function insertAgent(db: Database.Database, a: SeedAgent): string {
  const id = uuid();
  db.prepare(`
    INSERT INTO agents (id, name, avatar_url, gateway_type, connection_url, connection_config, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, a.name, null, a.gateway_type, a.url, JSON.stringify(a.config), 1);
  return id;
}

function insertDefaultChannel(
  db: Database.Database,
  agentId: string,
  name: string,
  slug: string,
  color: string,
  icon: string,
) {
  db.prepare(`
    INSERT INTO agent_channels (
      id, agent_id, name, slug, color, icon, is_pinned, default_response_mode
    ) VALUES (?, ?, ?, ?, ?, ?, 1, 'discussion')
  `).run(uuid(), agentId, name, slug, color, icon);
}
