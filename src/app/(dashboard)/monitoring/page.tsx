"use client";

import { useEffect, useState } from "react";
import {
  Activity, RefreshCw, Wifi, WifiOff, Clock, MessageSquare, Loader2,
  Database, Trash2, Zap, HardDrive, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { getAgents, checkAgentHealth, getConversations, getCacheStats, clearCache } from "@/lib/api";
import type { CacheStats, CacheEntry } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { cn, getInitials, getAvatarColor, timeAgo } from "@/lib/utils";
import { GATEWAY_LABELS } from "@/lib/types";
import { toast } from "sonner";

export default function MonitoringPage() {
  const { agents, setAgents, updateAgentStatus, conversations, setConversations } = useStore(useShallow((s) => ({ agents: s.agents, setAgents: s.setAgents, updateAgentStatus: s.updateAgentStatus, conversations: s.conversations, setConversations: s.setConversations })));
  const [refreshing, setRefreshing] = useState(false);
  const [checkingAll, setCheckingAll] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [clearCacheOpen, setClearCacheOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setRefreshing(true);
    try {
      const [a, c] = await Promise.all([getAgents(), getConversations()]);
      setAgents(a);
      setConversations(c);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setRefreshing(false);
    }
    // Load cache stats (non-blocking)
    loadCacheData();
  }

  async function loadCacheData() {
    setCacheLoading(true);
    try {
      const data = await getCacheStats();
      setCacheStats(data.stats);
      setCacheEntries(data.entries);
    } catch {
      // Cache stats non-critical
    } finally {
      setCacheLoading(false);
    }
  }

  async function handleClearCache() {
    setClearingCache(true);
    try {
      const result = await clearCache();
      toast.success(`Cache cleared (${result.deleted_count} entries removed)`);
      setCacheStats(null);
      setCacheEntries([]);
      setClearCacheOpen(false);
      loadCacheData();
    } catch {
      toast.error("Failed to clear cache");
    } finally {
      setClearingCache(false);
    }
  }

  async function checkAll() {
    setCheckingAll(true);
    for (const agent of agents) {
      try {
        const result = await checkAgentHealth(agent.id);
        updateAgentStatus(
          agent.id,
          result.status === "ok" ? "online" : "error",
          result.latency_ms,
        );
      } catch {
        updateAgentStatus(agent.id, "error");
      }
    }
    setCheckingAll(false);
    toast.success("Health checks complete");
  }

  const onlineCount = agents.filter((a) => a.status === "online").length;
  const errorCount = agents.filter((a) => a.status === "error").length;
  const avgLatency = agents
    .filter((a) => a.latency_ms !== undefined)
    .reduce((sum, a, _, arr) => sum + (a.latency_ms ?? 0) / arr.length, 0);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time status and health of all agent gateways
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-1", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={checkAll} disabled={checkingAll}>
            {checkingAll ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-1" />
            )}
            Check All
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Wifi className="h-5 w-5 text-emerald-500" />
            <div>
              <div className="text-2xl font-bold">{onlineCount}</div>
              <div className="text-xs text-muted-foreground">Online</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <WifiOff className="h-5 w-5 text-red-500" />
            <div>
              <div className="text-2xl font-bold">{errorCount}</div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{Math.round(avgLatency)}ms</div>
              <div className="text-xs text-muted-foreground">Avg Latency</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">
                {conversations.reduce((s, c) => s + c.message_count, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Messages</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Status Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {agents.map((agent) => {
              const convCount = conversations.filter(
                (c) =>
                  c.agents.some((a) => a.id === agent.id),
              ).length;
              const msgCount = conversations
                .filter((c) => c.agents.some((a) => a.id === agent.id))
                .reduce((s, c) => s + c.message_count, 0);

              return (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white",
                      getAvatarColor(agent.id),
                    )}
                  >
                    {getInitials(agent.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{agent.name}</span>
                      <Badge variant="outline" className="text-[0.625rem]">
                        {GATEWAY_LABELS[agent.gateway_type]}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {agent.connection_url}
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="text-center">
                      <div className="font-medium text-foreground">{convCount}</div>
                      <div>chats</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-foreground">{msgCount}</div>
                      <div>msgs</div>
                    </div>
                    {agent.latency_ms !== undefined && (
                      <div className="text-center">
                        <div className="font-medium text-foreground">{agent.latency_ms}ms</div>
                        <div>latency</div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full",
                        agent.status === "online"
                          ? "bg-emerald-500"
                          : agent.status === "busy"
                            ? "bg-yellow-500"
                            : agent.status === "error"
                              ? "bg-red-500"
                              : "bg-gray-500",
                      )}
                    />
                    <span className="text-xs capitalize">{agent.status}</span>
                  </div>
                </div>
              );
            })}

            {agents.length === 0 && (
              <p className="text-center py-8 text-sm text-muted-foreground">
                No agents registered
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Response Cache Management */}
      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" /> Response Cache
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadCacheData}
                disabled={cacheLoading}
              >
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1", cacheLoading && "animate-spin")} />
                Refresh
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setClearCacheOpen(true)}
                disabled={!cacheStats || cacheStats.total_entries === 0}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear Cache
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {cacheLoading && !cacheStats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : cacheStats ? (
            <div className="space-y-5">
              {/* Cache stats */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-foreground/[0.05] p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-blue-500" />
                    <p className="text-xs text-muted-foreground">Total Entries</p>
                  </div>
                  <p className="text-lg font-semibold">{cacheStats.total_entries}</p>
                </div>
                <div className="rounded-lg border border-border bg-foreground/[0.05] p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <p className="text-xs text-muted-foreground">Hit Rate</p>
                  </div>
                  <p className="text-lg font-semibold">
                    {cacheStats.total_entries > 0
                      ? `${cacheStats.hit_rate.toFixed(1)}x`
                      : "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cacheStats.total_hits} total hits
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-foreground/[0.05] p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="h-3.5 w-3.5 text-violet-500" />
                    <p className="text-xs text-muted-foreground">Total Size</p>
                  </div>
                  <p className="text-lg font-semibold">{formatCacheSize(cacheStats.total_size_bytes)}</p>
                </div>
                <div className="rounded-lg border border-border bg-foreground/[0.05] p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-emerald-500" />
                    <p className="text-xs text-muted-foreground">Tokens Cached</p>
                  </div>
                  <p className="text-lg font-semibold">
                    {cacheStats.total_tokens.toLocaleString()}
                  </p>
                  {cacheStats.expired_count > 0 && (
                    <p className="text-xs text-amber-500">
                      {cacheStats.expired_count} expired
                    </p>
                  )}
                </div>
              </div>

              {/* Recent cache entries */}
              {cacheEntries.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recent Cache Entries</h4>
                  <div className="space-y-1.5">
                    {cacheEntries.map((entry) => {
                      const isExpired = entry.expires_at && new Date(entry.expires_at) < new Date();
                      const ttlRemaining = entry.expires_at
                        ? Math.max(0, Math.floor((new Date(entry.expires_at).getTime() - Date.now()) / 1000))
                        : null;

                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            "flex items-center gap-3 rounded-md border border-border p-2.5 text-sm",
                            isExpired && "opacity-50",
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {entry.agent_name || "Unknown Agent"}
                              </span>
                              <Badge variant="outline" className="text-[0.625rem] shrink-0">
                                {entry.hit_count} hits
                              </Badge>
                              {isExpired && (
                                <Badge variant="outline" className="text-[0.625rem] border-amber-500/30 text-amber-600 shrink-0">
                                  expired
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {entry.response_preview}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs text-muted-foreground">
                              {entry.token_count} tokens
                            </div>
                            {ttlRemaining !== null && ttlRemaining > 0 && (
                              <div className="text-xs text-muted-foreground">
                                TTL: {formatTTL(ttlRemaining)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No cache data available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Cache entries will appear here once agents start generating responses
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clear Cache Confirmation */}
      <AlertDialog open={clearCacheOpen} onOpenChange={setClearCacheOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Response Cache</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear the entire response cache? This will remove{" "}
              {cacheStats?.total_entries ?? 0} cached entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleClearCache}
              disabled={clearingCache}
            >
              {clearingCache && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Clear Cache
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatCacheSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTTL(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
