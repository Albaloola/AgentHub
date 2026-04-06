"use client";

import { useEffect, useState } from "react";
import {
  Brain, MessageSquareHeart, AlertTriangle, Loader2, Hash,
  ThumbsUp, ThumbsDown, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { getTopicClusters, getFeedbackInsights, getAnomalies, resolveAnomaly, getAgents } from "@/lib/api";
import { cn, getInitials, getAvatarColor, timeAgo } from "@/lib/utils";
import type { TopicCluster, FeedbackInsight, AnomalyEvent } from "@/lib/types";
import { toast } from "sonner";

export default function InsightsPage() {
  const { agents, setAgents } = useStore();
  const [topics, setTopics] = useState<TopicCluster[]>([]);
  const [feedback, setFeedback] = useState<FeedbackInsight[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [t, f, an, ag] = await Promise.all([
        getTopicClusters(),
        getFeedbackInsights(),
        getAnomalies(),
        getAgents(),
      ]);
      setTopics(t);
      setFeedback(f);
      setAnomalies(an);
      setAgents(ag);
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

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Intelligence dashboard combining topic analysis, feedback, and anomaly detection
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Brain className="h-5 w-5 text-violet-500" />
            <div>
              <div className="text-2xl font-bold">{topics.length}</div>
              <div className="text-xs text-muted-foreground">Topic Clusters</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <MessageSquareHeart className="h-5 w-5 text-emerald-500" />
            <div>
              <div className="text-2xl font-bold">{feedback.length}</div>
              <div className="text-xs text-muted-foreground">Feedback Insights</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-2xl font-bold">
                {anomalies.filter((a) => !a.is_resolved).length}
              </div>
              <div className="text-xs text-muted-foreground">Open Anomalies</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue={0}>
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
          </TabsList>

          {/* === Topics Tab === */}
          <TabsContent value={0}>
            {topics.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Brain className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-1">No topics yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Topic clusters will appear as conversations accumulate
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Distribution bar */}
                <Card>
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
                              <Badge variant="outline" className="text-[10px]">
                                {topic.conversation_count} conversations
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {keywords.map((kw, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px]">
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
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquareHeart className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-1">No feedback insights</h3>
                  <p className="text-sm text-muted-foreground">
                    Feedback insights will appear as users rate agent responses
                  </p>
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
                              "flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-medium text-white shrink-0",
                              getAvatarColor(fb.agent_id),
                            )}
                          >
                            {getInitials(agentName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{agentName}</span>
                              {fb.topic && (
                                <Badge variant="outline" className="text-[10px]">
                                  {fb.topic}
                                </Badge>
                              )}
                            </div>
                            {/* Sentiment bar */}
                            <div className="flex items-center gap-2 mb-2">
                              <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />
                              <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden flex">
                                <div
                                  className="h-full bg-emerald-500 transition-all"
                                  style={{ width: `${posPct}%` }}
                                />
                                <div
                                  className="h-full bg-red-500 transition-all"
                                  style={{ width: `${100 - posPct}%` }}
                                />
                              </div>
                              <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1">
                              <span className="text-emerald-600 font-medium">
                                {fb.positive_count} positive
                              </span>
                              <span className="text-red-600 font-medium">
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
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-1">No anomalies detected</h3>
                  <p className="text-sm text-muted-foreground">
                    Anomaly events will appear when unusual agent behavior is detected
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {anomalies.map((anomaly) => {
                  const agentName = getAgentName(anomaly.agent_id);
                  const severityColor =
                    anomaly.severity === "critical"
                      ? "border-red-500/30 text-red-600 bg-red-500/10"
                      : anomaly.severity === "warning"
                        ? "border-yellow-500/30 text-yellow-600 bg-yellow-500/10"
                        : "border-blue-500/30 text-blue-600 bg-blue-500/10";
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
                              "flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-medium text-white shrink-0",
                              getAvatarColor(anomaly.agent_id),
                            )}
                          >
                            {getInitials(agentName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium">{agentName}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {anomaly.type}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn("text-[10px]", severityColor)}
                              >
                                {anomaly.severity}
                              </Badge>
                              {anomaly.is_resolved && (
                                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">
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
                              <span className="text-[11px] text-muted-foreground">
                                {timeAgo(anomaly.created_at)}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-muted-foreground">Resolved</span>
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
        </Tabs>
      )}
    </div>
  );
}
