import type { Agent, AgentMessage, AgentResponseChunk, HealthCheckResponse } from "../types";

// === Adapter Interface ===

export interface GatewayAdapter {
  /** Send a message and get a streaming response */
  sendMessage(
    agent: Agent,
    message: AgentMessage,
    signal?: AbortSignal,
  ): AsyncIterable<AgentResponseChunk>;

  /** Check if the agent gateway is healthy and responding */
  healthCheck(agent: Agent): Promise<HealthCheckResponse>;
}

// === Adapter Metadata ===

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
    thinking?: boolean;
    subagents?: boolean;
    fileUpload?: {
      enabled: boolean;
      acceptedTypes?: string[];
      maxSizeMB?: number;
      format?: "base64" | "path" | "url";
    };
    commands?: boolean;
  };
  commands?: {
    name: string;
    description: string;
    args?: string;
    requiresArgs?: boolean;
  }[];
  maxContextTokens?: number;
  contextReset?: boolean;
}

// === Adapter Registry ===

interface AdapterEntry {
  meta: AdapterMeta;
  factory: () => GatewayAdapter;
}

const registry = new Map<string, AdapterEntry>();

export function registerAdapter(
  meta: AdapterMeta,
  factory: () => GatewayAdapter,
): void {
  registry.set(meta.type, { meta, factory });
}

export function createAdapter(gatewayType: string): GatewayAdapter {
  const entry = registry.get(gatewayType);
  if (!entry) {
    throw new Error(
      `Unknown gateway type: "${gatewayType}". Registered: ${[...registry.keys()].join(", ")}`,
    );
  }
  return entry.factory();
}

export function getAdapterMeta(gatewayType: string): AdapterMeta | undefined {
  return registry.get(gatewayType)?.meta;
}

export function getAllAdapterMeta(): AdapterMeta[] {
  return [...registry.values()].map((e) => e.meta);
}

export function getRegisteredTypes(): string[] {
  return [...registry.keys()];
}
