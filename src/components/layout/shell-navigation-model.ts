"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  Boxes,
  House,
  type LucideIcon,
  Orbit,
  RadioTower,
  Sparkles,
  Users2,
  Waypoints,
} from "lucide-react";
import type { AgentChannelWithAgent, AgentWithStatus, ConversationWithDetails } from "@/lib/types";
import { GATEWAY_LABELS } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export type ShellChannelKind = "home" | "gateway" | "agent" | "channel" | "group";

export interface GatewayMeta {
  key: string;
  label: string;
  accent: string;
  icon: LucideIcon;
  iconClassName: string;
  badgeClassName: string;
  glowClassName: string;
}

export interface GatewayGroup {
  gateway: string;
  label: string;
  meta: GatewayMeta;
  agents: AgentWithStatus[];
  onlineCount: number;
}

export interface ShellChannelDescriptor {
  id: string;
  kind: ShellChannelKind;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  glowClassName: string;
  icon: LucideIcon;
  iconClassName: string;
  badgeClassName: string;
  href?: string;
  gateway?: string;
  agentId?: string;
  channelId?: string;
  conversationId?: string;
  updatedAt?: string;
  updatedLabel?: string;
}

const DEFAULT_GATEWAY_META: GatewayMeta = {
  key: "default",
  label: "Gateway",
  accent: "var(--accent-cyan)",
  icon: Boxes,
  iconClassName: "bg-cyan-500/15 text-cyan-100",
  badgeClassName: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
  glowClassName: "hover-glow-cyan",
};

const GATEWAY_META: Record<string, GatewayMeta> = {
  hermes: {
    key: "hermes",
    label: "Hermes",
    accent: "var(--accent-blue)",
    icon: Orbit,
    iconClassName: "bg-blue-500/15 text-blue-100",
    badgeClassName: "border-blue-400/25 bg-blue-400/10 text-blue-100",
    glowClassName: "hover-glow-blue",
  },
  openclaw: {
    key: "openclaw",
    label: "OpenClaw",
    accent: "var(--accent-violet)",
    icon: Waypoints,
    iconClassName: "bg-violet-500/15 text-violet-100",
    badgeClassName: "border-violet-400/25 bg-violet-400/10 text-violet-100",
    glowClassName: "hover-glow-violet",
  },
  "openai-compat": {
    key: "openai-compat",
    label: "OpenAI Compatible",
    accent: "var(--accent-emerald)",
    icon: Sparkles,
    iconClassName: "bg-emerald-500/15 text-emerald-100",
    badgeClassName: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    glowClassName: "hover-glow-emerald",
  },
  websocket: {
    key: "websocket",
    label: "WebSocket",
    accent: "var(--accent-amber)",
    icon: RadioTower,
    iconClassName: "bg-amber-500/15 text-amber-100",
    badgeClassName: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    glowClassName: "hover-glow-amber",
  },
  mock: {
    key: "mock",
    label: "Mock",
    accent: "var(--accent-rose)",
    icon: Boxes,
    iconClassName: "bg-rose-500/15 text-rose-100",
    badgeClassName: "border-rose-400/25 bg-rose-400/10 text-rose-100",
    glowClassName: "hover-glow-rose",
  },
};

const CHANNEL_PIN_STORAGE_KEY = "agenthub-channel-pins-v1";
const CHANNEL_PIN_EVENT = "agenthub:channel-pins";

function sortByUpdatedAtDescending(
  left: Pick<ConversationWithDetails, "updated_at">,
  right: Pick<ConversationWithDetails, "updated_at">,
) {
  return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
}

function dedupeIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function readStoredPinnedChannelIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(CHANNEL_PIN_STORAGE_KEY);
    if (!raw) {
      return [] as string[];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? dedupeIds(parsed.filter((value): value is string => typeof value === "string")) : [];
  } catch {
    return [] as string[];
  }
}

function writeStoredPinnedChannelIds(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  const nextIds = dedupeIds(ids);
  window.localStorage.setItem(CHANNEL_PIN_STORAGE_KEY, JSON.stringify(nextIds));
  window.dispatchEvent(new CustomEvent<string[]>(CHANNEL_PIN_EVENT, { detail: nextIds }));
}

export function getGatewayMeta(gateway: string | null | undefined): GatewayMeta {
  if (!gateway) {
    return DEFAULT_GATEWAY_META;
  }

  const meta = GATEWAY_META[gateway];
  if (meta) {
    return meta;
  }

  return {
    ...DEFAULT_GATEWAY_META,
    key: gateway,
    label: GATEWAY_LABELS[gateway] ?? gateway,
  };
}

export function getConversationPrimaryAgent(conversation: ConversationWithDetails | null | undefined) {
  return conversation?.agents[0] ?? null;
}

export function getConversationChannelId(conversation: ConversationWithDetails | null | undefined) {
  if (!conversation) {
    return null;
  }

  const persistedChannelId = conversation.channel?.id ?? conversation.channel_id;
  if (persistedChannelId) {
    return `channel:${persistedChannelId}`;
  }

  const primaryAgent = getConversationPrimaryAgent(conversation);
  if (conversation.type === "single" && primaryAgent) {
    return `agent:${primaryAgent.id}`;
  }

  return `group:${conversation.id}`;
}

export function buildGatewayGroups(agents: AgentWithStatus[]) {
  const groups = new Map<string, AgentWithStatus[]>();

  for (const agent of agents) {
    const key = agent.gateway_type || "default";
    const current = groups.get(key) ?? [];
    current.push(agent);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .map(([gateway, gatewayAgents]) => ({
      gateway,
      label: GATEWAY_LABELS[gateway] ?? gateway,
      meta: getGatewayMeta(gateway),
      agents: [...gatewayAgents].sort((left, right) => {
        if (left.is_active !== right.is_active) {
          return Number(right.is_active) - Number(left.is_active);
        }
        if (left.status !== right.status) {
          return left.status.localeCompare(right.status);
        }
        return left.name.localeCompare(right.name);
      }),
      onlineCount: gatewayAgents.filter((agent) => agent.status === "online").length,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function buildShellChannelIndex(
  agents: AgentWithStatus[],
  conversations: ConversationWithDetails[],
  channels: AgentChannelWithAgent[] = [],
) {
  const index = new Map<string, ShellChannelDescriptor>();
  const sortedConversations = [...conversations].sort(sortByUpdatedAtDescending);
  const gatewayGroups = buildGatewayGroups(agents);
  const latestConversationByAgent = new Map<string, ConversationWithDetails>();
  const latestConversationByChannel = new Map<string, ConversationWithDetails>();

  for (const conversation of sortedConversations) {
    const persistedChannelId = conversation.channel?.id ?? conversation.channel_id;
    if (persistedChannelId && !latestConversationByChannel.has(persistedChannelId)) {
      latestConversationByChannel.set(persistedChannelId, conversation);
    }
    for (const agent of conversation.agents) {
      if (!latestConversationByAgent.has(agent.id)) {
        latestConversationByAgent.set(agent.id, conversation);
      }
    }
  }

  index.set("home", {
    id: "home",
    kind: "home",
    title: "Mission control",
    subtitle: "Cockpit, watchlists, and live handoffs",
    description: "Return to the command deck",
    accent: "var(--accent-blue)",
    glowClassName: "hover-glow-blue",
    icon: House,
    iconClassName: "bg-blue-500/15 text-blue-100",
    badgeClassName: "border-blue-400/25 bg-blue-400/10 text-blue-100",
    href: "/",
  });

  for (const group of gatewayGroups) {
    index.set(`gateway:${group.gateway}`, {
      id: `gateway:${group.gateway}`,
      kind: "gateway",
      title: group.label,
      subtitle: `${group.agents.length} agents available`,
      description: `Focus the ${group.label} gateway lane`,
      accent: group.meta.accent,
      glowClassName: group.meta.glowClassName,
      icon: group.meta.icon,
      iconClassName: group.meta.iconClassName,
      badgeClassName: group.meta.badgeClassName,
      gateway: group.gateway,
      href: `/agents?gateway=${encodeURIComponent(group.gateway)}`,
    });
  }

  for (const channel of [...channels].sort((left, right) => {
    if (left.is_pinned !== right.is_pinned) {
      return Number(right.is_pinned) - Number(left.is_pinned);
    }
    if ((left.sort_order ?? 0) !== (right.sort_order ?? 0)) {
      return (left.sort_order ?? 0) - (right.sort_order ?? 0);
    }
    return left.name.localeCompare(right.name);
  })) {
    const ownerAgent =
      channel.agent ??
      agents.find((agent) => agent.id === channel.agent_id) ??
      null;
    const meta = getGatewayMeta(ownerAgent?.gateway_type);
    const latestConversation = latestConversationByChannel.get(channel.id);

    index.set(`channel:${channel.id}`, {
      id: `channel:${channel.id}`,
      kind: "channel",
      title: channel.name,
      subtitle: latestConversation
        ? `Latest ${timeAgo(latestConversation.updated_at)}`
        : ownerAgent
          ? ownerAgent.name
          : "No activity yet",
      description:
        channel.description ||
        (ownerAgent
          ? `Open ${ownerAgent.name}'s ${channel.name} channel`
          : "Open this agent-owned channel"),
      accent: channel.color || meta.accent,
      glowClassName: meta.glowClassName,
      icon: Bot,
      iconClassName: meta.iconClassName,
      badgeClassName: meta.badgeClassName,
      gateway: ownerAgent?.gateway_type,
      agentId: ownerAgent?.id ?? channel.agent_id,
      channelId: channel.id,
      conversationId: latestConversation?.id,
      updatedAt: latestConversation?.updated_at ?? channel.updated_at,
      updatedLabel: latestConversation
        ? timeAgo(latestConversation.updated_at)
        : channel.updated_at
          ? timeAgo(channel.updated_at)
          : undefined,
    });
  }

  for (const agent of [...agents].sort((left, right) => left.name.localeCompare(right.name))) {
    const hasOwnedChannel = channels.some((channel) => channel.agent_id === agent.id);
    if (hasOwnedChannel) {
      continue;
    }
    const meta = getGatewayMeta(agent.gateway_type);
    const latestConversation = latestConversationByAgent.get(agent.id);

    index.set(`agent:${agent.id}`, {
      id: `agent:${agent.id}`,
      kind: "agent",
      title: agent.name,
      subtitle: latestConversation ? `Latest ${timeAgo(latestConversation.updated_at)}` : "No direct chat yet",
      description: `Open ${agent.name}'s direct channel`,
      accent: meta.accent,
      glowClassName: meta.glowClassName,
      icon: Bot,
      iconClassName: meta.iconClassName,
      badgeClassName: meta.badgeClassName,
      gateway: agent.gateway_type,
      agentId: agent.id,
      conversationId: latestConversation?.id,
      updatedAt: latestConversation?.updated_at,
      updatedLabel: latestConversation ? timeAgo(latestConversation.updated_at) : undefined,
    });
  }

  for (const conversation of sortedConversations.filter((item) => item.type === "group")) {
    const gatewaySet = new Set(conversation.agents.map((agent) => agent.gateway_type));
    const primaryGateway = conversation.agents[0]?.gateway_type;
    const meta = getGatewayMeta(primaryGateway);
    const participants = conversation.agents
      .slice(0, 3)
      .map((agent) => agent.name)
      .join(", ");

    index.set(`group:${conversation.id}`, {
      id: `group:${conversation.id}`,
      kind: "group",
      title: conversation.name || "Squad channel",
      subtitle:
        gatewaySet.size > 1
          ? `${conversation.agents.length} agents across ${gatewaySet.size} gateways`
          : `${conversation.agents.length} agents in ${meta.label}`,
      description: participants || "Open this shared agent channel",
      accent: meta.accent,
      glowClassName: meta.glowClassName,
      icon: Users2,
      iconClassName: meta.iconClassName,
      badgeClassName: meta.badgeClassName,
      gateway: primaryGateway,
      conversationId: conversation.id,
      updatedAt: conversation.updated_at,
      updatedLabel: timeAgo(conversation.updated_at),
    });
  }

  return index;
}

export function usePinnedChannelIds() {
  const [pinnedChannelIds, setPinnedChannelIds] = useState<string[]>(() => readStoredPinnedChannelIds());

  useEffect(() => {
    const handleStorage = () => {
      setPinnedChannelIds(readStoredPinnedChannelIds());
    };

    const handlePinnedEvent = (event: Event) => {
      const detail = (event as CustomEvent<string[]>).detail;
      setPinnedChannelIds(Array.isArray(detail) ? dedupeIds(detail) : readStoredPinnedChannelIds());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(CHANNEL_PIN_EVENT, handlePinnedEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CHANNEL_PIN_EVENT, handlePinnedEvent);
    };
  }, []);

  const updatePinnedChannelIds = useCallback((updater: string[] | ((previous: string[]) => string[])) => {
    setPinnedChannelIds((previous) => {
      const nextValue = dedupeIds(
        typeof updater === "function" ? updater(previous) : updater,
      );
      writeStoredPinnedChannelIds(nextValue);
      return nextValue;
    });
  }, []);

  const togglePinnedChannel = useCallback((channelId: string) => {
    updatePinnedChannelIds((previous) =>
      previous.includes(channelId)
        ? previous.filter((currentId) => currentId !== channelId)
        : [...previous, channelId],
    );
  }, [updatePinnedChannelIds]);

  const isChannelPinned = useCallback(
    (channelId: string) => pinnedChannelIds.includes(channelId),
    [pinnedChannelIds],
  );

  return {
    pinnedChannelIds,
    setPinnedChannelIds: updatePinnedChannelIds,
    togglePinnedChannel,
    isChannelPinned,
  };
}
