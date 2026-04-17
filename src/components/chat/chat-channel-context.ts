"use client";

import { Bot, Users2, type LucideIcon } from "lucide-react";
import type { Agent, ConversationWithDetails } from "@/lib/types";
import { GATEWAY_LABELS } from "@/lib/types";
import {
  getConversationChannelId,
  getConversationPrimaryAgent,
  getGatewayMeta,
} from "@/components/layout/shell-navigation-model";

export interface ChannelCommandTemplate {
  name: string;
  description: string;
}

export interface ChatChannelContext {
  id: string;
  pinId: string | null;
  channelId: string | null;
  kind: "direct" | "group";
  title: string;
  label: string;
  description: string;
  gatewayLabel: string;
  gatewayKey: string | null;
  icon: LucideIcon;
  accent: string;
  glowClassName: string;
  primaryAgent: Agent | null;
  agentIds: string[];
  agentNames: string[];
  composerPlaceholder: string;
  scopeHint: string;
  suggestedCommands: ChannelCommandTemplate[];
}

function buildGatewayLabel(agents: Agent[]) {
  const keys = Array.from(new Set(agents.map((agent) => agent.gateway_type).filter(Boolean)));
  if (keys.length === 0) {
    return "No gateway";
  }
  if (keys.length === 1) {
    return GATEWAY_LABELS[keys[0]] ?? keys[0];
  }
  return `${keys.length} gateways`;
}

function buildDirectChannelCommands(agentName: string): ChannelCommandTemplate[] {
  return [
    {
      name: "/plan",
      description: `Template: ask ${agentName} for a concrete next-step plan.`,
    },
    {
      name: "/handoff",
      description: `Template: route the next step from ${agentName} to another specialist.`,
    },
    {
      name: "/compare",
      description: `Template: have ${agentName} compare approaches before acting.`,
    },
  ];
}

function buildGroupChannelCommands(agentCount: number): ChannelCommandTemplate[] {
  return [
    {
      name: "/broadcast",
      description: `Template: invite all ${agentCount} agents to weigh in on the same prompt.`,
    },
    {
      name: "/route",
      description: "Template: target one agent in the squad for the next reply.",
    },
    {
      name: "/consensus",
      description: "Template: ask the channel to summarize agreement and open disagreements.",
    },
  ];
}

export function buildChatChannelContext(
  conversation: ConversationWithDetails | null,
): ChatChannelContext | null {
  if (!conversation) {
    return null;
  }

  const primaryAgent = getConversationPrimaryAgent(conversation);
  const gatewayMeta = getGatewayMeta(primaryAgent?.gateway_type);
  const gatewayLabel = buildGatewayLabel(conversation.agents);
  const agentNames = conversation.agents.map((agent) => agent.name);
  const pinId = getConversationChannelId(conversation);
  const persistedChannel = conversation.channel ?? null;
  const channelTitle = persistedChannel?.name?.trim() || null;
  const channelDescription = persistedChannel?.description?.trim() || null;
  const channelId = persistedChannel?.id ?? conversation.channel_id ?? null;

  if (conversation.type === "single" && primaryAgent) {
    const label = channelTitle ?? primaryAgent.name;
    const title =
      conversation.name && conversation.name !== primaryAgent.name && conversation.name !== channelTitle
        ? conversation.name
        : (channelTitle ?? primaryAgent.name);

    return {
      id: `channel:${conversation.id}`,
      pinId,
      channelId,
      kind: "direct",
      title,
      label,
      description: channelDescription ?? `Direct channel with ${primaryAgent.name}`,
      gatewayLabel,
      gatewayKey: primaryAgent.gateway_type,
      icon: Bot,
      accent: gatewayMeta.accent,
      glowClassName: gatewayMeta.glowClassName,
      primaryAgent,
      agentIds: [primaryAgent.id],
      agentNames,
      composerPlaceholder: `Message ${primaryAgent.name}, or type / for channel commands`,
      scopeHint:
        channelTitle && channelTitle !== primaryAgent.name
          ? `Replies stay in ${channelTitle} unless you retarget them.`
          : `Replies stay in ${primaryAgent.name}'s direct lane unless you retarget them.`,
      suggestedCommands: buildDirectChannelCommands(primaryAgent.name),
    };
  }

  return {
    id: `channel:${conversation.id}`,
    pinId,
    channelId,
    kind: "group",
    title: conversation.name || channelTitle || "Squad channel",
    label: channelTitle || conversation.name || `${conversation.agents.length}-agent squad`,
    description: channelDescription || `${conversation.agents.length} agents sharing one working thread`,
    gatewayLabel,
    gatewayKey: primaryAgent?.gateway_type ?? null,
    icon: Users2,
    accent: gatewayMeta.accent,
    glowClassName: gatewayMeta.glowClassName,
    primaryAgent,
    agentIds: conversation.agents.map((agent) => agent.id),
    agentNames,
    composerPlaceholder: "Broadcast to the squad, or use /route to focus a specific agent",
    scopeHint: "Group channels can fan out work or narrow replies to a chosen agent.",
    suggestedCommands: buildGroupChannelCommands(conversation.agents.length),
  };
}
