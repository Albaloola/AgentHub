import Database from "better-sqlite3";
import path from "path";
import { v4 as uuid } from "uuid";

const DB_PATH = path.join(process.cwd(), "data", "agenthub.db");

function getDb(): Database.Database {
  const g = globalThis as unknown as { __agenthub_db?: Database.Database };
  if (g.__agenthub_db) return g.__agenthub_db;

  const fs = require("fs");
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  g.__agenthub_db = db;

  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  // Migration safety: add columns if they don't exist (for existing databases)
  const safeAlter = (sql: string) => { try { db.exec(sql); } catch { /* exists */ } };

  // Existing migrations
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

  // v3 migrations — Smart Context, Handoff, Routing, Cost, Behavior, Fallback, Caching, Scheduling
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_url TEXT,
      gateway_type TEXT NOT NULL,
      connection_url TEXT NOT NULL,
      connection_config TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      is_available INTEGER DEFAULT 1,
      last_seen TEXT,
      avg_response_time_ms INTEGER DEFAULT 0,
      total_messages INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('single','group')),
      name TEXT NOT NULL,
      agent_id TEXT,
      is_pinned INTEGER DEFAULT 0,
      template_id TEXT,
      parent_conversation_id TEXT,
      summary TEXT,
      max_responses_per_turn INTEGER DEFAULT 0,
      stop_on_completion INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL,
      FOREIGN KEY (parent_conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS conversation_agents (
      conversation_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      response_mode TEXT NOT NULL DEFAULT 'discussion' CHECK(response_mode IN ('discussion','parallel','targeted')),
      agent_role TEXT DEFAULT 'contributor' CHECK(agent_role IN ('leader','reviewer','executor','observer','contributor')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (conversation_id, agent_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_agent_id TEXT,
      content TEXT NOT NULL,
      thinking_content TEXT DEFAULT '',
      token_count INTEGER DEFAULT 0,
      parent_message_id TEXT,
      branch_point TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
      FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tool_calls (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      input TEXT NOT NULL DEFAULT '{}',
      output TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','success','error')),
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subagents (
      id TEXT PRIMARY KEY,
      parent_agent_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      goal TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed')),
      result TEXT,
      error TEXT,
      spawned_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (parent_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversation_tags (
      conversation_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (conversation_id, tag_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      response_mode TEXT NOT NULL DEFAULT 'discussion' CHECK(response_mode IN ('discussion','parallel','targeted')),
      system_prompt TEXT,
      max_responses_per_turn INTEGER DEFAULT 0,
      stop_on_completion INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS template_agents (
      template_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      agent_role TEXT DEFAULT 'contributor' CHECK(agent_role IN ('leader','reviewer','executor','observer','contributor')),
      PRIMARY KEY (template_id, agent_id),
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS response_votes (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      vote_type TEXT NOT NULL CHECK(vote_type IN ('up','down')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS whiteboards (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      nodes TEXT NOT NULL DEFAULT '[]',
      edges TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workflow_runs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed','cancelled')),
      current_node TEXT,
      result TEXT,
      error TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- v3: Checkpoints
    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      name TEXT,
      description TEXT,
      snapshot_json TEXT NOT NULL,
      message_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    -- v3: API Keys
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      permissions TEXT DEFAULT '["agent:read","agent:write"]',
      rate_limit_rpm INTEGER DEFAULT 60,
      last_used_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- v3: Webhooks
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      secret TEXT NOT NULL UNIQUE,
      agent_id TEXT NOT NULL,
      system_prompt TEXT,
      body_transform TEXT,
      rate_limit_per_min INTEGER DEFAULT 10,
      is_active INTEGER DEFAULT 1,
      total_triggers INTEGER DEFAULT 0,
      last_triggered_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL,
      payload TEXT,
      response_message_id TEXT,
      status TEXT DEFAULT 'pending',
      error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
    );

    -- v3: Routing Log
    CREATE TABLE IF NOT EXISTS routing_log (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      message_id TEXT,
      candidate_scores TEXT,
      selected_agent_id TEXT,
      routing_reason TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- v3: Arena Rounds
    CREATE TABLE IF NOT EXISTS arena_rounds (
      id TEXT PRIMARY KEY,
      prompt TEXT NOT NULL,
      category TEXT,
      agents TEXT NOT NULL,
      results TEXT DEFAULT '{}',
      winner_agent_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- v3: Shared Memory
    CREATE TABLE IF NOT EXISTS shared_memory (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      source_agent_id TEXT,
      confidence REAL DEFAULT 1.0,
      access_count INTEGER DEFAULT 0,
      last_accessed TEXT,
      expires_at TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- v3: Scheduled Tasks
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      prompt TEXT NOT NULL,
      cron_expression TEXT,
      conversation_id TEXT,
      is_active INTEGER DEFAULT 1,
      last_run_at TEXT,
      next_run_at TEXT,
      run_count INTEGER DEFAULT 0,
      last_status TEXT,
      last_error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    -- v3: Response Cache
    CREATE TABLE IF NOT EXISTS response_cache (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      prompt_hash TEXT NOT NULL,
      response TEXT NOT NULL,
      token_count INTEGER DEFAULT 0,
      hit_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    -- v3: Notification Rules
    CREATE TABLE IF NOT EXISTS notification_rules (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'system',
      config TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- v3: Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      source_id TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- v3: Performance snapshots for degradation monitoring
    CREATE TABLE IF NOT EXISTS performance_snapshots (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      latency_ms INTEGER,
      token_count INTEGER,
      error_occurred INTEGER DEFAULT 0,
      recorded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    -- v3: Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_perf_agent_time ON performance_snapshots(agent_id, recorded_at);
    CREATE INDEX IF NOT EXISTS idx_cache_lookup ON response_cache(agent_id, prompt_hash);
    CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read, created_at);
    CREATE INDEX IF NOT EXISTS idx_shared_memory_key ON shared_memory(key);
    CREATE INDEX IF NOT EXISTS idx_checkpoints_conv ON checkpoints(conversation_id);

    -- Phase 2: Conversation Folders
    CREATE TABLE IF NOT EXISTS conversation_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      sort_order INTEGER DEFAULT 0,
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT 'folder',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES conversation_folders(id) ON DELETE CASCADE
    );

    -- Phase 2: Guardrail Rules
    CREATE TABLE IF NOT EXISTS guardrail_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'content_filter',
      pattern TEXT NOT NULL,
      action TEXT NOT NULL DEFAULT 'warn',
      scope TEXT DEFAULT 'global',
      agent_id TEXT,
      is_active INTEGER DEFAULT 1,
      trigger_count INTEGER DEFAULT 0,
      last_triggered_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    -- Phase 2: Execution Traces
    CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      message_id TEXT,
      agent_id TEXT,
      spans_json TEXT NOT NULL DEFAULT '[]',
      total_duration_ms INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      total_cost REAL DEFAULT 0,
      status TEXT DEFAULT 'ok',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    -- Phase 2: Prompt Versions
    CREATE TABLE IF NOT EXISTS prompt_versions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'default',
      version INTEGER NOT NULL DEFAULT 1,
      content TEXT NOT NULL,
      variables TEXT DEFAULT '[]',
      model_params TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 0,
      environment TEXT DEFAULT 'dev',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    -- Phase 2: Knowledge Bases
    CREATE TABLE IF NOT EXISTS knowledge_bases (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      document_count INTEGER DEFAULT 0,
      total_chunks INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      knowledge_base_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      chunk_count INTEGER DEFAULT 0,
      content_preview TEXT,
      file_path TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      content TEXT NOT NULL,
      chunk_index INTEGER DEFAULT 0,
      token_count INTEGER DEFAULT 0,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    -- Phase 2: Indexes
    CREATE INDEX IF NOT EXISTS idx_traces_conv ON traces(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_prompt_versions_agent ON prompt_versions(agent_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_docs_kb ON documents(knowledge_base_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_folders_parent ON conversation_folders(parent_id);
    CREATE INDEX IF NOT EXISTS idx_guardrails_scope ON guardrail_rules(scope, is_active);

    -- Phase 3: Agent Personas
    CREATE TABLE IF NOT EXISTS personas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      description TEXT,
      system_prompt TEXT NOT NULL,
      behavior_mode TEXT DEFAULT 'default',
      capability_weights TEXT DEFAULT '{}',
      icon TEXT DEFAULT 'user',
      is_builtin INTEGER DEFAULT 0,
      usage_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Phase 3: Conversation Replay snapshots
    CREATE TABLE IF NOT EXISTS replay_snapshots (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      message_index INTEGER NOT NULL,
      timestamp_ms INTEGER NOT NULL,
      snapshot_data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    -- Phase 4: Users & RBAC
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      role TEXT DEFAULT 'operator',
      password_hash TEXT,
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversation_permissions (
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      permission TEXT DEFAULT 'participant',
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (conversation_id, user_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      actor_type TEXT DEFAULT 'user',
      actor_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Phase 4: Message Threads
    CREATE TABLE IF NOT EXISTS message_threads (
      id TEXT PRIMARY KEY,
      parent_message_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      reply_count INTEGER DEFAULT 0,
      last_reply_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    -- Phase 5: Native Integrations
    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      config TEXT DEFAULT '{}',
      oauth_tokens TEXT DEFAULT '{}',
      agent_id TEXT,
      is_active INTEGER DEFAULT 1,
      last_sync_at TEXT,
      event_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
    );

    -- Phase 6: Topic Clusters
    CREATE TABLE IF NOT EXISTS topic_clusters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      keywords TEXT NOT NULL DEFAULT '[]',
      conversation_count INTEGER DEFAULT 0,
      color TEXT DEFAULT '#6366f1',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversation_topics (
      conversation_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      confidence REAL DEFAULT 1.0,
      PRIMARY KEY (conversation_id, topic_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id) REFERENCES topic_clusters(id) ON DELETE CASCADE
    );

    -- Phase 6: Agent Learning Feedback
    CREATE TABLE IF NOT EXISTS feedback_insights (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      topic TEXT,
      positive_count INTEGER DEFAULT 0,
      negative_count INTEGER DEFAULT 0,
      sample_messages TEXT DEFAULT '[]',
      insight TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    -- Phase 6: Anomaly Events
    CREATE TABLE IF NOT EXISTS anomaly_events (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT DEFAULT 'warning',
      metric_name TEXT,
      expected_value REAL,
      actual_value REAL,
      description TEXT,
      is_resolved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    -- Phase 7: Theme Preferences
    CREATE TABLE IF NOT EXISTS theme_preferences (
      id TEXT PRIMARY KEY DEFAULT 'default',
      theme TEXT DEFAULT 'dark',
      accent_color TEXT DEFAULT '#3b82f6',
      font_family TEXT DEFAULT 'system-ui',
      density TEXT DEFAULT 'comfortable',
      border_radius TEXT DEFAULT 'md',
      custom_css TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Phase 7: Keyboard Shortcuts
    CREATE TABLE IF NOT EXISTS custom_shortcuts (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL UNIQUE,
      key_combo TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Phase 7: Onboarding State
    CREATE TABLE IF NOT EXISTS onboarding_state (
      id TEXT PRIMARY KEY DEFAULT 'default',
      completed_steps TEXT DEFAULT '[]',
      is_complete INTEGER DEFAULT 0,
      current_step INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Phase 8: A2A Agent Cards
    CREATE TABLE IF NOT EXISTS a2a_agent_cards (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      card_json TEXT NOT NULL DEFAULT '{}',
      endpoint_url TEXT,
      is_published INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    -- Phase 8: Policy Rules (Runtime enforcement)
    CREATE TABLE IF NOT EXISTS policy_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'action_filter',
      rule_json TEXT NOT NULL DEFAULT '{}',
      severity TEXT DEFAULT 'block',
      scope TEXT DEFAULT 'global',
      agent_id TEXT,
      is_active INTEGER DEFAULT 1,
      violation_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    -- Phase 8: Agent Versions (Canary deployments)
    CREATE TABLE IF NOT EXISTS agent_versions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      version TEXT NOT NULL,
      prompt_hash TEXT,
      config_hash TEXT,
      traffic_pct INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      metrics_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    -- Indexes for Phases 3-8
    CREATE INDEX IF NOT EXISTS idx_personas_category ON personas(category);
    CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_threads_parent ON message_threads(parent_message_id);
    CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type, is_active);
    CREATE INDEX IF NOT EXISTS idx_anomalies_agent ON anomaly_events(agent_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_feedback_agent ON feedback_insights(agent_id);
    CREATE INDEX IF NOT EXISTS idx_topics_conv ON conversation_topics(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_a2a_agent ON a2a_agent_cards(agent_id);
    CREATE INDEX IF NOT EXISTS idx_policy_scope ON policy_rules(scope, is_active);
    CREATE INDEX IF NOT EXISTS idx_agent_versions ON agent_versions(agent_id, is_active);
  `);

  // Seed if empty
  const count = db.prepare("SELECT COUNT(*) as c FROM agents").get() as { c: number };
  if (count.c === 0) seed(db);
}

function seed(db: Database.Database) {
  // OpenClaw gateway: Jerry (jaimy agent) and Jamie (jamie agent)
  // OpenClaw runs on localhost:18789 with token auth, OpenAI-compatible API
  const openclawJerryId = uuid();
  db.prepare(`
    INSERT INTO agents (id, name, avatar_url, gateway_type, connection_url, connection_config, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    openclawJerryId, "Jerry", null, "openai-compat",
    "http://localhost:18789",
    JSON.stringify({
      api_key: "REDACTED",
      model: "openclaw/jaimy",
      chat_endpoint: "/v1/chat/completions",
    }),
    1,
  );

  const openclawJamieId = uuid();
  db.prepare(`
    INSERT INTO agents (id, name, avatar_url, gateway_type, connection_url, connection_config, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    openclawJamieId, "Jamie", null, "openai-compat",
    "http://localhost:18789",
    JSON.stringify({
      api_key: "REDACTED",
      model: "openclaw/jamie",
      chat_endpoint: "/v1/chat/completions",
    }),
    1,
  );

  // Seed a default theme
  db.prepare(`INSERT OR IGNORE INTO theme_preferences (id) VALUES ('default')`).run();
  db.prepare(`INSERT OR IGNORE INTO onboarding_state (id) VALUES ('default')`).run();
}

export const db = getDb();
