/**
 * Everything the UI can do to an agent — CRUD, health, availability, behaviour
 * mode, routing, performance, fallback, canary versions, persona application.
 */

"use client";

import { fetchJSON } from "./client";
import type {
  Agent,
  AgentWithStatus,
  GatewayType,
  BehaviorMode,
  AgentVersion,
} from "@/lib/shared/types";

// --- CRUD ------------------------------------------------------------------

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

// --- Health & availability -------------------------------------------------

export function checkAgentHealth(id: string): Promise<{ status: string; latency_ms: number }> {
  return fetchJSON(`/api/agents/${id}/health`);
}

export function toggleAgentAvailability(id: string): Promise<{ is_available: boolean }> {
  return fetchJSON(`/api/agents/${id}/availability`, { method: "POST" });
}

// --- Behaviour & routing ---------------------------------------------------

export function setAgentBehaviorMode(agentId: string, mode: BehaviorMode): Promise<unknown> {
  return fetchJSON(`/api/agents/${agentId}/behavior`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
}

export function routeMessage(agentId: string, content: string): Promise<{ score: number; matching_capabilities: string[] }> {
  return fetchJSON(`/api/agents/${agentId}/routing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export function updateCapabilityWeights(agentId: string, weights: Record<string, number>): Promise<unknown> {
  return fetchJSON(`/api/agents/${agentId}/routing`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ capability_weights: weights }),
  });
}

// --- Performance trends ----------------------------------------------------

export function getAgentPerformance(agentId: string): Promise<{
  snapshots: { latency_ms: number; token_count: number; error_occurred: boolean; recorded_at: string }[];
  stats: { avg_latency_7d: number; avg_latency_1d: number; error_rate_7d: number; trend: string };
}> {
  return fetchJSON(`/api/agents/${agentId}/performance`);
}

// --- Fallback chain --------------------------------------------------------

export function updateFallbackChain(agentId: string, chain: string[]): Promise<unknown> {
  return fetchJSON(`/api/agents/${agentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fallback_chain: JSON.stringify(chain) }),
  });
}

// --- Persona application ---------------------------------------------------

export function applyPersona(agentId: string, personaId: string): Promise<unknown> {
  return fetchJSON(`/api/agents/${agentId}/persona`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona_id: personaId }),
  });
}

// --- Canary version management --------------------------------------------

export function getAgentVersions(agentId: string): Promise<AgentVersion[]> {
  return fetchJSON(`/api/agents/${agentId}/versions`);
}

export function createAgentVersion(agentId: string, version: string, trafficPct?: number): Promise<{ id: string }> {
  return fetchJSON(`/api/agents/${agentId}/versions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version, traffic_pct: trafficPct }),
  });
}

export function updateAgentVersionTraffic(agentId: string, versionId: string, trafficPct: number): Promise<unknown> {
  return fetchJSON(`/api/agents/${agentId}/versions/${versionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ traffic_pct: trafficPct }),
  });
}

// --- Analytics (convenience) ----------------------------------------------

export function getAnalytics(): Promise<{
  totalTokens: number;
  totalMessages: number;
  avgResponseTime: number;
  agentStats: { agent_id: string; agent_name: string; messages: number; tokens: number; avg_time: number; errors: number }[];
}> {
  return fetchJSON("/api/agents?analytics=true");
}
