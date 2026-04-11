"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, ArrowLeft, Activity, MessageSquare, Wrench, Clock,
  TrendingUp, TrendingDown, Minus, GitBranch, Plus, Zap, AlertTriangle,
  Shield, X, ChevronUp, ChevronDown, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  getAgents, getConversations, checkAgentHealth, getCapabilities,
  getAgentPerformance, getAgentVersions, createAgentVersion, updateAgentVersionTraffic,
  updateFallbackChain,
} from "@/lib/api";
import { toast } from "sonner";
import type { AgentWithStatus, ConversationWithDetails, AgentVersion } from "@/lib/types";
import type { AgentCapabilities } from "@/lib/api";

interface PerfStats {
  avg_latency_7d: number;
  avg_latency_1d: number;
  error_rate_7d: number;
  trend: "improving" | "degrading" | "stable";
}

interface PerfSnapshot {
  latency_ms: number;
  token_count: number;
  error_occurred: boolean;
  recorded_at: string;
}

interface PerfData {
  snapshots: PerfSnapshot[];
  stats: PerfStats;
}

export default function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<AgentWithStatus | null>(null);
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [capabilities, setCapabilities] = useState<AgentCapabilities | null>(null);
  const [health, setHealth] = useState<{ status: string; latency_ms: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Performance + Versions state
  const [perfData, setPerfData] = useState<PerfData | null>(null);
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [newVersion, setNewVersion] = useState("");
  const [creatingVersion, setCreatingVersion] = useState(false);

  // Fallback chain state
  const [allAgents, setAllAgents] = useState<AgentWithStatus[]>([]);
  const [fallbackChain, setFallbackChain] = useState<string[]>([]);
  const [fallbackDirty, setFallbackDirty] = useState(false);
  const [savingFallback, setSavingFallback] = useState(false);

  useEffect(() => {
    loadAgent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadAgent() {
    setLoading(true);
    try {
      const [agents, convs, caps] = await Promise.all([
        getAgents(),
        getConversations(),
        getCapabilities(),
      ]);

      const found = agents.find((a) => a.id === id) ?? null;
      setAgent(found);
      setAllAgents(agents);

      // Parse fallback chain from agent data
      if (found) {
        try {
          const chain = JSON.parse(found.fallback_chain || "[]");
          setFallbackChain(Array.isArray(chain) ? chain : []);
        } catch {
          setFallbackChain([]);
        }
        setFallbackDirty(false);
      }

      const agentConvs = convs.filter(
        (c) => c.agent_id === id || c.agents.some((a) => a.id === id),
      );
      setConversations(agentConvs);

      const cap = caps?.find((c) => c.agent_id === id) ?? null;
      setCapabilities(cap);

      if (found) {
        try {
          const h = await checkAgentHealth(id);
          setHealth(h);
        } catch {
          setHealth(null);
        }
      }

      // Fetch performance + versions in parallel
      try {
        const [perf, vers] = await Promise.all([
          getAgentPerformance(id),
          getAgentVersions(id),
        ]);
        setPerfData(perf as PerfData);
        setVersions(vers);
      } catch {
        // Non-critical — sections will show empty states
      }
    } catch {
      router.push("/agents");
    } finally {
      setLoading(false);
    }
  }

  const handleTrafficChange = useCallback(async (versionId: string, trafficPct: number) => {
    try {
      await updateAgentVersionTraffic(id, versionId, trafficPct);
      setVersions((prev) =>
        prev.map((v) => (v.id === versionId ? { ...v, traffic_pct: trafficPct } : v)),
      );
    } catch {
      // Silently fail — could add toast later
    }
  }, [id]);

  const handleCreateVersion = useCallback(async () => {
    const trimmed = newVersion.trim();
    if (!trimmed) return;
    setCreatingVersion(true);
    try {
      await createAgentVersion(id, trimmed);
      setNewVersion("");
      // Re-fetch versions to get the full object
      const vers = await getAgentVersions(id);
      setVersions(vers);
    } catch {
      // Silently fail
    } finally {
      setCreatingVersion(false);
    }
  }, [id, newVersion]);

  const handleSaveFallbackChain = useCallback(async () => {
    setSavingFallback(true);
    try {
      await updateFallbackChain(id, fallbackChain);
      setFallbackDirty(false);
      toast.success("Fallback chain updated");
    } catch {
      toast.error("Failed to update fallback chain");
    } finally {
      setSavingFallback(false);
    }
  }, [id, fallbackChain]);

  function addToFallbackChain(agentId: string) {
    if (!fallbackChain.includes(agentId)) {
      setFallbackChain((prev) => [...prev, agentId]);
      setFallbackDirty(true);
    }
  }

  function removeFromFallbackChain(agentId: string) {
    setFallbackChain((prev) => prev.filter((a) => a !== agentId));
    setFallbackDirty(true);
  }

  function moveFallbackAgent(index: number, direction: "up" | "down") {
    const newChain = [...fallbackChain];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newChain.length) return;
    [newChain[index], newChain[targetIndex]] = [newChain[targetIndex], newChain[index]];
    setFallbackChain(newChain);
    setFallbackDirty(true);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium">Agent not found</h2>
          <Button variant="link" onClick={() => router.push("/agents")}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="fluid-narrow-width space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/agents")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full text-lg font-medium text-white",
              getAvatarColor(agent.id),
            )}
          >
            {getInitials(agent.name)}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{agent.name}</h1>
            <p className="text-sm text-muted-foreground">{agent.gateway_type}</p>
          </div>
          <div className="ml-auto">
            <Badge
              variant={agent.status === "online" ? "default" : "destructive"}
              className="gap-1"
            >
              <Activity className="h-3 w-3" />
              {agent.status}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" /> Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              {health ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={health.status === "ok" ? "default" : "destructive"}>
                      {health.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Latency</span>
                    <span>{health.latency_ms}ms</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to check health</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No conversations yet</p>
                ) : (
                  conversations.slice(0, 5).map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between text-sm cursor-pointer hover:bg-accent rounded-md px-2 py-1"
                      onClick={() => router.push(`/chat/${conv.id}`)}
                    >
                      <span className="truncate">{conv.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="h-4 w-4" /> Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {capabilities ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Streaming</span>
                    <Badge variant={capabilities.capabilities.streaming ? "default" : "secondary"}>
                      {capabilities.capabilities.streaming ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tool Calls</span>
                    <Badge variant={capabilities.capabilities.toolCalls ? "default" : "secondary"}>
                      {capabilities.capabilities.toolCalls ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thinking</span>
                    <Badge variant={capabilities.thinking ? "default" : "secondary"}>
                      {capabilities.thinking ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subagents</span>
                    <Badge variant={capabilities.subagents ? "default" : "secondary"}>
                      {capabilities.subagents ? "Yes" : "No"}
                    </Badge>
                  </div>
                  {capabilities.maxContextTokens && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Context</span>
                      <span>{capabilities.maxContextTokens.toLocaleString()} tokens</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Context Reset</span>
                    <Badge variant={capabilities.contextReset ? "default" : "secondary"}>
                      {capabilities.contextReset ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No capability data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" /> Commands
              </CardTitle>
            </CardHeader>
            <CardContent>
              {capabilities && capabilities.commands.length > 0 ? (
                <div className="space-y-1">
                  {capabilities.commands.map((cmd) => (
                    <div key={cmd.name} className="flex items-center gap-2 text-sm py-1">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{cmd.name}</code>
                      <span className="text-muted-foreground">{cmd.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No commands advertised</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Connection Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">URL</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{agent.connection_url}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active</span>
              <Badge variant={agent.is_active ? "default" : "secondary"}>
                {agent.is_active ? "Yes" : "No"}
              </Badge>
            </div>
            {agent.last_seen && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Seen</span>
                <span>{new Date(agent.last_seen).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(agent.created_at).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* ── Performance Section ── */}
        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" /> Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {perfData ? (
              <div className="space-y-5">
                {/* Stats cards row */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {/* Avg Latency */}
                  <div className="rounded-lg border border-border bg-foreground/[0.05] p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Avg Latency</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold">
                        {Math.round(perfData.stats.avg_latency_7d)}ms
                      </span>
                      <span className="text-xs text-muted-foreground">7d</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">1d:</span>
                      <span>{Math.round(perfData.stats.avg_latency_1d)}ms</span>
                      {perfData.stats.trend === "improving" && (
                        <TrendingDown className="h-3 w-3 text-[var(--status-online)]" />
                      )}
                      {perfData.stats.trend === "degrading" && (
                        <TrendingUp className="h-3 w-3 text-[var(--status-danger)]" />
                      )}
                      {perfData.stats.trend === "stable" && (
                        <Minus className="h-3 w-3 text-[var(--status-warning)]" />
                      )}
                    </div>
                  </div>

                  {/* Error Rate */}
                  <div className="rounded-lg border border-border bg-foreground/[0.05] p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Error Rate (7d)</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold">
                        {(perfData.stats.error_rate_7d * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {perfData.stats.error_rate_7d > 0.05 ? (
                        <AlertTriangle className="h-3 w-3 text-[var(--status-warning)]" />
                      ) : (
                        <Activity className="h-3 w-3 text-[var(--status-online)]" />
                      )}
                      <span>{perfData.stats.error_rate_7d > 0.05 ? "Above threshold" : "Healthy"}</span>
                    </div>
                  </div>

                  {/* Total Requests */}
                  <div className="rounded-lg border border-border bg-foreground/[0.05] p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Total Requests</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold">{perfData.snapshots.length}</span>
                      <span className="text-xs text-muted-foreground">snapshots</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      {perfData.stats.trend === "improving" && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 neon-emerald">Improving</Badge>
                      )}
                      {perfData.stats.trend === "degrading" && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">Degrading</Badge>
                      )}
                      {perfData.stats.trend === "stable" && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Stable</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Latency sparkline */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Latency Over Time</p>
                  <div className="flex items-end gap-px h-16 rounded-md border border-border bg-foreground/[0.05] p-2">
                    {(() => {
                      const latencies = perfData.snapshots.map((s) => s.latency_ms);
                      const maxLatency = Math.max(...latencies, 1);
                      return perfData.snapshots.map((snap, i) => {
                        const heightPct = (snap.latency_ms / maxLatency) * 100;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "flex-1 min-w-[2px] max-w-[6px] rounded-t-sm transition-all",
                              snap.error_occurred
                                ? "bg-[var(--status-danger)]/80"
                                : "bg-[var(--accent-blue)]/60 hover:bg-[var(--accent-blue)]/90",
                            )}
                            style={{ height: `${Math.max(heightPct, 4)}%` }}
                            title={`${snap.latency_ms}ms — ${new Date(snap.recorded_at).toLocaleString()}`}
                          />
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Error timeline */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Error Timeline</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    {perfData.snapshots.map((snap, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-2.5 w-2.5 rounded-full shrink-0",
                          snap.error_occurred
                            ? "bg-[var(--status-danger)] shadow-[0_0_4px_rgba(239,68,68,0.6)]"
                            : "bg-[var(--status-online)]/70",
                        )}
                        title={`${snap.error_occurred ? "Error" : "OK"} — ${new Date(snap.recorded_at).toLocaleString()}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No performance data available</p>
            )}
          </CardContent>
        </Card>

        {/* ── Versions Section ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <GitBranch className="h-4 w-4" /> Versions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Create new version */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. v1.2.0"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateVersion()}
                  className="flex-1 rounded-md border border-border bg-foreground/[0.05] px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button
                  size="sm"
                  onClick={handleCreateVersion}
                  disabled={creatingVersion || !newVersion.trim()}
                  className="gap-1"
                >
                  {creatingVersion ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  Create
                </Button>
              </div>

              {/* Version list */}
              {versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No versions created yet</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((ver) => (
                    <div
                      key={ver.id}
                      className="rounded-lg border border-border bg-foreground/[0.05] p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-medium">{ver.version}</code>
                          {ver.is_active ? (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 neon-emerald">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ver.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Traffic slider */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-14 shrink-0">
                          Traffic
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={ver.traffic_pct}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setVersions((prev) =>
                              prev.map((v) => (v.id === ver.id ? { ...v, traffic_pct: val } : v)),
                            );
                          }}
                          onMouseUp={(e) => handleTrafficChange(ver.id, Number((e.target as HTMLInputElement).value))}
                          onTouchEnd={(e) => handleTrafficChange(ver.id, Number((e.target as HTMLInputElement).value))}
                          className="flex-1 h-1.5 accent-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-mono w-10 text-right">
                          {ver.traffic_pct}%
                        </span>
                      </div>

                      {ver.prompt_hash && (
                        <div className="text-xs text-muted-foreground truncate">
                          Prompt hash: {ver.prompt_hash}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Fallback Chain Section ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" /> Fallback Chain
              </CardTitle>
              {fallbackDirty && (
                <Button
                  size="sm"
                  onClick={handleSaveFallbackChain}
                  disabled={savingFallback}
                  className="gap-1"
                >
                  {savingFallback ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                  Save
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                When this agent fails, requests are routed to fallback agents in order. Drag priority with arrows.
              </p>

              {/* Fallback agent list */}
              {fallbackChain.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">No fallback agents configured</p>
                  <p className="text-xs text-muted-foreground mt-1">Add agents below to create a fallback chain</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {fallbackChain.map((agentId, index) => {
                    const fbAgent = allAgents.find((a) => a.id === agentId);
                    if (!fbAgent) return null;
                    return (
                      <div
                        key={agentId}
                        className="flex items-center gap-3 rounded-lg border border-border bg-foreground/[0.05] p-3"
                      >
                        <span className="text-xs font-mono text-muted-foreground w-5 text-center shrink-0">
                          {index + 1}
                        </span>
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white",
                            getAvatarColor(fbAgent.id),
                          )}
                        >
                          {getInitials(fbAgent.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{fbAgent.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full",
                                fbAgent.status === "online"
                                  ? "bg-[var(--status-online)]"
                                  : fbAgent.status === "error"
                                    ? "bg-[var(--status-danger)]"
                                    : "bg-[var(--status-offline)]",
                              )}
                            />
                            <span className="text-xs text-muted-foreground capitalize">
                              {fbAgent.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveFallbackAgent(index, "up")}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveFallbackAgent(index, "down")}
                            disabled={index === fallbackChain.length - 1}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeFromFallbackChain(agentId)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add agent dropdown */}
              {(() => {
                const availableAgents = allAgents.filter(
                  (a) => a.id !== id && !fallbackChain.includes(a.id) && a.is_active,
                );
                if (availableAgents.length === 0) return null;
                return (
                  <Select value="" onValueChange={(v) => v && addToFallbackChain(v as string)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Add fallback agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAgents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full",
                                a.status === "online"
                                  ? "bg-[var(--status-online)]"
                                  : a.status === "error"
                                    ? "bg-[var(--status-danger)]"
                                    : "bg-[var(--status-offline)]",
                              )}
                            />
                            {a.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
