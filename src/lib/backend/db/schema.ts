/**
 * Table & index DDL.
 *
 * All statements use `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`
 * so running this on an already-migrated database is a no-op.
 *
 * When you add a new table:
 *   1. Add its CREATE statement here in the appropriate section.
 *   2. If the table gains columns later, also add ALTER calls to `migrations.ts`.
 *   3. Add its TypeScript type to `@/lib/shared/types/<domain>.ts`.
 *
 * Tables are grouped into sections — search for "-- SECTION" to jump around.
 */

import type Database from "better-sqlite3";

export function createTablesAndIndexes(db: Database.Database): void {
  db.exec(`
    -- =====================================================================
    -- SECTION: Core (agents, conversations, messages, tool calls, attachments)
    -- =====================================================================

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
      capability_weights TEXT DEFAULT '{}',
      cost_per_token REAL DEFAULT 0,
      cost_per_request REAL DEFAULT 0,
      fallback_chain TEXT DEFAULT '[]',
      timeout_multiplier REAL DEFAULT 3.0,
      adaptive_timeout_enabled INTEGER DEFAULT 1,
      behavior_modes TEXT DEFAULT '{}',
      health_score INTEGER DEFAULT 100,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_channels (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT 'hash',
      color TEXT DEFAULT '#5b6bff',
      is_pinned INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      default_model TEXT,
      default_system_prompt TEXT,
      default_response_mode TEXT NOT NULL DEFAULT 'discussion' CHECK(default_response_mode IN ('discussion','parallel','targeted')),
      enabled_commands_json TEXT DEFAULT '[]',
      notification_prefs_json TEXT DEFAULT '{}',
      is_archived INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
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
      estimated_token_count INTEGER DEFAULT 0,
      auto_compact_enabled INTEGER DEFAULT 0,
      compact_threshold INTEGER DEFAULT 0,
      is_autonomous INTEGER DEFAULT 0,
      total_cost REAL DEFAULT 0,
      behavior_mode TEXT DEFAULT 'default',
      channel_id TEXT,
      folder_id TEXT,
      ghost_user_ids TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
      FOREIGN KEY (channel_id) REFERENCES agent_channels(id) ON DELETE SET NULL,
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
      is_pinned INTEGER DEFAULT 0,
      is_summary INTEGER DEFAULT 0,
      is_handoff INTEGER DEFAULT 0,
      is_edited INTEGER DEFAULT 0,
      original_message_id TEXT,
      handoff_from_agent_id TEXT,
      handoff_to_agent_id TEXT,
      handoff_context TEXT,
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

    -- =====================================================================
    -- SECTION: Tags, templates, voting, whiteboard, settings
    -- =====================================================================

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

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- =====================================================================
    -- SECTION: Workflows (visual pipeline builder)
    -- =====================================================================

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

    -- =====================================================================
    -- SECTION: v3 — checkpoints, API keys, webhooks
    -- =====================================================================

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

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      permissions TEXT DEFAULT '["agent:read","agent:write"]',
      rate_limit_rpm INTEGER DEFAULT 60,
      last_used_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      secret TEXT NOT NULL UNIQUE,
      agent_id TEXT NOT NULL,
      channel_id TEXT,
      system_prompt TEXT,
      body_transform TEXT,
      rate_limit_per_min INTEGER DEFAULT 10,
      is_active INTEGER DEFAULT 1,
      total_triggers INTEGER DEFAULT 0,
      last_triggered_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
      FOREIGN KEY (channel_id) REFERENCES agent_channels(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL,
      conversation_id TEXT,
      payload TEXT,
      response_message_id TEXT,
      status TEXT DEFAULT 'pending',
      error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
    );

    -- =====================================================================
    -- SECTION: v3 — routing log, arena, shared memory, scheduled tasks
    -- =====================================================================

    CREATE TABLE IF NOT EXISTS routing_log (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      message_id TEXT,
      candidate_scores TEXT,
      selected_agent_id TEXT,
      routing_reason TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

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

    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      channel_id TEXT,
      prompt TEXT NOT NULL,
      cron_expression TEXT,
      conversation_id TEXT,
      is_active INTEGER DEFAULT 1,
      is_running INTEGER DEFAULT 0,
      last_started_at TEXT,
      last_run_at TEXT,
      next_run_at TEXT,
      run_count INTEGER DEFAULT 0,
      last_status TEXT,
      last_error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
      FOREIGN KEY (channel_id) REFERENCES agent_channels(id) ON DELETE SET NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
    );

    -- =====================================================================
    -- SECTION: v3 — response cache, notifications, performance
    -- =====================================================================

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

    CREATE TABLE IF NOT EXISTS notification_rules (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'system',
      channel_id TEXT,
      delivery_channel TEXT DEFAULT 'in_app',
      routing_key TEXT,
      routing_metadata TEXT DEFAULT '{}',
      config TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (channel_id) REFERENCES agent_channels(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      source_type TEXT,
      severity TEXT DEFAULT 'info',
      title TEXT NOT NULL,
      body TEXT,
      source_id TEXT,
      agent_id TEXT,
      channel_id TEXT,
      conversation_id TEXT,
      task_id TEXT,
      webhook_id TEXT,
      action_url TEXT,
      dedupe_key TEXT,
      delivery_channel TEXT DEFAULT 'in_app',
      delivery_status TEXT DEFAULT 'pending',
      routing_key TEXT,
      routing_metadata TEXT DEFAULT '{}',
      is_read INTEGER DEFAULT 0,
      read_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
      FOREIGN KEY (channel_id) REFERENCES agent_channels(id) ON DELETE SET NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
      FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id) ON DELETE SET NULL,
      FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS performance_snapshots (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      latency_ms INTEGER,
      token_count INTEGER,
      error_occurred INTEGER DEFAULT 0,
      recorded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_perf_agent_time ON performance_snapshots(agent_id, recorded_at);
    CREATE INDEX IF NOT EXISTS idx_cache_lookup ON response_cache(agent_id, prompt_hash);
    CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read, created_at);
    CREATE INDEX IF NOT EXISTS idx_webhooks_channel ON webhooks(channel_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_webhook_events_conversation ON webhook_events(conversation_id, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_channels_agent_slug ON agent_channels(agent_id, slug);
    CREATE INDEX IF NOT EXISTS idx_agent_channels_pinned ON agent_channels(is_pinned, sort_order, updated_at);
    CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_due ON scheduled_tasks(is_active, is_running, next_run_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_route ON notifications(channel_id, conversation_id, task_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_dedupe ON notifications(dedupe_key);
    CREATE INDEX IF NOT EXISTS idx_shared_memory_key ON shared_memory(key);
    CREATE INDEX IF NOT EXISTS idx_checkpoints_conv ON checkpoints(conversation_id);

    -- =====================================================================
    -- SECTION: Phase 2 — folders, guardrails, traces, prompts, knowledge
    -- =====================================================================

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

    CREATE INDEX IF NOT EXISTS idx_traces_conv ON traces(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_prompt_versions_agent ON prompt_versions(agent_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_docs_kb ON documents(knowledge_base_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_folders_parent ON conversation_folders(parent_id);
    CREATE INDEX IF NOT EXISTS idx_guardrails_scope ON guardrail_rules(scope, is_active);

    -- =====================================================================
    -- SECTION: Phase 3 — personas, replay
    -- =====================================================================

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

    CREATE TABLE IF NOT EXISTS replay_snapshots (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      message_index INTEGER NOT NULL,
      timestamp_ms INTEGER NOT NULL,
      snapshot_data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    -- =====================================================================
    -- SECTION: Phase 4 — users, RBAC, audit, threads
    -- =====================================================================

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

    -- =====================================================================
    -- SECTION: Phase 5-6 — integrations, topics, feedback, anomalies
    -- =====================================================================

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

    -- =====================================================================
    -- SECTION: Phase 7 — theme, shortcuts, onboarding
    -- =====================================================================

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

    CREATE TABLE IF NOT EXISTS custom_shortcuts (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL UNIQUE,
      key_combo TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS onboarding_state (
      id TEXT PRIMARY KEY DEFAULT 'default',
      completed_steps TEXT DEFAULT '[]',
      is_complete INTEGER DEFAULT 0,
      current_step INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- =====================================================================
    -- SECTION: Phase 8 — A2A, policies, agent versions
    -- =====================================================================

    CREATE TABLE IF NOT EXISTS a2a_agent_cards (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      card_json TEXT NOT NULL DEFAULT '{}',
      endpoint_url TEXT,
      is_published INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

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
}
