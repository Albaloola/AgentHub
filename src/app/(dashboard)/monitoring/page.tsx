"use client";

import { useEffect, useState } from "react";
import {
  Activity, RefreshCw, Wifi, WifiOff, Clock, MessageSquare, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { getAgents, checkAgentHealth, getConversations } from "@/lib/api";
import { cn, getInitials, getAvatarColor, timeAgo } from "@/lib/utils";
import { GATEWAY_LABELS } from "@/lib/types";
import { toast } from "sonner";

export default function MonitoringPage() {
  const { agents, setAgents, updateAgentStatus, conversations, setConversations } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [checkingAll, setCheckingAll] = useState(false);

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
                      <Badge variant="outline" className="text-[10px]">
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
    </div>
  );
}
