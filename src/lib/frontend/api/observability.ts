/**
 * Observability — traces, anomalies, feedback insights, topic clusters,
 * response cache inspection.
 *
 * All read-only-ish: the UI uses these to *show* what happened.
 */

"use client";

import { fetchJSON } from "./client";
import type {
  Trace,
  AnomalyEvent,
  FeedbackInsight,
  TopicCluster,
  ArenaRound,
} from "@/lib/shared/types";

// --- Traces ----------------------------------------------------------------

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

// --- Anomalies ------------------------------------------------------------

export function getAnomalies(agentId?: string, resolved?: boolean): Promise<AnomalyEvent[]> {
  const p = new URLSearchParams();
  if (agentId) p.set("agent_id", agentId);
  if (resolved !== undefined) p.set("resolved", resolved.toString());
  const q = p.toString();
  return fetchJSON(`/api/anomalies${q ? `?${q}` : ""}`);
}

export function resolveAnomaly(id: string): Promise<unknown> {
  return fetchJSON(`/api/anomalies/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_resolved: true }),
  });
}

// --- Topics & feedback ----------------------------------------------------

export function getTopicClusters(): Promise<TopicCluster[]> {
  return fetchJSON("/api/topics");
}

export function getConversationTopics(convId: string): Promise<{ topic_id: string; name: string; confidence: number }[]> {
  return fetchJSON(`/api/conversations/${convId}/topics`);
}

export function getFeedbackInsights(agentId?: string): Promise<FeedbackInsight[]> {
  return fetchJSON(`/api/feedback${agentId ? `?agent_id=${agentId}` : ""}`);
}

// --- Response cache -------------------------------------------------------

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

// --- Arena (head-to-head evaluation) --------------------------------------

export function getArenaRounds(): Promise<ArenaRound[]> {
  return fetchJSON("/api/arena");
}

export function createArenaRound(prompt: string, agentIds: string[], category?: string): Promise<{ id: string }> {
  return fetchJSON("/api/arena", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, agent_ids: agentIds, category }),
  });
}

export function voteArenaRound(id: string, winnerAgentId: string): Promise<unknown> {
  return fetchJSON(`/api/arena/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ winner_agent_id: winnerAgentId }),
  });
}

export function deleteArenaRound(id: string): Promise<unknown> {
  return fetchJSON(`/api/arena/${id}`, { method: "DELETE" });
}

export function getArenaLeaderboard(): Promise<
  { agent_id: string; agent_name: string; wins: number; total_rounds: number; win_rate: number }[]
> {
  return fetchJSON("/api/arena/leaderboard");
}
