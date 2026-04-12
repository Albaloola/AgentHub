/**
 * The contract every gateway adapter implements.
 *
 * Adapters live in `backend/adapters/`. The `sendMessage` method returns an
 * async generator of chunks — this is how AgentHub streams tokens to the UI
 * over SSE without buffering the whole response.
 */

/** A single user-or-agent message sent INTO an adapter. */
export interface AgentMessage {
  conversation_id: string;
  content: string;
  /** Prior messages in the conversation, flattened for adapters that need them. */
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

/**
 * A single chunk emitted FROM an adapter's `sendMessage` generator.
 * The chat route relays these to the browser as SSE `data:` events.
 */
export interface AgentResponseChunk {
  type:
    | "content"           // assistant token(s)
    | "tool_call"         // agent invoked a tool
    | "tool_result"       // tool returned a result
    | "error"
    | "done"              // stream finished cleanly
    | "thinking"          // extended-thinking full block
    | "thinking_chunk"    // extended-thinking streaming chunk
    | "thinking_end"
    | "subagent_spawned"
    | "subagent_progress"
    | "subagent_completed"
    | "subagent_failed"
    | "agent_start"
    | "handoff";          // agent-to-agent transfer
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
