/**
 * Knowledge types — knowledge bases (RAG), shared memory across agents,
 * personas, and prompt version history.
 */

// --- Knowledge bases --------------------------------------------------------

/** A collection of documents that can be attached to an agent for RAG. */
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  document_count: number;
  total_chunks: number;
  created_at: string;
}

/** A single uploaded file inside a knowledge base. */
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

// --- Shared memory ----------------------------------------------------------

/** A long-lived key/value fact shared across agents. */
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

// --- Personas ---------------------------------------------------------------

/** A reusable system-prompt + behaviour bundle that can be applied to agents. */
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

export const PERSONA_CATEGORIES = [
  "general",
  "engineering",
  "devops",
  "research",
  "creative",
  "qa",
  "security",
  "data",
  "management",
];

// --- Prompt version history ------------------------------------------------

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
