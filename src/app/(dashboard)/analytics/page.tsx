"use client";

import { useEffect, useState } from "react";
import {
  BarChart3, Zap, MessageSquare, Clock, AlertTriangle,
  RefreshCw, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageIntro } from "@/components/layout/page-intro";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { getAnalytics, getAgents, getConversations } from "@/lib/api";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { GATEWAY_LABELS } from "@/lib/types";
import { toast } from "sonner";

export default function AnalyticsPage() {
  const { agents, setAgents, conversations, setConversations, analytics, setAnalytics } = useStore(useShallow((s) => ({ agents: s.agents, setAgents: s.setAgents, conversations: s.conversations, setConversations: s.setConversations, analytics: s.analytics, setAnalytics: s.setAnalytics })));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [analyticsData, a, c] = await Promise.all([
        getAnalytics(),
        getAgents(),
        getConversations(),
      ]);
      setAnalytics(analyticsData);
      setAgents(a);
      setConversations(c);
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success("Analytics refreshed");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalTokens = analytics?.totalTokens ?? 0;
  const totalMessages = analytics?.totalMessages ?? 0;
  const avgResponseTime = analytics?.avgResponseTime ?? 0;
  const agentStats = analytics?.agentStats ?? [];
  const totalErrors = agentStats.reduce((sum, a) => sum + a.errors, 0);
  const onlineCount = agents.filter((a) => a.status === "online").length;

  // Find top performer
  const topAgent = agentStats.length > 0
    ? agentStats.reduce((top, a) => a.messages > top.messages ? a : top, agentStats[0])
    : null;

  // Find fastest agent
  const fastestAgent = agentStats.filter((a) => a.avg_time > 0).length > 0
    ? agentStats.filter((a) => a.avg_time > 0).reduce((fast, a) => a.avg_time < fast.avg_time ? a : fast, agentStats.filter((a) => a.avg_time > 0)[0])
    : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="workspace-page workspace-stack max-w-7xl">
        <PageIntro
          eyebrow="Operational telemetry"
          title="Analytics"
          description="Usage metrics, throughput, latency, and reliability trends across the active agent network."
          actions={
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("mr-1 h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
          }
          aside={
            <div className="workspace-metric-grid">
              <div className="workspace-metric">
                <p className="workspace-metric__label">Messages</p>
                <p className="workspace-metric__value">{formatNumber(totalMessages)}</p>
                <p className="workspace-metric__hint">Across all tracked agents</p>
              </div>
              <div className="workspace-metric">
                <p className="workspace-metric__label">Online</p>
                <p className="workspace-metric__value">{onlineCount}</p>
                <p className="workspace-metric__hint">Agents currently reachable</p>
              </div>
            </div>
          }
        />

      {/* Overview Stats */}
      <div className="workspace-panel-grid grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          icon={MessageSquare}
          label="Total Messages"
          value={formatNumber(totalMessages)}
          accent="text-[var(--accent-blue)]"
          bgAccent="bg-[var(--accent-blue)]/10"
        />
        <OverviewCard
          icon={Zap}
          label="Total Tokens"
          value={formatNumber(totalTokens)}
          accent="text-[var(--accent-violet)]"
          bgAccent="bg-[var(--accent-violet)]/10"
        />
        <OverviewCard
          icon={Clock}
          label="Avg Response"
          value={`${Math.round(avgResponseTime)}ms`}
          accent="text-[var(--accent-amber)]"
          bgAccent="bg-[var(--accent-amber)]/10"
        />
        <OverviewCard
          icon={AlertTriangle}
          label="Total Errors"
          value={totalErrors.toString()}
          accent={totalErrors > 0 ? "text-[var(--status-danger)]" : "text-[var(--status-online)]"}
          bgAccent={totalErrors > 0 ? "bg-[var(--status-danger)]/10" : "bg-[var(--status-online)]/10"}
        />
      </div>

      {/* Highlights */}
      <div className="workspace-panel-grid md:grid-cols-3">
        <Card className="workspace-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Status Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Online</span>
              <Badge variant="outline" className="border-[var(--status-online)]/30 text-[var(--status-online)]">{onlineCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Offline</span>
              <Badge variant="outline">{agents.length - onlineCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Chats</span>
              <Badge variant="outline" className="border-[var(--accent-blue)]/30 text-[var(--accent-blue)]">{conversations.length}</Badge>
            </div>
            {/* Status bar */}
            <div className="flex h-2 rounded-full overflow-hidden bg-muted mt-2">
              {agents.length > 0 && (
                <>
                  <div
                    className="bg-[var(--status-online)] transition-all"
                    style={{ width: `${(onlineCount / agents.length) * 100}%` }}
                  />
                  <div
                    className="bg-gray-400 transition-all"
                    style={{ width: `${((agents.length - onlineCount) / agents.length) * 100}%` }}
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="workspace-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            {topAgent ? (
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white", getAvatarColor(topAgent.agent_id))}>
                  {getInitials(topAgent.agent_name)}
                </div>
                <div>
                  <div className="font-medium">{topAgent.agent_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {topAgent.messages} messages &middot; {formatNumber(topAgent.tokens)} tokens
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={MessageSquare}
                title="No data yet"
                className="py-6"
                iconClassName="h-8 w-8 mb-2"
              />
            )}
          </CardContent>
        </Card>

        <Card className="workspace-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Fastest Agent</CardTitle>
          </CardHeader>
          <CardContent>
            {fastestAgent ? (
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white", getAvatarColor(fastestAgent.agent_id))}>
                  {getInitials(fastestAgent.agent_name)}
                </div>
                <div>
                  <div className="font-medium">{fastestAgent.agent_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(fastestAgent.avg_time)}ms avg response
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                title="No data yet"
                className="py-6"
                iconClassName="h-8 w-8 mb-2"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance Table */}
      <Card className="workspace-panel">
        <CardHeader>
          <CardTitle className="text-base">Agent Performance</CardTitle>
        </CardHeader>
          <CardContent>
            {agentStats.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No agent data yet. Start chatting to see metrics."
                className="py-8"
                iconClassName="h-8 w-8 mb-2"
              />
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-6 gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <div className="col-span-2">Agent</div>
                <div className="text-right">Messages</div>
                <div className="text-right">Tokens</div>
                <div className="text-right">Avg Time</div>
                <div className="text-right">Errors</div>
              </div>

              {agentStats
                .sort((a, b) => b.messages - a.messages)
                .map((stat) => {
                  const agent = agents.find((a) => a.id === stat.agent_id);
                  const maxMessages = Math.max(...agentStats.map((s) => s.messages), 1);
                  const barWidth = (stat.messages / maxMessages) * 100;

                  return (
                    <div key={stat.agent_id} className="relative rounded-lg border border-border overflow-hidden">
                      {/* Background bar */}
                      <div
                        className="absolute inset-y-0 left-0 bg-[var(--accent-blue)]/5 transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                      <div className="relative grid grid-cols-6 gap-2 px-3 py-2.5 items-center">
                        <div className="col-span-2 flex items-center gap-2 min-w-0">
                          <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-label)] font-medium text-white", getAvatarColor(stat.agent_id))}>
                            {getInitials(stat.agent_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{stat.agent_name}</div>
                            {agent && (
                              <div className="text-[var(--text-label)] text-muted-foreground">
                                {GATEWAY_LABELS[agent.gateway_type] ?? agent.gateway_type}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm font-medium">{stat.messages}</div>
                        <div className="text-right text-sm">{formatNumber(stat.tokens)}</div>
                        <div className="text-right text-sm">
                          {stat.avg_time > 0 ? `${Math.round(stat.avg_time)}ms` : "-"}
                        </div>
                        <div className={cn("text-right text-sm", stat.errors > 0 ? "text-[var(--status-danger)] font-medium" : "text-muted-foreground")}>
                          {stat.errors}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Usage Distribution */}
      {agentStats.length > 0 && (
        <Card className="workspace-panel">
          <CardHeader>
            <CardTitle className="text-base">Token Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agentStats
                .filter((s) => s.tokens > 0)
                .sort((a, b) => b.tokens - a.tokens)
                .map((stat) => {
                  const pct = totalTokens > 0 ? (stat.tokens / totalTokens) * 100 : 0;
                  return (
                    <div key={stat.agent_id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stat.agent_name}</span>
                        <span className="text-muted-foreground">
                          {formatNumber(stat.tokens)} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", getBarColor(stat.agent_id))}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  accent,
  bgAccent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
  bgAccent: string;
}) {
  return (
    <Card className="workspace-panel">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", bgAccent)}>
          <Icon className={cn("h-5 w-5", accent)} />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const BAR_COLORS = [
  "bg-[var(--accent-blue)]", "bg-[var(--accent-violet)]", "bg-[var(--accent-emerald)]", "bg-[var(--accent-amber)]",
  "bg-[var(--accent-rose)]", "bg-[var(--accent-cyan)]", "bg-[var(--accent-violet)]", "bg-[var(--accent-amber)]",
];

function getBarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return BAR_COLORS[Math.abs(hash) % BAR_COLORS.length];
}
