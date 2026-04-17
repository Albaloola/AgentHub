"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  MessageSquare,
  Pin,
  Plus,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createConversation, getAgents, getChannels, getConversations } from "@/lib/api";
import { cn, getAvatarColor, getInitials, timeAgo } from "@/lib/utils";
import type { AgentChannelWithAgent, AgentWithStatus, ConversationWithDetails } from "@/lib/types";
import {
  buildGatewayGroups,
  buildShellChannelIndex,
  usePinnedChannelIds,
  type GatewayGroup,
  type ShellChannelDescriptor,
} from "@/components/layout/shell-navigation-model";
import { toast } from "sonner";

function sortConversationsByRecent(conversations: ConversationWithDetails[]) {
  return [...conversations].sort(
    (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentWithStatus[]>([]);
  const [channels, setChannels] = useState<AgentChannelWithAgent[]>([]);
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const { pinnedChannelIds } = usePinnedChannelIds();

  useEffect(() => {
    void loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [nextAgents, nextConversations, nextChannels] = await Promise.all([
        getAgents(),
        getConversations(),
        getChannels(),
      ]);
      setAgents(nextAgents);
      setConversations(nextConversations);
      setChannels(nextChannels);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  async function openChannel(channel: ShellChannelDescriptor) {
    if (channel.href) {
      router.push(channel.href);
      return;
    }

    if (channel.conversationId) {
      router.push(`/chat/${channel.conversationId}`);
      return;
    }

    if (channel.channelId) {
      try {
        const { id } = await createConversation({
          channel_id: channel.channelId,
          name: channel.title,
        });
        router.push(`/chat/${id}`);
      } catch {
        toast.error("Failed to open channel");
      }
      return;
    }

    if (channel.agentId) {
      try {
        const { id } = await createConversation({ agent_id: channel.agentId });
        router.push(`/chat/${id}`);
      } catch {
        toast.error("Failed to open channel");
      }
    }
  }

  async function startDirectChat(agentId: string) {
    try {
      const { id } = await createConversation({ agent_id: agentId });
      router.push(`/chat/${id}`);
    } catch {
      toast.error("Failed to create conversation");
    }
  }

  const sortedConversations = useMemo(() => sortConversationsByRecent(conversations), [conversations]);
  const gatewayGroups = useMemo(() => buildGatewayGroups(agents), [agents]);
  const channelIndex = useMemo(
    () => buildShellChannelIndex(agents, conversations, channels),
    [agents, channels, conversations],
  );
  const pinnedChannels = useMemo(
    () =>
      pinnedChannelIds
        .map((channelId) => channelIndex.get(channelId))
        .filter((channel): channel is ShellChannelDescriptor => Boolean(channel)),
    [channelIndex, pinnedChannelIds],
  );
  const pinnedChats = useMemo(
    () => sortedConversations.filter((conversation) => conversation.is_pinned).slice(0, 5),
    [sortedConversations],
  );
  const recentChats = useMemo(
    () => sortedConversations.filter((conversation) => !conversation.is_pinned).slice(0, 8),
    [sortedConversations],
  );
  const onlineAgents = useMemo(
    () => agents.filter((agent) => agent.status === "online"),
    [agents],
  );
  const activeAgents = useMemo(
    () => agents.filter((agent) => agent.is_active),
    [agents],
  );
  const totalMessages = useMemo(
    () => agents.reduce((sum, agent) => sum + (agent.total_messages || 0), 0),
    [agents],
  );
  const totalTokens = useMemo(
    () => agents.reduce((sum, agent) => sum + (agent.total_tokens || 0), 0),
    [agents],
  );
  const heroChannels = pinnedChannels.slice(0, 3);
  const topAgents = useMemo(
    () =>
      [...agents]
        .sort((left, right) => (right.total_messages || 0) - (left.total_messages || 0))
        .slice(0, 4),
    [agents],
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="workspace-page workspace-page--wide workspace-stack">
        <section className="workspace-intro">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--theme-accent)_60%,transparent),transparent)]" />
          <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent-blue)_16%,transparent),transparent_72%)] blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent-violet)_14%,transparent),transparent_72%)] blur-3xl" />

          <div className="workspace-intro__content workspace-intro__content--split gap-8 xl:grid-cols-[1.3fr_0.9fr]">
            <div>
              <p className="workspace-eyebrow">
                Hybrid Cockpit
              </p>
              <h1
                className="title-font mt-4 max-w-3xl text-[clamp(1.45rem,1rem+0.7vw,2rem)] font-semibold tracking-[-0.035em] text-foreground xl:whitespace-nowrap"
                style={{ lineHeight: 1.24, paddingBottom: "0.4em", textWrap: "balance" }}
              >
                Mission control for channels and agents.
              </h1>
              <p className="workspace-description mt-4 max-w-2xl">
                Launch into the right channel, check gateway health, and keep your pinned conversations close without bouncing between separate surfaces.
              </p>

              <div className="workspace-actions mt-6">
                <Button onClick={() => router.push("/agents")} className="rounded-full px-5">
                  <Bot className="mr-2 h-4 w-4" />
                  Manage agents
                </Button>
                <Button variant="outline" onClick={() => router.push("/groups")} className="rounded-full px-5">
                  <Users className="mr-2 h-4 w-4" />
                  Group channels
                </Button>
                {topAgents[0] && (
                  <Button
                    variant="outline"
                    onClick={() => startDirectChat(topAgents[0].id)}
                    className="rounded-full px-5"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Chat with {topAgents[0].name}
                  </Button>
                )}
              </div>

              <div className="workspace-metric-grid mt-8 sm:grid-cols-2 xl:grid-cols-4">
                <StatPlate
                  title="Online agents"
                  value={loading ? "..." : `${onlineAgents.length}`}
                  hint={`${activeAgents.length} enabled`}
                  icon={Bot}
                />
                <StatPlate
                  title="Pinned channels"
                  value={loading ? "..." : `${pinnedChannels.length}`}
                  hint="Local shell pins"
                  icon={Pin}
                />
                <StatPlate
                  title="Pinned chats"
                  value={loading ? "..." : `${pinnedChats.length}`}
                  hint="Server-backed chat pins"
                  icon={MessageSquare}
                />
                <StatPlate
                  title="Messages routed"
                  value={loading ? "..." : formatNumber(totalMessages)}
                  hint={`${formatNumber(totalTokens)} tokens processed`}
                  icon={Zap}
                />
              </div>
            </div>

            <div className="surface-subtle workspace-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Pinned launch deck</p>
                  <p className="text-xs text-muted-foreground">
                    Quick jumps into the channels you marked in the shell
                  </p>
                </div>
                <Pin className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="mt-4 space-y-3">
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 rounded-[var(--workspace-radius-lg)]" />
                  ))
                ) : heroChannels.length > 0 ? (
                  heroChannels.map((channel) => {
                    const ChannelIcon = channel.icon;
                    return (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => void openChannel(channel)}
                        className="group relative flex w-full items-center gap-4 rounded-[var(--workspace-radius-lg)] border border-foreground/[0.08] px-4 py-4 text-left transition-colors hover:border-foreground/[0.14] hover:bg-foreground/[0.03]"
                      >
                        <div
                          className="pointer-events-none absolute inset-x-10 -inset-y-1 rounded-full opacity-0 blur-xl transition-opacity duration-200 group-hover:opacity-100"
                          style={{
                            background: `radial-gradient(circle, color-mix(in srgb, ${channel.accent} 24%, transparent) 0%, transparent 72%)`,
                          }}
                        />
                        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", channel.iconClassName)}>
                          <ChannelIcon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground">{channel.title}</span>
                            <span className="rounded-full border border-foreground/[0.08] px-2 py-0.5 text-[var(--text-label)] text-muted-foreground">
                              Local pin
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{channel.subtitle}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-[var(--workspace-radius-lg)] border border-dashed border-foreground/[0.08] px-4 py-5 text-sm text-muted-foreground">
                    Pin a gateway or agent channel from the left rail to keep it here.
                  </div>
                )}
              </div>

              <div className="mt-5 border-t border-foreground/[0.06] pt-5">
                <p className="text-xs uppercase tracking-[var(--tracking-eyebrow)] text-muted-foreground">Top operators</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-14 rounded-2xl" />
                    ))
                  ) : (
                    topAgents.map((agent) => (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => startDirectChat(agent.id)}
                        className="flex items-center gap-3 rounded-2xl border border-foreground/[0.08] px-3 py-3 text-left transition-colors hover:border-foreground/[0.14] hover:bg-foreground/[0.03]"
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white",
                            getAvatarColor(agent.id),
                          )}
                        >
                          {getInitials(agent.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{agent.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatNumber(agent.total_messages || 0)} msgs
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="workspace-panel-grid xl:grid-cols-[1.05fr_0.95fr]">
          <section className="surface-panel workspace-panel p-5 md:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[var(--text-eyebrow)] uppercase tracking-[var(--tracking-eyebrow)] text-muted-foreground">
                  Gateway lanes
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  Agent groups by gateway
                </h2>
              </div>
              <Button variant="ghost" className="rounded-full text-sm" onClick={() => router.push("/agents")}>
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-28 rounded-[var(--workspace-radius-lg)]" />
                ))
              ) : (
                gatewayGroups.map((group) => (
                  <GatewayLane
                    key={group.gateway}
                    group={group}
                    onOpen={() => {
                      const channel = channelIndex.get(`gateway:${group.gateway}`);
                      if (channel) {
                        void openChannel(channel);
                      }
                    }}
                    onChatAgent={startDirectChat}
                  />
                ))
              )}
            </div>
          </section>

          <div className="grid gap-6">
            <WatchSection
              title="Pinned chats"
              description="Server-backed chat pins stay separate from the local channel deck."
              emptyState="No pinned chats yet."
              loading={loading}
            >
              {pinnedChats.map((conversation) => (
                <ConversationWatchRow
                  key={conversation.id}
                  conversation={conversation}
                  onOpen={() => router.push(`/chat/${conversation.id}`)}
                />
              ))}
            </WatchSection>

            <WatchSection
              title="Recent chats"
              description="The latest threads still worth keeping in sight."
              emptyState="No conversations yet."
              loading={loading}
            >
              {recentChats.map((conversation) => (
                <ConversationWatchRow
                  key={conversation.id}
                  conversation={conversation}
                  onOpen={() => router.push(`/chat/${conversation.id}`)}
                />
              ))}
            </WatchSection>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPlate({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <div className="workspace-metric">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="workspace-metric__label">{title}</p>
          <p className="workspace-metric__value">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground/[0.05] text-muted-foreground">
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <p className="workspace-metric__hint">{hint}</p>
    </div>
  );
}

function GatewayLane({
  group,
  onOpen,
  onChatAgent,
}: {
  group: GatewayGroup;
  onOpen: () => void;
  onChatAgent: (agentId: string) => void;
}) {
  const GatewayIcon = group.meta.icon;

  return (
    <div className="surface-panel workspace-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", group.meta.iconClassName)}>
            <GatewayIcon className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium tracking-tight text-foreground">{group.label}</h3>
              <span className={cn("rounded-full border px-2 py-0.5 text-[var(--text-label)]", group.meta.badgeClassName)}>
                {group.onlineCount}/{group.agents.length} online
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Direct lane into the {group.label} gateway cluster.
            </p>
          </div>
        </div>

        <Button variant="ghost" className="rounded-full text-sm" onClick={onOpen}>
          Open lane
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {group.agents.slice(0, 4).map((agent) => (
          <button
            key={agent.id}
            type="button"
            onClick={() => onChatAgent(agent.id)}
            className="flex items-center gap-3 rounded-2xl border border-foreground/[0.08] px-3 py-3 text-left transition-colors hover:border-foreground/[0.14] hover:bg-foreground/[0.03]"
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white",
                getAvatarColor(agent.id),
              )}
            >
              {getInitials(agent.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">{agent.name}</span>
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    agent.status === "online" && "bg-emerald-500",
                    agent.status === "busy" && "bg-amber-500",
                    agent.status === "error" && "bg-rose-500",
                    agent.status === "offline" && "bg-slate-500",
                  )}
                />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {formatNumber(agent.total_messages || 0)} messages
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function WatchSection({
  title,
  description,
  emptyState,
  loading,
  children,
}: {
  title: string;
  description: string;
  emptyState: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  const childCount = Array.isArray(children) ? children.filter(Boolean).length : children ? 1 : 0;

  return (
    <section className="surface-panel workspace-panel p-5 md:p-6">
      <p className="workspace-eyebrow">{title}</p>
      <h2 className="workspace-section-title mt-2">{title}</h2>
      <p className="workspace-section-description mt-2">{description}</p>

      <div className="mt-5 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-[var(--workspace-radius-lg)]" />
          ))
        ) : childCount > 0 ? (
          children
        ) : (
          <div className="rounded-[var(--workspace-radius-lg)] border border-dashed border-foreground/[0.08] px-4 py-5 text-sm text-muted-foreground">
            {emptyState}
          </div>
        )}
      </div>
    </section>
  );
}

function ConversationWatchRow({
  conversation,
  onOpen,
}: {
  conversation: ConversationWithDetails;
  onOpen: () => void;
}) {
  const primaryAgent = conversation.agents[0];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex w-full items-center gap-4 rounded-[var(--workspace-radius-lg)] border border-foreground/[0.08] px-4 py-4 text-left transition-colors hover:border-foreground/[0.14] hover:bg-foreground/[0.03]"
    >
      <div
        className="pointer-events-none absolute inset-x-8 -inset-y-1 rounded-full opacity-0 blur-xl transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: "radial-gradient(circle, color-mix(in srgb, var(--accent-blue) 18%, transparent) 0%, transparent 72%)",
        }}
      />
      <div
        className={cn(
          "relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
          primaryAgent ? getAvatarColor(primaryAgent.id) : "bg-violet-600",
        )}
      >
        {primaryAgent ? getInitials(primaryAgent.name) : "SQ"}
      </div>
      <div className="relative z-10 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {conversation.name || "Untitled chat"}
          </span>
          {conversation.is_pinned && (
            <span className="rounded-full border border-[var(--accent-rose)]/30 px-2 py-0.5 text-[var(--text-label)] text-[var(--accent-rose)]">
              Chat pin
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {primaryAgent?.name ?? `${conversation.agents.length} agents`} · {timeAgo(conversation.updated_at)}
        </p>
        {conversation.last_message?.content && (
          <p className="mt-1 truncate text-xs text-muted-foreground/80">
            {conversation.last_message.content}
          </p>
        )}
      </div>
      <ArrowRight className="relative z-10 h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function formatNumber(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return String(value);
}
