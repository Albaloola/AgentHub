/**
 * Observability types — execution traces, performance snapshots, anomaly
 * events, feedback insights, routing decisions, and topic clustering.
 *
 * These are all "things we record to understand what happened" after an
 * agent interaction completes.
 */

// --- Traces -----------------------------------------------------------------

/** A waterfall of spans covering one message's end-to-end execution. */
export interface Trace {
  id: string;
  conversation_id: string;
  message_id: string | null;
  agent_id: string | null;
  spans_json: string;         // JSON-serialised TraceSpan[]
  total_duration_ms: number;
  total_tokens: number;
  total_cost: number;
  status: string;
  created_at: string;
}

/** One span in a Trace — a single step in request processing. */
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

// --- Performance snapshots --------------------------------------------------

/** One per-request record used to compute latency trends & error rates. */
export interface PerformanceSnapshot {
  id: string;
  agent_id: string;
  latency_ms: number | null;
  token_count: number | null;
  error_occurred: boolean;
  recorded_at: string;
}

// --- Routing log ------------------------------------------------------------

/** Why the router picked the agent it picked, for auditability. */
export interface RoutingLogEntry {
  id: string;
  conversation_id: string | null;
  message_id: string | null;
  candidate_scores: string;   // JSON string — Record<agent_id, score>
  selected_agent_id: string | null;
  routing_reason: string | null;
  created_at: string;
}

// --- Anomalies --------------------------------------------------------------

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

// --- Learning from feedback -------------------------------------------------

/** Aggregated upvote/downvote signal per agent+topic. */
export interface FeedbackInsight {
  id: string;
  agent_id: string;
  topic: string | null;
  positive_count: number;
  negative_count: number;
  sample_messages: string;    // JSON string — string[]
  insight: string | null;
  created_at: string;
}

// --- Topic clustering -------------------------------------------------------

export interface TopicCluster {
  id: string;
  name: string;
  keywords: string;           // JSON string — string[]
  conversation_count: number;
  color: string;
  created_at: string;
}
