/**
 * Governance types — guardrails, runtime policies, user accounts, RBAC,
 * audit log, conversation-level permissions, and A2A agent cards.
 *
 * These are the "who's allowed to do what" types.
 */

// --- Guardrails (content-level checks) --------------------------------------

/** A rule that inspects message content at send- or receive-time. */
export interface GuardrailRule {
  id: string;
  name: string;
  description: string | null;
  type:
    | "content_filter"
    | "pii_detection"
    | "injection_detection"
    | "length_limit"
    | "custom_regex";
  pattern: string;
  action: "block" | "warn" | "redact" | "log";
  scope: "global" | "agent" | "conversation";
  agent_id: string | null;
  is_active: boolean;
  trigger_count: number;
  last_triggered_at: string | null;
  created_at: string;
}

// --- Policies (action-level checks) -----------------------------------------

/** A rule that gates the actions an agent is allowed to take at runtime. */
export interface PolicyRule {
  id: string;
  name: string;
  description: string | null;
  type: string;
  rule_json: string;          // JSON string — type-specific rule body
  severity: "block" | "warn" | "log";
  scope: "global" | "agent";
  agent_id: string | null;
  is_active: boolean;
  violation_count: number;
  created_at: string;
}

// --- Users & RBAC -----------------------------------------------------------

export interface UserAccount {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  role: "admin" | "operator" | "viewer";
  last_login_at: string | null;
  created_at: string;
}

// --- Audit log --------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  actor_type: string;
  actor_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details_json: string;
  created_at: string;
}

// --- Conversation-level permissions ----------------------------------------

export type PermissionLevel = "viewer" | "editor" | "admin";

export interface ConversationPermission {
  conversation_id: string;
  user_id: string;
  permission: PermissionLevel;
  created_at: string;
}

/** Permission row joined with the user's profile, for display in the UI. */
export interface ConversationPermissionWithUser extends ConversationPermission {
  display_name: string;
  email: string | null;
  avatar_url: string | null;
}

// --- A2A (agent-to-agent discovery) ----------------------------------------

/** A public "card" describing an agent's capabilities for other systems. */
export interface A2AAgentCard {
  id: string;
  agent_id: string;
  card_json: string;
  endpoint_url: string | null;
  is_published: boolean;
  created_at: string;
}

// --- Agent versions (canary deploys) ----------------------------------------

export interface AgentVersion {
  id: string;
  agent_id: string;
  version: string;
  prompt_hash: string | null;
  config_hash: string | null;
  traffic_pct: number;
  is_active: boolean;
  metrics_json: string;
  created_at: string;
}
