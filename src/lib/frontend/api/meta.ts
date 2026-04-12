/**
 * Adapter metadata + capability discovery.
 *
 * These are read-only endpoints the UI calls on mount to learn
 *  • what adapter types the server registered, and their config-field shape
 *  • what each running agent can do (streaming / tool calls / subagents / etc.)
 */

"use client";

import { fetchJSON } from "./client";

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
