"use client";

import type {
  Agent,
  AgentWithStatus,
  ConversationWithDetails,
  MessageWithToolCalls,
  GatewayType,
  Checkpoint,
  Webhook,
  WebhookEvent,
  ArenaRound,
  SharedMemoryEntry,
  ScheduledTask,
  Notification,
  BehaviorMode,
  ConversationFolder,
  GuardrailRule,
  Trace,
  PromptVersion,
  KnowledgeBase,
  KBDocument,
  Persona,
  UserAccount,
  AuditLogEntry,
  Integration,
  TopicCluster,
  FeedbackInsight,
  AnomalyEvent,
  ThemePreference,
  OnboardingState,
  A2AAgentCard,
  PolicyRule,
  AgentVersion,
  ReplaySnapshot,
  ConversationPermissionWithUser,
  PermissionLevel,
} from "./types";

const BASE = "";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// === Adapters ===

export interface AdapterConfigField {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "password" | "url";
  required: boolean;
  placeholder?: string;
  description?: string;
  default?: string | number | boolean;
}

export interface AdapterMeta {
  type: string;
  displayName: string;
  description: string;
  defaultUrl: string;
  configFields: AdapterConfigField[];
  capabilities: {
    streaming: boolean;
    toolCalls: boolean;
    healthCheck: boolean;
  };
}

export function getAdapters(): Promise<AdapterMeta[]> {
  return fetchJSON("/api/adapters");
}

// === Capabilities ===

export interface AgentCapabilities {
  agent_id: string;
  agent_name: string;
  gateway_type: string;
  capabilities: {
    streaming: boolean;
    toolCalls: boolean;
    healthCheck: boolean;
    thinking?: boolean;
    subagents?: boolean;
    fileUpload?: { enabled: boolean; acceptedTypes?: string[]; maxSizeMB?: number; format?: string };
    commands?: boolean;
  };
  commands: { name: string; description: string; args?: string; requiresArgs?: boolean }[];
  maxContextTokens?: number;
  contextReset: boolean;
  fileUpload: { enabled: boolean; acceptedTypes?: string[]; maxSizeMB?: number; format?: string };
  thinking: boolean;
  subagents: boolean;
}

export function getCapabilities(): Promise<AgentCapabilities[]> {
  return fetchJSON("/api/capabilities");
}

export function resetConversation(id: string): Promise<{ message: string; agents: unknown[] }> {
  return fetchJSON(`/api/conversations/${id}/reset`, { method: "POST" });
}

export function uploadFile(file: File): Promise<{ id: string; file_name: string; file_type: string; file_size: number }> {
  const formData = new FormData();
  formData.append("file", file);
  return fetchJSON("/api/upload", { method: "POST", body: formData });
}

// === Agents ===

export function getAgents(): Promise<AgentWithStatus[]> {
  return fetchJSON("/api/agents");
}

export function createAgent(data: {
  name: string;
  gateway_type: GatewayType;
  connection_url: string;
  connection_config?: string;
  avatar_url?: string;
}): Promise<Agent> {
  return fetchJSON("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateAgent(
  id: string,
  data: Partial<{
    name: string;
    gateway_type: GatewayType;
    connection_url: string;
    connection_config: string;
    avatar_url: string;
    is_active: boolean;
  }>,
): Promise<Agent> {
  return fetchJSON(`/api/agents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteAgent(id: string): Promise<void> {
  return fetchJSON(`/api/agents/${id}`, { method: "DELETE" });
}

export function checkAgentHealth(id: string): Promise<{ status: string; latency_ms: number }> {
  return fetchJSON(`/api/agents/${id}/health`);
}

// === Conversations ===

export function getConversations(): Promise<ConversationWithDetails[]> {
  return fetchJSON("/api/conversations");
}

export function createConversation(data: {
  agent_id?: string;
  agent_ids?: string[];
  name?: string;
  type?: "single" | "group";
  response_mode?: string;
}): Promise<{ id: string }> {
  return fetchJSON("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteConversation(id: string): Promise<void> {
  return fetchJSON(`/api/conversations/${id}`, { method: "DELETE" });
}

// === Messages ===

export function getMessages(conversationId: string): Promise<MessageWithToolCalls[]> {
  return fetchJSON(`/api/messages?conversation_id=${conversationId}`);
}

// === Chat (SSE Streaming) ===

export interface ChatStreamCallbacks {
  onContent: (content: string) => void;
  onToolCall: (data: {
    tool_call_id: string;
    tool_name: string;
    tool_input: Record<string, unknown>;
  }) => void;
  onToolResult: (data: {
    tool_call_id: string;
    tool_name: string;
    tool_output: Record<string, unknown>;
  }) => void;
  onError: (error: string) => void;
  onDone: (data: { message_id: string; agent_id: string }) => void;
  onAgentStart?: (data: { agent_id: string; agent_name: string; message_id: string }) => void;
  onThinking?: (content: string) => void;
  onThinkingEnd?: () => void;
  onSubagentSpawned?: (data: { subagent_id: string; goal: string; agent_id?: string }) => void;
  onSubagentProgress?: (data: { subagent_id: string; agent_id?: string }) => void;
  onSubagentCompleted?: (data: { subagent_id: string; result: string }) => void;
  onSubagentFailed?: (data: { subagent_id: string; error: string }) => void;
  onHandoff?: (data: { from_agent_id: string; from_agent_name: string; to_agent_id: string; to_agent_name: string; context: string }) => void;
}

export function streamChat(
  conversationId: string,
  content: string,
  callbacks: ChatStreamCallbacks,
  options?: { target_agent_id?: string; signal?: AbortSignal },
): void {
  const body = JSON.stringify({
    conversation_id: conversationId,
    content,
    target_agent_id: options?.target_agent_id,
  });

  fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: options?.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        callbacks.onError(`${res.status}: ${text || res.statusText}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        callbacks.onError("No response body");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const event = JSON.parse(data) as {
              type: string;
              content?: string;
              tool_call_id?: string;
              tool_name?: string;
              tool_input?: Record<string, unknown>;
              tool_output?: Record<string, unknown>;
              error?: string;
              message_id?: string;
              agent_id?: string;
              agent_name?: string;
              thinking?: string;
              subagent_id?: string;
              subagent_goal?: string;
              subagent_result?: string;
              subagent_error?: string;
            };

            switch (event.type) {
              case "content":
                if (event.content) callbacks.onContent(event.content);
                break;
              case "tool_call":
                callbacks.onToolCall({
                  tool_call_id: event.tool_call_id ?? "",
                  tool_name: event.tool_name ?? "",
                  tool_input: event.tool_input ?? {},
                });
                break;
              case "tool_result":
                callbacks.onToolResult({
                  tool_call_id: event.tool_call_id ?? "",
                  tool_name: event.tool_name ?? "",
                  tool_output: event.tool_output ?? {},
                });
                break;
              case "error":
                callbacks.onError(event.error ?? "Unknown error");
                break;
              case "done":
                callbacks.onDone({
                  message_id: event.message_id ?? "",
                  agent_id: event.agent_id ?? "",
                });
                break;
              case "agent_start":
                callbacks.onAgentStart?.({
                  agent_id: event.agent_id ?? "",
                  agent_name: event.agent_name ?? "",
                  message_id: event.message_id ?? "",
                });
                break;
              case "thinking":
              case "thinking_chunk":
                if (event.thinking) callbacks.onThinking?.(event.thinking);
                break;
              case "thinking_end":
                callbacks.onThinkingEnd?.();
                break;
              case "subagent_spawned":
                callbacks.onSubagentSpawned?.({
                  subagent_id: event.subagent_id ?? "",
                  goal: event.subagent_goal ?? "",
                  agent_id: event.agent_id,
                });
                break;
              case "subagent_progress":
                callbacks.onSubagentProgress?.({
                  subagent_id: event.subagent_id ?? "",
                  agent_id: event.agent_id,
                });
                break;
              case "subagent_completed":
                callbacks.onSubagentCompleted?.({
                  subagent_id: event.subagent_id ?? "",
                  result: event.subagent_result ?? "",
                });
                break;
              case "subagent_failed":
                callbacks.onSubagentFailed?.({
                  subagent_id: event.subagent_id ?? "",
                  error: event.subagent_error ?? "",
                });
                break;
              case "handoff": {
                const hev = event as unknown as Record<string, string>;
                callbacks.onHandoff?.({
                  from_agent_id: hev.from_agent_id ?? "",
                  from_agent_name: hev.from_agent_name ?? "",
                  to_agent_id: hev.to_agent_id ?? "",
                  to_agent_name: hev.to_agent_name ?? "",
                  context: hev.context ?? "",
                });
                break;
              }
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    })
    .catch((err: Error) => {
      if (err.name !== "AbortError") {
        callbacks.onError(err.message);
      }
    });
}

// === Templates ===

export interface CreateTemplateBody {
  name: string;
  description?: string;
  response_mode?: string;
  system_prompt?: string;
  max_responses_per_turn?: number;
  stop_on_completion?: boolean;
  agent_ids?: string[];
  agent_roles?: string[];
}



export function getTemplates(): Promise<unknown[]> {
  return fetchJSON("/api/templates");
}

export function createTemplate(body: CreateTemplateBody): Promise<{ id: string }> {
  return fetchJSON("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export function deleteTemplate(id: string): Promise<unknown> {
  return fetchJSON(`/api/templates/${id}`, { method: "DELETE" });
}

// === Tags ===

export function getTags(): Promise<unknown[]> {
  return fetchJSON("/api/tags");
}

export function createTag(name: string, color: string): Promise<unknown> {
  return fetchJSON("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color }) });
}

export function addTagToConversation(convId: string, tagId: string): Promise<unknown> {
  return fetchJSON(`/api/conversations/${convId}/tags/${tagId}`, { method: "POST" });
}

export function removeTagFromConversation(convId: string, tagId: string): Promise<unknown> {
  return fetchJSON(`/api/conversations/${convId}/tags/${tagId}`, { method: "DELETE" });
}

// === Branching ===

export function branchConversation(id: string, branchAtMessageId?: string): Promise<{ id: string }> {
  return fetchJSON(`/api/conversations/${id}/branch`, {
    method: "POST",
    body: JSON.stringify({ branch_at_message_id: branchAtMessageId }),
  });
}

// === Export ===

export async function exportConversation(id: string, format: "markdown" | "json" | "html" = "markdown"): Promise<string> {
  const res = await fetch(`/api/conversations/${id}/export?format=${format}`);
  if (!res.ok) throw new Error("Export failed");
  return res.text();
}

// === Summarize ===

export function summarizeConversation(id: string): Promise<{ summary: string }> {
  return fetchJSON(`/api/conversations/${id}/summarize`, { method: "POST" });
}

// === Whiteboard ===

export function getWhiteboard(id: string): Promise<unknown> {
  return fetchJSON(`/api/conversations/${id}/whiteboard`);
}

export function saveWhiteboard(id: string, content: string): Promise<unknown> {
  return fetchJSON(`/api/conversations/${id}/whiteboard`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

// === Voting ===

export function voteMessage(messageId: string, voteType: "up" | "down"): Promise<{ up: number; down: number }> {
  return fetchJSON(`/api/messages/${messageId}/vote`, {
    method: "POST",
    body: JSON.stringify({ vote_type: voteType }),
  });
}

// === Availability ===

export function toggleAgentAvailability(id: string): Promise<{ is_available: boolean }> {
  return fetchJSON(`/api/agents/${id}/availability`, { method: "POST" });
}

// === Pinning ===

export function toggleConversationPin(id: string): Promise<unknown> {
  return fetchJSON(`/api/conversations/${id}`, { method: "PATCH", body: JSON.stringify({ action: "toggle_pin" }) });
}

// === Analytics ===

export function getAnalytics(): Promise<{
  totalTokens: number;
  totalMessages: number;
  avgResponseTime: number;
  agentStats: { agent_id: string; agent_name: string; messages: number; tokens: number; avg_time: number; errors: number }[];
}> {
  return fetchJSON("/api/agents?analytics=true");
}

// === Workflows ===

export function getWorkflows(): Promise<unknown[]> {
  return fetchJSON("/api/workflows");
}

export function createWorkflow(body: { name: string; description?: string; nodes?: unknown[]; edges?: unknown[] }): Promise<{ id: string }> {
  return fetchJSON("/api/workflows", { method: "POST", body: JSON.stringify(body) });
}

export function updateWorkflow(id: string, body: Partial<{ name: string; description: string; nodes: unknown[]; edges: unknown[]; is_active: boolean }>): Promise<unknown> {
  return fetchJSON(`/api/workflows/${id}`, { method: "POST", body: JSON.stringify(body) });
}

export function deleteWorkflow(id: string): Promise<unknown> {
  return fetchJSON(`/api/workflows/${id}`, { method: "DELETE" });
}

// === Checkpoints ===

export function getCheckpoints(conversationId: string): Promise<Checkpoint[]> {
  return fetchJSON(`/api/conversations/${conversationId}/checkpoints`);
}

export function createCheckpoint(conversationId: string, name?: string, description?: string): Promise<{ id: string }> {
  return fetchJSON(`/api/conversations/${conversationId}/checkpoints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
}

export function revertCheckpoint(conversationId: string, checkpointId: string): Promise<unknown> {
  return fetchJSON(`/api/conversations/${conversationId}/checkpoints/${checkpointId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "revert" }),
  });
}

export function forkCheckpoint(conversationId: string, checkpointId: string): Promise<{ id: string }> {
  return fetchJSON(`/api/conversations/${conversationId}/checkpoints/${checkpointId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "fork" }),
  });
}

export function deleteCheckpoint(conversationId: string, checkpointId: string): Promise<unknown> {
  return fetchJSON(`/api/conversations/${conversationId}/checkpoints/${checkpointId}`, { method: "DELETE" });
}

// === Replay ===

export function getReplaySnapshots(conversationId: string): Promise<ReplaySnapshot[]> {
  return fetchJSON(`/api/conversations/${conversationId}/replay`);
}

// === Smart Context ===

export function compactConversation(conversationId: string): Promise<{ summary: string; removed_count: number }> {
  return fetchJSON(`/api/conversations/${conversationId}/compact`, { method: "POST" });
}

export function pinMessage(messageId: string): Promise<{ is_pinned: boolean }> {
  return fetchJSON(`/api/messages/${messageId}/pin`, { method: "POST" });
}

// === Webhooks ===

export function getWebhooks(): Promise<(Webhook & { agent_name?: string })[]> {
  return fetchJSON("/api/webhooks");
}

export function createWebhook(body: { name: string; agent_id: string; system_prompt?: string; body_transform?: string; rate_limit_per_min?: number }): Promise<Webhook> {
  return fetchJSON("/api/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export function updateWebhook(id: string, body: Partial<{ name: string; agent_id: string; system_prompt: string; is_active: boolean }>): Promise<unknown> {
  return fetchJSON(`/api/webhooks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export function deleteWebhook(id: string): Promise<unknown> {
  return fetchJSON(`/api/webhooks/${id}`, { method: "DELETE" });
}

export function getWebhookEvents(id: string, limit?: number): Promise<WebhookEvent[]> {
  return fetchJSON(`/api/webhooks/${id}/events?limit=${limit || 20}`);
}

// === External API Keys ===

export function getApiKeys(): Promise<{ id: string; name: string; key_preview: string; permissions: string; rate_limit_rpm: number; last_used_at: string | null; created_at: string }[]> {
  return fetchJSON("/api/external/keys");
}

export function createApiKey(name: string, permissions?: string[]): Promise<{ id: string; raw_key: string }> {
  return fetchJSON("/api/external/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, permissions }) });
}

export function deleteApiKey(id: string): Promise<unknown> {
  return fetchJSON(`/api/external/keys/${id}`, { method: "DELETE" });
}

// === Arena ===

export function getArenaRounds(): Promise<ArenaRound[]> {
  return fetchJSON("/api/arena");
}

export function createArenaRound(prompt: string, agentIds: string[], category?: string): Promise<{ id: string }> {
  return fetchJSON("/api/arena", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, agent_ids: agentIds, category }) });
}

export function voteArenaRound(id: string, winnerAgentId: string): Promise<unknown> {
  return fetchJSON(`/api/arena/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ winner_agent_id: winnerAgentId }) });
}

export function deleteArenaRound(id: string): Promise<unknown> {
  return fetchJSON(`/api/arena/${id}`, { method: "DELETE" });
}

export function getArenaLeaderboard(): Promise<{ agent_id: string; agent_name: string; wins: number; total_rounds: number; win_rate: number }[]> {
  return fetchJSON("/api/arena/leaderboard");
}

// === Shared Memory ===

export function getSharedMemory(category?: string, search?: string): Promise<SharedMemoryEntry[]> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (search) params.set("search", search);
  const qs = params.toString();
  return fetchJSON(`/api/memory${qs ? `?${qs}` : ""}`);
}

export function createMemoryEntry(body: { key: string; value: string; category?: string; source_agent_id?: string; confidence?: number; expires_at?: string }): Promise<{ id: string }> {
  return fetchJSON("/api/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export function updateMemoryEntry(id: string, body: Partial<{ value: string; category: string; confidence: number; expires_at: string }>): Promise<unknown> {
  return fetchJSON(`/api/memory/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export function deleteMemoryEntry(id: string): Promise<unknown> {
  return fetchJSON(`/api/memory/${id}`, { method: "DELETE" });
}

// === Scheduled Tasks ===

export function getScheduledTasks(): Promise<(ScheduledTask & { agent_name?: string })[]> {
  return fetchJSON("/api/scheduled-tasks");
}

export function createScheduledTask(body: { name: string; agent_id: string; prompt: string; cron_expression?: string }): Promise<{ id: string }> {
  return fetchJSON("/api/scheduled-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export function updateScheduledTask(id: string, body: Partial<{ name: string; prompt: string; cron_expression: string; is_active: boolean }>): Promise<unknown> {
  return fetchJSON(`/api/scheduled-tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export function runScheduledTask(id: string): Promise<unknown> {
  return fetchJSON(`/api/scheduled-tasks/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "run" }) });
}

export function deleteScheduledTask(id: string): Promise<unknown> {
  return fetchJSON(`/api/scheduled-tasks/${id}`, { method: "DELETE" });
}

// === Notifications ===

export function getNotifications(unreadOnly?: boolean, limit?: number): Promise<Notification[]> {
  const params = new URLSearchParams();
  if (unreadOnly) params.set("unread", "true");
  if (limit) params.set("limit", limit.toString());
  const qs = params.toString();
  return fetchJSON(`/api/notifications${qs ? `?${qs}` : ""}`);
}

export function markNotificationRead(id: string): Promise<unknown> {
  return fetchJSON(`/api/notifications/${id}`, { method: "PATCH" });
}

export function markAllNotificationsRead(): Promise<unknown> {
  return fetchJSON("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_all_read" }) });
}

export function deleteNotification(id: string): Promise<unknown> {
  return fetchJSON(`/api/notifications/${id}`, { method: "DELETE" });
}

// === Agent Behavior ===

export function setAgentBehaviorMode(agentId: string, mode: BehaviorMode): Promise<unknown> {
  return fetchJSON(`/api/agents/${agentId}/behavior`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
}

// === Agent Routing ===

export function routeMessage(agentId: string, content: string): Promise<{ score: number; matching_capabilities: string[] }> {
  return fetchJSON(`/api/agents/${agentId}/routing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
}

export function updateCapabilityWeights(agentId: string, weights: Record<string, number>): Promise<unknown> {
  return fetchJSON(`/api/agents/${agentId}/routing`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ capability_weights: weights }) });
}

// === Performance ===

export function getAgentPerformance(agentId: string): Promise<{
  snapshots: { latency_ms: number; token_count: number; error_occurred: boolean; recorded_at: string }[];
  stats: { avg_latency_7d: number; avg_latency_1d: number; error_rate_7d: number; trend: string };
}> {
  return fetchJSON(`/api/agents/${agentId}/performance`);
}

// === Agent Fallback ===

export function updateFallbackChain(agentId: string, chain: string[]): Promise<unknown> {
  return fetchJSON(`/api/agents/${agentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fallback_chain: JSON.stringify(chain) }),
  });
}

// === Response Cache ===

export interface CacheStats {
  total_entries: number;
  total_hits: number;
  total_tokens: number;
  total_size_bytes: number;
  expired_count: number;
  hit_rate: number;
}

export interface CacheEntry {
  id: string;
  agent_id: string;
  agent_name: string | null;
  prompt_hash: string;
  token_count: number;
  hit_count: number;
  response_preview: string;
  created_at: string;
  expires_at: string | null;
}

export function getCacheStats(): Promise<{ stats: CacheStats; entries: CacheEntry[] }> {
  return fetchJSON("/api/cache");
}

export function clearCache(): Promise<{ message: string; deleted_count: number }> {
  return fetchJSON("/api/cache", { method: "DELETE" });
}

// === Message Editing ===

export function editMessage(id: string, content: string): Promise<unknown> {
  return fetchJSON(`/api/messages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
}

export function regenerateMessage(conversationId: string, afterMessageId: string, agentId?: string): Promise<unknown> {
  return fetchJSON("/api/chat/regenerate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversation_id: conversationId, after_message_id: afterMessageId, agent_id: agentId }) });
}

// === Folders ===

export function getFolders(): Promise<ConversationFolder[]> {
  return fetchJSON("/api/folders");
}

export function createFolder(name: string, parentId?: string, color?: string): Promise<{ id: string }> {
  return fetchJSON("/api/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, parent_id: parentId, color }) });
}

export function updateFolder(id: string, body: Partial<{ name: string; color: string; sort_order: number }>): Promise<unknown> {
  return fetchJSON(`/api/folders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export function deleteFolder(id: string): Promise<unknown> {
  return fetchJSON(`/api/folders/${id}`, { method: "DELETE" });
}

export function moveConversationToFolder(conversationId: string, folderId: string | null): Promise<unknown> {
  return fetchJSON(`/api/conversations/${conversationId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "move_to_folder", folder_id: folderId }) });
}

// === Guardrails ===

export function getGuardrails(): Promise<GuardrailRule[]> {
  return fetchJSON("/api/guardrails");
}

export function createGuardrail(body: { name: string; type: string; pattern: string; action: string; scope?: string; agent_id?: string; description?: string }): Promise<{ id: string }> {
  return fetchJSON("/api/guardrails", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export function updateGuardrail(id: string, body: Partial<{ name: string; pattern: string; action: string; is_active: boolean }>): Promise<unknown> {
  return fetchJSON(`/api/guardrails/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export function deleteGuardrail(id: string): Promise<unknown> {
  return fetchJSON(`/api/guardrails/${id}`, { method: "DELETE" });
}

// === Traces ===

export function getTraces(conversationId?: string, limit?: number): Promise<Trace[]> {
  const params = new URLSearchParams();
  if (conversationId) params.set("conversation_id", conversationId);
  if (limit) params.set("limit", limit.toString());
  const qs = params.toString();
  return fetchJSON(`/api/traces${qs ? `?${qs}` : ""}`);
}

export function getTrace(id: string): Promise<Trace> {
  return fetchJSON(`/api/traces/${id}`);
}

// === Prompt Versions ===

export function getPromptVersions(agentId?: string): Promise<PromptVersion[]> {
  const qs = agentId ? `?agent_id=${agentId}` : "";
  return fetchJSON(`/api/prompts${qs}`);
}

export function createPromptVersion(body: { agent_id: string; name?: string; content: string; variables?: string[]; model_params?: Record<string, unknown>; environment?: string }): Promise<{ id: string }> {
  return fetchJSON("/api/prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export function activatePromptVersion(id: string): Promise<unknown> {
  return fetchJSON(`/api/prompts/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "activate" }) });
}

export function deletePromptVersion(id: string): Promise<unknown> {
  return fetchJSON(`/api/prompts/${id}`, { method: "DELETE" });
}

export function testPrompt(agentId: string, content: string, promptContent: string): Promise<{ response: string }> {
  return fetchJSON("/api/prompts/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agent_id: agentId, content, prompt_content: promptContent }) });
}

// === Knowledge Bases ===

export function getKnowledgeBases(): Promise<KnowledgeBase[]> {
  return fetchJSON("/api/knowledge");
}

export function createKnowledgeBase(name: string, description?: string): Promise<{ id: string }> {
  return fetchJSON("/api/knowledge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) });
}

export function deleteKnowledgeBase(id: string): Promise<unknown> {
  return fetchJSON(`/api/knowledge/${id}`, { method: "DELETE" });
}

export function getDocuments(knowledgeBaseId: string): Promise<KBDocument[]> {
  return fetchJSON(`/api/knowledge/${knowledgeBaseId}/documents`);
}

export function uploadDocument(knowledgeBaseId: string, file: File): Promise<{ id: string; chunk_count: number }> {
  const formData = new FormData();
  formData.append("file", file);
  return fetchJSON(`/api/knowledge/${knowledgeBaseId}/documents`, { method: "POST", body: formData });
}

export function deleteDocument(knowledgeBaseId: string, documentId: string): Promise<unknown> {
  return fetchJSON(`/api/knowledge/${knowledgeBaseId}/documents/${documentId}`, { method: "DELETE" });
}

// === Phase 3: Personas ===
export function getPersonas(): Promise<Persona[]> { return fetchJSON("/api/personas"); }
export function createPersona(body: { name: string; category?: string; description?: string; system_prompt: string; behavior_mode?: string; capability_weights?: Record<string, number> }): Promise<{ id: string }> {
  return fetchJSON("/api/personas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
export function deletePersona(id: string): Promise<unknown> { return fetchJSON(`/api/personas/${id}`, { method: "DELETE" }); }
export function applyPersona(agentId: string, personaId: string): Promise<unknown> {
  return fetchJSON(`/api/agents/${agentId}/persona`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persona_id: personaId }) });
}

// === Phase 4: Users & RBAC ===
export function getUsers(): Promise<UserAccount[]> { return fetchJSON("/api/users"); }
export function createUser(body: { display_name: string; email?: string; role?: string }): Promise<{ id: string }> {
  return fetchJSON("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
export function updateUser(id: string, body: Partial<{ display_name: string; role: string }>): Promise<unknown> {
  return fetchJSON(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
export function deleteUser(id: string): Promise<unknown> { return fetchJSON(`/api/users/${id}`, { method: "DELETE" }); }

// === Phase 4: Audit Log ===
export function getAuditLog(limit?: number, actorId?: string): Promise<AuditLogEntry[]> {
  const p = new URLSearchParams();
  if (limit) p.set("limit", limit.toString());
  if (actorId) p.set("actor_id", actorId);
  const q = p.toString();
  return fetchJSON(`/api/audit${q ? `?${q}` : ""}`);
}

// === Phase 4: Threads ===
export function getThreadReplies(threadId: string): Promise<MessageWithToolCalls[]> {
  return fetchJSON(`/api/threads/${threadId}/replies`);
}
export function replyToThread(parentMessageId: string, content: string): Promise<{ id: string }> {
  return fetchJSON("/api/threads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parent_message_id: parentMessageId, content }) });
}

// === Phase 5: Integrations ===
export function getIntegrations(): Promise<Integration[]> { return fetchJSON("/api/integrations"); }
export function createIntegration(body: { type: string; name: string; config?: Record<string, unknown>; agent_id?: string }): Promise<{ id: string }> {
  return fetchJSON("/api/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
export function updateIntegration(id: string, body: Partial<{ name: string; config: Record<string, unknown>; is_active: boolean }>): Promise<unknown> {
  return fetchJSON(`/api/integrations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
export function deleteIntegration(id: string): Promise<unknown> { return fetchJSON(`/api/integrations/${id}`, { method: "DELETE" }); }

// === Phase 6: Topics ===
export function getTopicClusters(): Promise<TopicCluster[]> { return fetchJSON("/api/topics"); }
export function getConversationTopics(convId: string): Promise<{ topic_id: string; name: string; confidence: number }[]> {
  return fetchJSON(`/api/conversations/${convId}/topics`);
}

// === Phase 6: Feedback Insights ===
export function getFeedbackInsights(agentId?: string): Promise<FeedbackInsight[]> {
  return fetchJSON(`/api/feedback${agentId ? `?agent_id=${agentId}` : ""}`);
}

// === Phase 6: Anomalies ===
export function getAnomalies(agentId?: string, resolved?: boolean): Promise<AnomalyEvent[]> {
  const p = new URLSearchParams();
  if (agentId) p.set("agent_id", agentId);
  if (resolved !== undefined) p.set("resolved", resolved.toString());
  const q = p.toString();
  return fetchJSON(`/api/anomalies${q ? `?${q}` : ""}`);
}
export function resolveAnomaly(id: string): Promise<unknown> {
  return fetchJSON(`/api/anomalies/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_resolved: true }) });
}

// === Phase 7: Theme ===
export function getTheme(): Promise<ThemePreference> { return fetchJSON("/api/theme"); }
export function updateTheme(body: Partial<ThemePreference>): Promise<unknown> {
  return fetchJSON("/api/theme", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

// === Phase 7: Onboarding ===
export function getOnboarding(): Promise<OnboardingState> { return fetchJSON("/api/onboarding"); }
export function completeOnboardingStep(step: number): Promise<unknown> {
  return fetchJSON("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step }) });
}

// === Phase 8: A2A ===
export function getA2ACards(): Promise<(A2AAgentCard & { agent_name?: string })[]> { return fetchJSON("/api/a2a"); }
export function publishA2ACard(agentId: string, cardJson: Record<string, unknown>): Promise<{ id: string }> {
  return fetchJSON("/api/a2a", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agent_id: agentId, card_json: cardJson }) });
}
export function updateA2ACard(id: string, body: Partial<{ card_json: string; is_published: boolean }>): Promise<unknown> {
  return fetchJSON(`/api/a2a/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
export function deleteA2ACard(id: string): Promise<unknown> { return fetchJSON(`/api/a2a/${id}`, { method: "DELETE" }); }

// === Phase 8: Policies ===
export function getPolicies(): Promise<PolicyRule[]> { return fetchJSON("/api/policies"); }
export function createPolicy(body: { name: string; type: string; rule_json: Record<string, unknown>; severity?: string; scope?: string; agent_id?: string; description?: string }): Promise<{ id: string }> {
  return fetchJSON("/api/policies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
export function updatePolicy(id: string, body: Partial<{ name: string; rule_json: Record<string, unknown>; is_active: boolean }>): Promise<unknown> {
  return fetchJSON(`/api/policies/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
export function deletePolicy(id: string): Promise<unknown> { return fetchJSON(`/api/policies/${id}`, { method: "DELETE" }); }

// === Settings (key-value store) ===

export function getSettings(): Promise<Record<string, string>> {
  return fetchJSON("/api/settings");
}

export function updateSettings(settings: Record<string, string>): Promise<Record<string, string>> {
  return fetchJSON("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}

// === Phase 8: Agent Versions ===
export function getAgentVersions(agentId: string): Promise<AgentVersion[]> {
  return fetchJSON(`/api/agents/${agentId}/versions`);
}
export function createAgentVersion(agentId: string, version: string, trafficPct?: number): Promise<{ id: string }> {
  return fetchJSON(`/api/agents/${agentId}/versions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version, traffic_pct: trafficPct }) });
}
export function updateAgentVersionTraffic(agentId: string, versionId: string, trafficPct: number): Promise<unknown> {
  return fetchJSON(`/api/agents/${agentId}/versions/${versionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ traffic_pct: trafficPct }) });
}

// === Conversation Permissions / Sharing ===
export function getConversationPermissions(conversationId: string): Promise<ConversationPermissionWithUser[]> {
  return fetchJSON(`/api/conversations/${conversationId}/permissions`);
}
export function addConversationPermission(conversationId: string, userId: string, permission: PermissionLevel): Promise<ConversationPermissionWithUser> {
  return fetchJSON(`/api/conversations/${conversationId}/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, permission }),
  });
}
export function removeConversationPermission(conversationId: string, userId: string): Promise<unknown> {
  return fetchJSON(`/api/conversations/${conversationId}/permissions?user_id=${encodeURIComponent(userId)}`, { method: "DELETE" });
}
