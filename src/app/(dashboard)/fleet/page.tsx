"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw, Loader2, Activity, AlertTriangle, Heart, MessageSquare,
  DollarSign, Link2, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { getAgents, checkAgentHealth, getAnomalies } from "@/lib/api";
import type { AgentWithStatus, AnomalyEvent } from "@/lib/types";
import { getInitials, getAvatarColor, cn } from "@/lib/utils";
import { toast } from "sonner";

function healthColor(score: number) {
  if (score > 80) return "text-emerald-500";
  if (score > 50) return "text-amber-500";
  return "text-red-500";
}

function healthBg(score: number) {
  if (score > 80) return "bg-emerald-500";
  if (score > 50) return "bg-amber-500";
  return "bg-red-500";
}

function statusDot(status: AgentWithStatus["status"]) {
  switch (status) {
    case "online": return "bg-emerald-500";
    case "offline": return "bg-gray-400";
    case "busy": return "bg-amber-500";
    case "error": return "bg-red-500";
    default: return "bg-gray-400";
  }
}

function severityBadge(severity: AnomalyEvent["severity"]) {
  switch (severity) {
    case "critical": return "bg-red-500/10 text-red-600 border-red-500/30";
    case "warning": return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    case "info": return "bg-blue-500/10 text-blue-600 border-blue-500/30";
    default: return "";
  }
}

function parseFallbackChain(chain: string): string[] {
  try {
    const parsed = JSON.parse(chain);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function FleetPage() {
  const agents = useStore((s) => s.agents);
  const setAgents = useStore((s) => s.setAgents);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [a, anom] = await Promise.all([getAgents(), getAnomalies()]);
      setAgents(a);
      setAnomalies(anom);
    } catch {
      toast.error("Failed to load fleet data");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAllHealth() {
    setRefreshing(true);
    try {
      const results = await Promise.allSettled(
        agents.map((a) => checkAgentHealth(a.id)),
      );
      const updated = await getAgents();
      setAgents(updated);
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      toast.success(`Health checked: ${succeeded}/${agents.length} agents`);
    } catch {
      toast.error("Failed to refresh health");
    } finally {
      setRefreshing(false);
    }
  }

  const activeAgents = agents.filter((a) => a.is_active);
  const fleetHealth = activeAgents.length > 0
    ? Math.round(activeAgents.reduce((sum, a) => sum + a.health_score, 0) / activeAgents.length)
    : 0;
  const totalMessages = agents.reduce((sum, a) => sum + a.total_messages, 0);
  const totalCost = agents.reduce((sum, a) => sum + (a.total_tokens * a.cost_per_token), 0);

  // Build fallback relationships
  const fallbackRelations: { from: string; fromName: string; to: string; toName: string }[] = [];
  for (const agent of agents) {
    const chain = parseFallbackChain(agent.fallback_chain);
    for (const targetId of chain) {
      const target = agents.find((a) => a.id === targetId);
      if (target) {
        fallbackRelations.push({
          from: agent.id,
          fromName: agent.name,
          to: target.id,
          toName: target.name,
        });
      }
    }
  }

  // Sparkline bars from health score: simulate last 3 checks
  function sparklineBars(agent: AgentWithStatus) {
    const score = agent.health_score;
    // Derive 3 indicative bars from score + jitter based on error_count
    const bars = [
      Math.min(100, Math.max(0, score + (agent.error_count > 2 ? -20 : 5))),
      Math.min(100, Math.max(0, score - (agent.error_count > 0 ? 10 : -3))),
      score,
    ];
    return bars.map((v, i) => {
      let color = "bg-emerald-500";
      if (v <= 50) color = "bg-red-500";
      else if (v <= 80) color = "bg-amber-500";
      return (
        <div
          key={i}
          className={cn("w-1.5 rounded-full", color)}
          style={{ height: `${Math.max(4, v * 0.2)}px` }}
        />
      );
    });
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fleet Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor all agents in a single view
          </p>
        </div>
        <Button size="sm" onClick={refreshAllHealth} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          Refresh All
        </Button>
      </div>

      {/* Fleet Health Banner */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white",
            healthBg(fleetHealth),
          )}>
            {fleetHealth}
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold">Fleet Health Score</div>
            <p className="text-sm text-muted-foreground">
              Average across {activeAgents.length} active agent{activeAgents.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold">{totalMessages.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Messages</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">${totalCost.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Total Cost</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <FleetSkeleton />
      ) : (
        <>
          {/* Agent Grid */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card key={agent.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-xs font-medium text-white",
                      getAvatarColor(agent.id),
                    )}>
                      {getInitials(agent.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{agent.name}</span>
                        <div className={cn("h-2 w-2 rounded-full shrink-0", statusDot(agent.status))} />
                      </div>
                      <Badge variant="outline" className="text-[0.625rem] mt-0.5">
                        {agent.gateway_type}
                      </Badge>
                    </div>
                    <div className="flex items-end gap-0.5 h-5">
                      {sparklineBars(agent)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{agent.total_messages} msgs</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>${(agent.total_tokens * agent.cost_per_token).toFixed(3)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Activity className="h-3.5 w-3.5" />
                      <span>{agent.avg_response_time_ms}ms avg</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Heart className={cn("h-3.5 w-3.5", healthColor(agent.health_score))} />
                      <span className={cn("font-medium", healthColor(agent.health_score))}>
                        {agent.health_score}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {agents.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-1">No agents in fleet</h3>
                  <p className="text-sm text-muted-foreground">Add agents to see fleet overview</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Incident Timeline */}
          {anomalies.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Incident Timeline
                  </h2>
                </div>
                <div className="space-y-2">
                  {anomalies.slice(0, 20).map((event) => {
                    const agent = agents.find((a) => a.id === event.agent_id);
                    return (
                      <Card key={event.id}>
                        <CardContent className="flex items-center gap-3 p-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">
                                {agent?.name ?? "Unknown Agent"}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn("text-[0.625rem]", severityBadge(event.severity))}
                              >
                                {event.severity}
                              </Badge>
                              <Badge variant="outline" className="text-[0.625rem]">
                                {event.type}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {event.description}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(event.created_at + "Z").toLocaleString()}
                          </span>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Fallback Relationships */}
          {fallbackRelations.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-blue-500" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Fallback Chains
                  </h2>
                </div>
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-3 font-medium text-muted-foreground">
                              Primary Agent
                            </th>
                            <th className="p-3" />
                            <th className="text-left p-3 font-medium text-muted-foreground">
                              Fallback Agent
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {fallbackRelations.map((rel, i) => (
                            <tr key={i} className="border-b border-border last:border-b-0">
                              <td className="p-3 font-medium">{rel.fromName}</td>
                              <td className="p-3 text-center">
                                <ArrowRight className="h-4 w-4 text-muted-foreground inline" />
                              </td>
                              <td className="p-3">{rel.toName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function FleetSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-2 w-2 rounded-full" />
                </div>
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <div className="flex items-end gap-0.5 h-5">
                <Skeleton className="w-1.5 h-2 rounded-full" />
                <Skeleton className="w-1.5 h-3 rounded-full" />
                <Skeleton className="w-1.5 h-4 rounded-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-18" />
              <Skeleton className="h-4 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
