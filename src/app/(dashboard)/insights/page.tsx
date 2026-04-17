"use client";

import { useEffect, useState } from "react";
import {
  Brain, MessageSquareHeart, AlertTriangle, Loader2, Hash,
  ThumbsUp, ThumbsDown, DollarSign,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageIntro } from "@/components/layout/page-intro";
import { useStore } from "@/lib/store";
import { getTopicClusters, getFeedbackInsights, getAnomalies, resolveAnomaly, getAgents, getConversations } from "@/lib/api";
import { cn, getInitials, getAvatarColor, timeAgo } from "@/lib/utils";
import type { TopicCluster, FeedbackInsight, AnomalyEvent, ConversationWithDetails } from "@/lib/types";
import { toast } from "sonner";

export default function InsightsPage() {
  const agents = useStore((s) => s.agents);
  const setAgents = useStore((s) => s.setAgents);
  const [topics, setTopics] = useState<TopicCluster[]>([]);
  const [feedback, setFeedback] = useState<FeedbackInsight[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [convos, setConvos] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [t, f, an, ag, cv] = await Promise.all([
        getTopicClusters(),
        getFeedbackInsights(),
        getAnomalies(),
        getAgents(),
        getConversations(),
      ]);
      setTopics(t);
      setFeedback(f);
      setAnomalies(an);
      setAgents(ag);
      setConvos(cv);
    } catch {
      toast.error("Failed to load insights");
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(id: string) {
    try {
      await resolveAnomaly(id);
      setAnomalies((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_resolved: true } : a)),
      );
      toast.success("Anomaly marked as resolved");
    } catch {
      toast.error("Failed to resolve anomaly");
    }
  }

  function getAgentName(agentId: string) {
    return agents.find((a) => a.id === agentId)?.name ?? "Unknown";
  }

  const totalConversations = topics.reduce((s, t) => s + t.conversation_count, 0);

  // Cost computations
  const totalCost = convos.reduce((s, c) => s + (c.total_cost ?? 0), 0);
  const agentCostMap = new Map<string, { name: string; totalCost: number; convCount: number }>();
  for (const c of convos) {
    for (const agent of c.agents) {
      const entry = agentCostMap.get(agent.id) ?? { name: agent.name, totalCost: 0, convCount: 0 };
      entry.totalCost += c.total_cost ?? 0;
      entry.convCount += 1;
      agentCostMap.set(agent.id, entry);
    }
  }
  const agentCosts = Array.from(agentCostMap.values()).sort((a, b) => b.totalCost - a.totalCost);
  const maxAgentCost = agentCosts.length > 0 ? agentCosts[0].totalCost : 1;

  return (
    <div className="h-full overflow-y-auto">
      <div className="workspace-page workspace-stack max-w-7xl">
        <PageIntro
          eyebrow="Signal review"
          title="Insights"
          description="Topic clustering, feedback quality, anomaly review, and spend visibility in one shared analysis surface."
          aside={
            <div className="workspace-metric-grid">
              <div className="workspace-metric">
                <p className="workspace-metric__label">Topics</p>
                <p className="workspace-metric__value">{topics.length}</p>
                <p className="workspace-metric__hint">Detected clusters</p>
              </div>
              <div className="workspace-metric">
                <p className="workspace-metric__label">Open anomalies</p>
                <p className="workspace-metric__value">{anomalies.filter((a) => !a.is_resolved).length}</p>
                <p className="workspace-metric__hint">Need review</p>
              </div>
            </div>
          }
        />

      {/* Stats */}
      <div className="workspace-panel-grid grid-cols-2 md:grid-cols-4">
        <Card className="workspace-panel">
          <CardContent className="flex items-center gap-3 p-4">
            <Brain className="h-5 w-5 text-[var(--accent-violet)]" />
            <div>
              <div className="text-2xl font-bold">{topics.length}</div>
              <div className="text-xs text-muted-foreground">Topic Clusters</div>
            </div>
          </CardContent>
        </Card>
        <Card className="workspace-panel">
          <CardContent className="flex items-center gap-3 p-4">
            <MessageSquareHeart className="h-5 w-5 text-[var(--accent-emerald)]" />
            <div>
              <div className="text-2xl font-bold">{feedback.length}</div>
              <div className="text-xs text-muted-foreground">Feedback Insights</div>
            </div>
          </CardContent>
        </Card>
        <Card className="workspace-panel">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-[var(--status-warning)]" />
            <div>
              <div className="text-2xl font-bold">
                {anomalies.filter((a) => !a.is_resolved).length}
              </div>
              <div className="text-xs text-muted-foreground">Open Anomalies</div>
            </div>
          </CardContent>
        </Card>
        <Card className="workspace-panel">
          <CardContent className="flex items-center gap-3 p-4">
            <DollarSign className="h-5 w-5 text-[var(--accent-cyan)]" />
            <div>
              <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Total Cost</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue={0} className="workspace-stack">
          <TabsList>
            <TabsTrigger value={0}>
              <Brain className="h-4 w-4 mr-1" />
              Topics
            </TabsTrigger>
            <TabsTrigger value={1}>
              <MessageSquareHeart className="h-4 w-4 mr-1" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value={2}>
              <AlertTriangle className="h-4 w-4 mr-1" />
              Anomalies
            </TabsTrigger>
            <TabsTrigger value={3}>
              <DollarSign className="h-4 w-4 mr-1" />
              Costs
            </TabsTrigger>
          </TabsList>

          {/* === Topics Tab === */}
          <TabsContent value={0}>
            {topics.length === 0 ? (
              <Card className="workspace-panel">
                <CardContent>
                  <EmptyState
                    icon={Brain}
                    title="No topics yet"
                    description="Topic clusters will appear as conversations accumulate"
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Distribution bar */}
                 <Card className="workspace-panel">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-2">Topic Distribution</div>
                    <div className="flex h-4 rounded-full overflow-hidden">
                      {topics.map((topic) => {
                        const pct = totalConversations > 0
                          ? (topic.conversation_count / totalConversations) * 100
                          : 0;
                        return (
                          <div
                            key={topic.id}
                            className="h-full transition-all"
                            style={{
                              width: `${Math.max(pct, 1)}%`,
                              backgroundColor: topic.color || "#6366f1",
                            }}
                            title={`${topic.name}: ${Math.round(pct)}%`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3">
                      {topics.map((topic) => {
                        const pct = totalConversations > 0
                          ? Math.round((topic.conversation_count / totalConversations) * 100)
                          : 0;
                        return (
                          <div key={topic.id} className="flex items-center gap-1.5 text-xs">
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: topic.color || "#6366f1" }}
                            />
                            <span className="text-muted-foreground">{topic.name}</span>
                            <span className="font-medium">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Topic list */}
                {topics.map((topic) => {
                  const keywords: string[] = (() => {
                    try { return JSON.parse(topic.keywords); } catch { return []; }
                  })();
                  const pct = totalConversations > 0
                    ? (topic.conversation_count / totalConversations) * 100
                    : 0;
                  return (
                    <Card key={topic.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: topic.color || "#6366f1" }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{topic.name}</span>
                              <Badge variant="outline" className="text-[var(--text-label)]">
                                {topic.conversation_count} conversations
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {keywords.map((kw, i) => (
                                <Badge key={i} variant="secondary" className="text-[var(--text-label)]">
                                  <Hash className="h-3 w-3 mr-0.5" />
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                            {/* Conversation count bar */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.max(pct, 2)}%`,
                                    backgroundColor: topic.color || "#6366f1",
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-10 text-right">
                                {Math.round(pct)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* === Feedback Tab === */}
          <TabsContent value={1}>
            {feedback.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={MessageSquareHeart}
                    title="No feedback insights"
                    description="Feedback insights will appear as users rate agent responses"
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {feedback.map((fb) => {
                  const total = fb.positive_count + fb.negative_count;
                  const posPct = total > 0 ? (fb.positive_count / total) * 100 : 50;
                  const agentName = getAgentName(fb.agent_id);
                  return (
                    <Card key={fb.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-caption)] font-medium text-white shrink-0",
                              getAvatarColor(fb.agent_id),
                            )}
                          >
                            {getInitials(agentName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{agentName}</span>
                              {fb.topic && (
                                <Badge variant="outline" className="text-[var(--text-label)]">
                                  {fb.topic}
                                </Badge>
                              )}
                            </div>
                            {/* Sentiment bar */}
                            <div className="flex items-center gap-2 mb-2">
                              <ThumbsUp className="h-3.5 w-3.5 text-[var(--status-online)]" />
                              <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden flex">
                                <div
                                  className="h-full bg-[var(--status-online)] transition-all"
                                  style={{ width: `${posPct}%` }}
                                />
                                <div
                                  className="h-full bg-[var(--status-danger)] transition-all"
                                  style={{ width: `${100 - posPct}%` }}
                                />
                              </div>
                              <ThumbsDown className="h-3.5 w-3.5 text-[var(--status-danger)]" />
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1">
                              <span className="text-[var(--status-online)] font-medium">
                                {fb.positive_count} positive
                              </span>
                              <span className="text-[var(--status-danger)] font-medium">
                                {fb.negative_count} negative
                              </span>
                            </div>
                            {fb.insight && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {fb.insight}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* === Anomalies Tab === */}
          <TabsContent value={2}>
            {anomalies.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={AlertTriangle}
                    title="No anomalies detected"
                    description="Anomaly events will appear when unusual agent behavior is detected"
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {anomalies.map((anomaly) => {
                  const agentName = getAgentName(anomaly.agent_id);
                  const severityColor =
                    anomaly.severity === "critical"
                      ? "border-[var(--status-danger)]/30 text-[var(--status-danger)] bg-[var(--status-danger)]/10"
                      : anomaly.severity === "warning"
                        ? "border-[var(--status-warning)]/30 text-[var(--status-warning)] bg-[var(--status-warning)]/10"
                        : "border-[var(--accent-blue)]/30 text-[var(--accent-blue)] bg-[var(--accent-blue)]/10";
                  return (
                    <Card
                      key={anomaly.id}
                      className={cn(
                        anomaly.is_resolved && "opacity-60",
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-caption)] font-medium text-white shrink-0",
                              getAvatarColor(anomaly.agent_id),
                            )}
                          >
                            {getInitials(agentName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium">{agentName}</span>
                              <Badge variant="outline" className="text-[var(--text-label)]">
                                {anomaly.type}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn("text-[var(--text-label)]", severityColor)}
                              >
                                {anomaly.severity}
                              </Badge>
                              {anomaly.is_resolved && (
                                <Badge variant="outline" className="text-[var(--text-label)] border-[var(--status-online)]/30 text-[var(--status-online)]">
                                  resolved
                                </Badge>
                              )}
                            </div>
                            {(anomaly.expected_value !== null || anomaly.actual_value !== null) && (
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                                {anomaly.metric_name && (
                                  <span>{anomaly.metric_name}:</span>
                                )}
                                {anomaly.expected_value !== null && (
                                  <span>expected {anomaly.expected_value}</span>
                                )}
                                {anomaly.actual_value !== null && (
                                  <span className="font-medium text-foreground">
                                    actual {anomaly.actual_value}
                                  </span>
                                )}
                              </div>
                            )}
                            {anomaly.description && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {anomaly.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[var(--text-caption)] text-muted-foreground">
                                {timeAgo(anomaly.created_at)}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[var(--text-caption)] text-muted-foreground">Resolved</span>
                                <Switch
                                  checked={anomaly.is_resolved}
                                  onCheckedChange={() => {
                                    if (!anomaly.is_resolved) handleResolve(anomaly.id);
                                  }}
                                  disabled={anomaly.is_resolved}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* === Cost Tab === */}
          <TabsContent value={3}>
            <div className="space-y-3">
              {/* Total cost overview */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="h-5 w-5 text-[var(--accent-cyan)]" />
                    <div>
                      <div className="text-xs text-muted-foreground">Total Estimated Cost</div>
                      <div className="text-2xl font-bold">${totalCost.toFixed(4)}</div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-xs text-muted-foreground">Across</div>
                      <div className="text-sm font-medium">{convos.length} conversations</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Per-agent cost breakdown */}
              {agentCosts.length === 0 ? (
                <Card>
                  <CardContent>
                    <EmptyState
                      icon={DollarSign}
                      title="No cost data yet"
                      description="Cost breakdown will appear as conversations accumulate"
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-3">Per-Agent Cost Breakdown</div>
                    <div className="space-y-3">
                      {agentCosts.map((entry) => {
                        const pct = maxAgentCost > 0 ? (entry.totalCost / maxAgentCost) * 100 : 0;
                        const avgCost = entry.convCount > 0 ? entry.totalCost / entry.convCount : 0;
                        return (
                          <div key={entry.name}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{entry.name}</span>
                              <span className="text-sm font-bold">${entry.totalCost.toFixed(4)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2.5 bg-foreground/[0.05] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[var(--accent-cyan)] rounded-full transition-all"
                                  style={{ width: `${Math.max(pct, 2)}%` }}
                                />
                              </div>
                              <span className="text-[var(--text-caption)] text-muted-foreground w-28 text-right shrink-0">
                                avg ${avgCost.toFixed(4)}/conv
                              </span>
                            </div>
                            <div className="text-[var(--text-label)] text-muted-foreground mt-0.5">
                              {entry.convCount} conversation{entry.convCount !== 1 ? "s" : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
      </div>
    </div>
  );
}
