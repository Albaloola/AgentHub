/**
 * Channel-specific capability types.
 *
 * The channel records themselves live in `core.ts` as `AgentChannel` because
 * they are now a first-class domain object alongside agents and conversations.
 */

import type { Agent, AgentChannel } from "./core";

export interface CapabilityCommand {
  name: string;
  description: string;
  args?: string;
  requiresArgs?: boolean;
}

export interface FileUploadCapability {
  enabled: boolean;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  format?: "base64" | "path" | "url";
}

export interface CapabilityFlags {
  streaming: boolean;
  toolCalls: boolean;
  healthCheck: boolean;
  thinking?: boolean;
  subagents?: boolean;
  fileUpload?: FileUploadCapability;
  commands?: boolean;
}

export interface ChannelCapabilitySnapshot {
  channel: AgentChannel;
  capabilities: CapabilityFlags;
  commands: CapabilityCommand[];
}

export interface AgentCapabilitiesByChannel {
  agent_id: string;
  agent_name: string;
  gateway_type: string;
  requested_channel_id?: string | null;
  is_supported_on_channel: boolean;
  channel?: AgentChannel | null;
  capabilities: CapabilityFlags;
  commands: CapabilityCommand[];
  maxContextTokens?: number;
  contextReset: boolean;
  fileUpload: FileUploadCapability;
  thinking: boolean;
  subagents: boolean;
  channels: ChannelCapabilitySnapshot[];
}

export interface AgentChannelWithAgent extends AgentChannel {
  agent?: Agent;
  conversation_count?: number;
  last_conversation_at?: string | null;
}
