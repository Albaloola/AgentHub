/**
 * Chat-specific types — everything that lives inside a conversation but
 * isn't a message itself (templates, threads, votes, checkpoints, etc.).
 */

// --- Templates --------------------------------------------------------------

/** A pre-baked conversation shape that users can spawn new chats from. */
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

// --- Voting & pinning -------------------------------------------------------

export interface ResponseVote {
  id: string;
  message_id: string;
  vote_type: "up" | "down";
  created_at: string;
}

// --- Whiteboard -------------------------------------------------------------

/** A free-form text pad attached to a conversation. */
export interface Whiteboard {
  id: string;
  conversation_id: string;
  content: string;
  updated_at: string;
}

// --- Threading --------------------------------------------------------------

/** A side-thread anchored to a parent message. */
export interface MessageThread {
  id: string;
  parent_message_id: string;
  conversation_id: string;
  reply_count: number;
  last_reply_at: string | null;
  created_at: string;
}

// --- Checkpoints & replay ---------------------------------------------------

/** A save point in a conversation that can be reverted to or forked from. */
export interface Checkpoint {
  id: string;
  conversation_id: string;
  name: string | null;
  description: string | null;
  snapshot_json: string;
  message_count: number;
  created_at: string;
}

/** One frame in the time-travel replay view for a conversation. */
export interface ReplaySnapshot {
  id: string;
  conversation_id: string;
  message_index: number;
  timestamp_ms: number;
  snapshot_data: string; // JSON string of ReplaySnapshotData
  created_at: string;
}

export interface ReplaySnapshotData {
  event:
    | "message_added"
    | "message_edited"
    | "message_deleted"
    | "tool_call"
    | "agent_start"
    | "handoff"
    | "checkpoint";
  message_id?: string;
  agent_id?: string;
  agent_name?: string;
  content_preview?: string;
  token_count?: number;
  response_time_ms?: number;
  model?: string;
  metadata?: Record<string, unknown>;
}

// --- Thinking & subagents ---------------------------------------------------

/** Buffered extended-thinking content for one in-flight message. */
export interface ThinkingContent {
  id: string;
  message_id: string;
  content: string;
  is_complete: boolean;
}

/** A background task spawned by an agent. */
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

// --- Attachments ------------------------------------------------------------

export interface Attachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  created_at: string;
}

// --- Folders ----------------------------------------------------------------

/** Optional hierarchy for organising conversations in the sidebar. */
export interface ConversationFolder {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  color: string;
  icon: string;
  created_at: string;
}

// --- Behaviour modes --------------------------------------------------------

export type BehaviorMode =
  | "default"
  | "debug"
  | "creative"
  | "concise"
  | "teaching"
  | "production";

export const BEHAVIOR_MODES: { value: BehaviorMode; label: string; description: string }[] = [
  { value: "default", label: "Default", description: "Standard agent behavior" },
  { value: "debug", label: "Debug", description: "Verbose, step-by-step reasoning" },
  { value: "creative", label: "Creative", description: "Exploratory, novel solutions" },
  { value: "concise", label: "Concise", description: "Short answers, just the facts" },
  { value: "teaching", label: "Teaching", description: "Explains why, asks clarifying questions" },
  { value: "production", label: "Production", description: "Strict, safety-focused" },
];
