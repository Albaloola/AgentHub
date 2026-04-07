// === Database Models ===

export interface Agent {
  id: string;
  name: string;
  avatar_url: string | null;
  gateway_type: string;
  connection_url: string;
  connection_config: string;
  is_active: boolean;
  is_available: boolean;
  last_seen: string | null;
  avg_response_time_ms: number;
  total_messages: number;
  total_tokens: number;
  error_count: number;
  capability_weights: string;
  cost_per_token: number;
  cost_per_request: number;
  fallback_chain: string;
  timeout_multiplier: number;
  adaptive_timeout_enabled: boolean;
  behavior_modes: string;
  health_score: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  type: "single" | "group";
  name: string;
  agent_id: string | null;
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
  created_at: string;
  updated_at: string;
}

export interface ConversationAgent {
  conversation_id: string;
  agent_id: string;
  response_mode: "discussion" | "parallel" | "targeted";
  agent_role: "leader" | "reviewer" | "executor" | "observer" | "contributor";
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_agent_id: string | null;
  content: string;
  thinking_content: string;
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
  input: string;
  output: string;
  status: "pending" | "success" | "error";
  timestamp: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  response_mode: "discussion" | "parallel" | "targeted";
  system_prompt: string | null;
  max_responses_per_turn: number;
  stop_on_completion: boolean;
  created_at: string;
}

export interface TemplateAgent {
  template_id: string;
  agent_id: string;
  agent_role: "leader" | "reviewer" | "executor" | "observer" | "contributor";
}

export interface ResponseVote {
  id: string;
  message_id: string;
  vote_type: "up" | "down";
  created_at: string;
}

export interface Whiteboard {
  id: string;
  conversation_id: string;
  content: string;
  updated_at: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  nodes: string;
  edges: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: "running" | "completed" | "failed" | "cancelled";
  current_node: string | null;
  result: string | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

// === Adapter Protocol ===

export interface AgentMessage {
  conversation_id: string;
  content: string;
  history: {
    role: "user" | "assistant";
    content: string;
    agent_id?: string;
  }[];
  metadata?: {
    group_mode?: boolean;
    other_agents?: string[];
  };
}

export interface AgentResponseChunk {
  type: "content" | "tool_call" | "tool_result" | "error" | "done" | "thinking" | "thinking_chunk" | "thinking_end" | "subagent_spawned" | "subagent_progress" | "subagent_completed" | "subagent_failed" | "agent_start" | "handoff";
  content?: string;
  tool_call_id?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: Record<string, unknown>;
  error?: string;
  agent_id?: string;
  agent_name?: string;
  message_id?: string;
  thinking?: string;
  subagent_id?: string;
  subagent_goal?: string;
  subagent_result?: string;
  subagent_error?: string;
  token_count?: number;
}

export interface HealthCheckResponse {
  status: "ok" | "error";
  agent_name: string;
  latency_ms?: number;
}

// === UI Types ===

export interface AgentWithStatus extends Agent {
  status: "online" | "offline" | "busy" | "error";
  latency_ms?: number;
}

export interface MessageWithToolCalls extends Message {
  tool_calls: ToolCall[];
  agent?: Agent;
  votes?: { up: number; down: number };
}

export interface ConversationWithDetails extends Conversation {
  agents: Agent[];
  tags: Tag[];
  last_message?: Message;
  message_count: number;
  branch_count?: number;
}

export interface ThinkingContent {
  id: string;
  message_id: string;
  content: string;
  is_complete: boolean;
}

export interface Subagent {
  id: string;
  parent_agent_id: string;
  goal: string;
  status: "running" | "completed" | "failed";
  result?: string;
  error?: string;
  spawned_at: string;
  completed_at?: string;
}

export interface Attachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  created_at: string;
}

// Workflow node/edge types for the pipeline builder
export interface WorkflowNode {
  id: string;
  type: "agent" | "condition" | "delay" | "output";
  agent_id?: string;
  label: string;
  position: { x: number; y: number };
  data?: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

// === v3 Types ===

export interface Checkpoint {
  id: string;
  conversation_id: string;
  name: string | null;
  description: string | null;
  snapshot_json: string;
  message_count: number;
  created_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key_hash: string;
  permissions: string;
  rate_limit_rpm: number;
  last_used_at: string | null;
  created_at: string;
}

export interface Webhook {
  id: string;
  name: string;
  secret: string;
  agent_id: string;
  system_prompt: string | null;
  body_transform: string | null;
  rate_limit_per_min: number;
  is_active: boolean;
  total_triggers: number;
  last_triggered_at: string | null;
  created_at: string;
}

export interface WebhookEvent {
  id: string;
  webhook_id: string;
  payload: string | null;
  response_message_id: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

export interface RoutingLogEntry {
  id: string;
  conversation_id: string | null;
  message_id: string | null;
  candidate_scores: string;
  selected_agent_id: string | null;
  routing_reason: string | null;
  created_at: string;
}

export interface ArenaRound {
  id: string;
  prompt: string;
  category: string | null;
  agents: string;
  results: string;
  winner_agent_id: string | null;
  status: string;
  created_at: string;
}

export interface SharedMemoryEntry {
  id: string;
  key: string;
  value: string;
  category: string;
  source_agent_id: string | null;
  confidence: number;
  access_count: number;
  last_accessed: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ScheduledTask {
  id: string;
  name: string;
  agent_id: string;
  prompt: string;
  cron_expression: string | null;
  conversation_id: string | null;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  last_status: string | null;
  last_error: string | null;
  created_at: string;
}

export interface NotificationRule {
  id: string;
  event_type: string;
  channel: string;
  config: string;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  source_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PerformanceSnapshot {
  id: string;
  agent_id: string;
  latency_ms: number | null;
  token_count: number | null;
  error_occurred: boolean;
  recorded_at: string;
}

export type BehaviorMode = "default" | "debug" | "creative" | "concise" | "teaching" | "production";

export const BEHAVIOR_MODES: { value: BehaviorMode; label: string; description: string }[] = [
  { value: "default", label: "Default", description: "Standard agent behavior" },
  { value: "debug", label: "Debug", description: "Verbose, step-by-step reasoning" },
  { value: "creative", label: "Creative", description: "Exploratory, novel solutions" },
  { value: "concise", label: "Concise", description: "Short answers, just the facts" },
  { value: "teaching", label: "Teaching", description: "Explains why, asks clarifying questions" },
  { value: "production", label: "Production", description: "Strict, safety-focused" },
];

// === Phase 2 Types ===

export interface ConversationFolder {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  color: string;
  icon: string;
  created_at: string;
}

export interface GuardrailRule {
  id: string;
  name: string;
  description: string | null;
  type: "content_filter" | "pii_detection" | "injection_detection" | "length_limit" | "custom_regex";
  pattern: string;
  action: "block" | "warn" | "redact" | "log";
  scope: "global" | "agent" | "conversation";
  agent_id: string | null;
  is_active: boolean;
  trigger_count: number;
  last_triggered_at: string | null;
  created_at: string;
}

export interface Trace {
  id: string;
  conversation_id: string;
  message_id: string | null;
  agent_id: string | null;
  spans_json: string;
  total_duration_ms: number;
  total_tokens: number;
  total_cost: number;
  status: string;
  created_at: string;
}

export interface TraceSpan {
  id: string;
  name: string;
  type: "routing" | "adapter" | "tool_call" | "subagent" | "response" | "guardrail";
  start_ms: number;
  duration_ms: number;
  status: "ok" | "error";
  input?: string;
  output?: string;
  metadata?: Record<string, unknown>;
}

export interface PromptVersion {
  id: string;
  agent_id: string;
  name: string;
  version: number;
  content: string;
  variables: string;
  model_params: string;
  is_active: boolean;
  environment: "dev" | "staging" | "production";
  created_at: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  document_count: number;
  total_chunks: number;
  created_at: string;
}

export interface KBDocument {
  id: string;
  knowledge_base_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  chunk_count: number;
  content_preview: string | null;
  file_path: string | null;
  created_at: string;
}

// === Phase 3-8 Types ===

export interface Persona {
  id: string;
  name: string;
  category: string;
  description: string | null;
  system_prompt: string;
  behavior_mode: string;
  capability_weights: string;
  icon: string;
  is_builtin: boolean;
  usage_count: number;
  created_at: string;
}

export interface UserAccount {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  role: "admin" | "operator" | "viewer";
  last_login_at: string | null;
  created_at: string;
}

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

export interface MessageThread {
  id: string;
  parent_message_id: string;
  conversation_id: string;
  reply_count: number;
  last_reply_at: string | null;
  created_at: string;
}

export interface Integration {
  id: string;
  type: string;
  name: string;
  config: string;
  agent_id: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  event_count: number;
  created_at: string;
}

export interface TopicCluster {
  id: string;
  name: string;
  keywords: string;
  conversation_count: number;
  color: string;
  created_at: string;
}

export interface FeedbackInsight {
  id: string;
  agent_id: string;
  topic: string | null;
  positive_count: number;
  negative_count: number;
  sample_messages: string;
  insight: string | null;
  created_at: string;
}

export interface AnomalyEvent {
  id: string;
  agent_id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  metric_name: string | null;
  expected_value: number | null;
  actual_value: number | null;
  description: string | null;
  is_resolved: boolean;
  created_at: string;
}

export interface ThemePreference {
  id: string;
  theme: string;
  accent_color: string;
  font_family: string;
  density: "compact" | "comfortable" | "spacious";
  border_radius: string;
  custom_css: string;
  created_at: string;
}

export interface OnboardingState {
  id: string;
  completed_steps: string;
  is_complete: boolean;
  current_step: number;
  created_at: string;
}

export interface A2AAgentCard {
  id: string;
  agent_id: string;
  card_json: string;
  endpoint_url: string | null;
  is_published: boolean;
  created_at: string;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string | null;
  type: string;
  rule_json: string;
  severity: "block" | "warn" | "log";
  scope: "global" | "agent";
  agent_id: string | null;
  is_active: boolean;
  violation_count: number;
  created_at: string;
}

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

export const PERSONA_CATEGORIES = [
  "general", "engineering", "devops", "research", "creative", "qa", "security", "data", "management",
];

export const INTEGRATION_TYPES = [
  { value: "github", label: "GitHub", icon: "github" },
  { value: "gitlab", label: "GitLab", icon: "gitlab" },
  { value: "jira", label: "Jira", icon: "ticket" },
  { value: "slack", label: "Slack", icon: "message-square" },
  { value: "discord", label: "Discord", icon: "message-circle" },
  { value: "telegram", label: "Telegram", icon: "send" },
  { value: "email", label: "Email", icon: "mail" },
  { value: "custom", label: "Custom", icon: "plug" },
];

// GatewayType is now just string — adapter registry defines valid types
export type GatewayType = string;

export const GATEWAY_LABELS: Record<string, string> = {
  hermes: "Hermes",
  openclaw: "OpenClaw",
  websocket: "WebSocket",
  mock: "Mock",
};
