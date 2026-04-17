/**
 * Adapter metadata + capability discovery.
 *
 * These are read-only endpoints the UI calls on mount to learn
 *  • what adapter types the server registered, and their config-field shape
 *  • what each running agent can do (streaming / tool calls / subagents / etc.)
 */

"use client";

import { fetchJSON } from "./client";
import type { AgentCapabilitiesByChannel } from "@/lib/shared/types";

// --- Adapter registry metadata ---------------------------------------------

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

// --- Per-agent capabilities ------------------------------------------------

export type AgentCapabilities = AgentCapabilitiesByChannel;

export function getCapabilities(channelId?: string, agentId?: string): Promise<AgentCapabilities[]> {
  const params = new URLSearchParams();
  if (channelId) params.set("channel_id", channelId);
  if (agentId) params.set("agent_id", agentId);
  const qs = params.toString();
  return fetchJSON(`/api/capabilities${qs ? `?${qs}` : ""}`);
}
