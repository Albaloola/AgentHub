/**
 * Core domain types — the central nouns the app talks about.
 *
 * An `Agent` is a connection to an external gateway.
 * A `Conversation` is a thread of `Message`s, optionally with many `Agent`s.
 * `ToolCall`s are attached to messages when an agent used a tool to answer.
 *
 * Fields named `*_at` are ISO timestamps. Fields named `is_*` are booleans,
 * though SQLite stores them as 0/1 — see `backend/db/connection.ts :: toBooleans`
 * for the row-level converter.
 */

// --- Agents -----------------------------------------------------------------

/** A connection to an external agent gateway (Hermes, OpenClaw, etc.). */
export interface Agent {
  id: string;
  name: string;
  avatar_url: string | null;
  gateway_type: string;
  connection_url: string;
  connection_config: string;  // JSON string — see adapters for shape per gateway
  is_active: boolean;
  is_available: boolean;
  last_seen: string | null;
  avg_response_time_ms: number;
  total_messages: number;
  total_tokens: number;
  error_count: number;
  capability_weights: string; // JSON string — Record<string, number>
  cost_per_token: number;
  cost_per_request: number;
  fallback_chain: string;     // JSON string — string[] of agent IDs
  timeout_multiplier: number;
  adaptive_timeout_enabled: boolean;
  behavior_modes: string;     // JSON string — Record<BehaviorMode, PromptOverrides>
  health_score: number;
  created_at: string;
}

/** Agent decorated with live status from a health check. */
export interface AgentWithStatus extends Agent {
  status: "online" | "offline" | "busy" | "error";
  latency_ms?: number;
}

/** Gateway type is a string — the adapter registry defines what's valid. */
export type GatewayType = string;

export const GATEWAY_LABELS: Record<string, string> = {
  hermes: "Hermes",
  openclaw: "OpenClaw",
  "openai-compat": "OpenAI Compatible",
  websocket: "WebSocket",
  mock: "Mock",
};

// --- Conversations ----------------------------------------------------------

/** A single- or multi-agent thread. */
export interface Conversation {
  id: string;
  type: "single" | "group";
  name: string;
  agent_id: string | null;    // null for group conversations
  is_pinned: boolean;
  template_id: string | null;
  parent_conversation_id: string | null;
  summary: string | null;
  max_responses_per_turn: number;
  stop_on_completion: boolean;
  estimated_token_count: number;
  auto_compact_enabled: boolean;
  compact_threshold: number;
  is_autonomous: boolean;
  total_cost: number;
  behavior_mode: string;
  folder_id: string | null;
  ghost_user_ids: string;     // JSON string — string[]
  created_at: string;
  updated_at: string;
}

/** Join row between a conversation and its participating agents. */
export interface ConversationAgent {
  conversation_id: string;
  agent_id: string;
  response_mode: "discussion" | "parallel" | "targeted";
  agent_role: "leader" | "reviewer" | "executor" | "observer" | "contributor";
  created_at: string;
}

/** Conversation hydrated with its agents, tags, and last message for listing. */
export interface ConversationWithDetails extends Conversation {
  agents: Agent[];
  tags: Tag[];
  last_message?: Message;
  message_count: number;
  branch_count?: number;
}

// --- Messages & tool calls --------------------------------------------------

export interface Message {
  id: string;
  conversation_id: string;
  sender_agent_id: string | null;   // null = user
  content: string;
  thinking_content: string;          // agent's extended-thinking stream
  token_count: number;
  parent_message_id: string | null;
  branch_point: string | null;
  is_pinned: boolean;
  is_summary: boolean;
  is_handoff: boolean;
  handoff_from_agent_id: string | null;
  handoff_to_agent_id: string | null;
  handoff_context: string | null;
  is_edited: boolean;
  created_at: string;
}

export interface ToolCall {
  id: string;
  message_id: string;
  agent_id: string;
  tool_name: string;
  input: string;   // JSON string
  output: string;  // JSON string
  status: "pending" | "success" | "error";
  timestamp: string;
}

/** Message joined with its tool calls, sender, and vote totals. */
export interface MessageWithToolCalls extends Message {
  tool_calls: ToolCall[];
  agent?: Agent;
  votes?: { up: number; down: number };
}

// --- Tags -------------------------------------------------------------------

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}
