/**
 * Agent channels — create and manage agent-owned conversation/task contexts.
 */

"use client";

import { fetchJSON } from "./client";
import type { AgentChannel, AgentChannelWithAgent } from "@/lib/shared/types";

export function getChannels(agentId?: string, includeArchived?: boolean): Promise<AgentChannelWithAgent[]> {
  const params = new URLSearchParams();
  if (agentId) params.set("agent_id", agentId);
  if (includeArchived) params.set("include_archived", "true");
  const qs = params.toString();
  return fetchJSON(`/api/channels${qs ? `?${qs}` : ""}`);
}

export function createChannel(body: {
  agent_id: string;
  name: string;
  slug?: string;
  description?: string | null;
  icon?: string;
  color?: string;
  is_pinned?: boolean;
  default_model?: string | null;
  default_system_prompt?: string | null;
  default_response_mode?: "discussion" | "parallel" | "targeted";
  enabled_commands?: string[];
  notification_prefs?: Record<string, boolean>;
}): Promise<AgentChannel> {
  return fetchJSON("/api/channels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function getChannel(id: string): Promise<AgentChannel & { recent_conversations?: { id: string; name: string; updated_at: string }[] }> {
  return fetchJSON(`/api/channels/${id}`);
}

export function updateChannel(
  id: string,
  body: Partial<{
    name: string;
    slug: string;
    description: string | null;
    icon: string;
    color: string;
    is_pinned: boolean;
    sort_order: number;
    default_model: string | null;
    default_system_prompt: string | null;
    default_response_mode: "discussion" | "parallel" | "targeted";
    enabled_commands: string[];
    notification_prefs: Record<string, boolean>;
    is_archived: boolean;
  }>,
): Promise<AgentChannel> {
  return fetchJSON(`/api/channels/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function archiveChannel(id: string): Promise<{ ok: true; channel: AgentChannel }> {
  return fetchJSON(`/api/channels/${id}`, { method: "DELETE" });
}
