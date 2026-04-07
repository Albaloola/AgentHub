"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import {
  getAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  checkAgentHealth,
  createConversation,
} from "@/lib/api";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { GATEWAY_LABELS } from "@/lib/types";
import type { Agent, AgentWithStatus, GatewayType } from "@/lib/types";
import { AgentDialog } from "@/components/agents/agent-dialog";
import { toast } from "sonner";

export default function AgentsPage() {
  const router = useRouter();
  const { agents, setAgents, updateAgentStatus } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | undefined>();
  const [checkingHealth, setCheckingHealth] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    setRefreshing(true);
    try {
      const data = await getAgents();
      setAgents(data);
    } catch {
      toast.error("Failed to load agents");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCreate(data: {
    name: string;
    gateway_type: GatewayType;
    connection_url: string;
    connection_config: string;
    avatar_url: string;
  }) {
    try {
      await createAgent(data);
      toast.success(`Agent "${data.name}" registered`);
      loadAgents();
    } catch {
      toast.error("Failed to create agent");
    }
  }

  async function handleEdit(data: {
    name: string;
    gateway_type: GatewayType;
    connection_url: string;
    connection_config: string;
    avatar_url: string;
  }) {
    if (!editingAgent) return;
    try {
      await updateAgent(editingAgent.id, data);
      toast.success("Agent updated");
      loadAgents();
    } catch {
      toast.error("Failed to update agent");
    }
    setEditingAgent(undefined);
  }

  async function handleDelete(agent: AgentWithStatus) {
    try {
      await deleteAgent(agent.id);
      setAgents(agents.filter((a) => a.id !== agent.id));
      toast.success(`Agent "${agent.name}" removed`);
    } catch {
      toast.error("Failed to delete agent");
    }
  }

  async function handleToggleActive(agent: AgentWithStatus) {
    try {
      await updateAgent(agent.id, { is_active: !agent.is_active });
      loadAgents();
    } catch {
      toast.error("Failed to toggle agent");
    }
  }

  async function handleHealthCheck(agent: AgentWithStatus) {
    setCheckingHealth((prev) => new Set(prev).add(agent.id));
    try {
      const result = await checkAgentHealth(agent.id);
      updateAgentStatus(
        agent.id,
        result.status === "ok" ? "online" : "error",
        result.latency_ms,
      );
      toast.success(`${agent.name}: ${result.status} (${result.latency_ms}ms)`);
    } catch {
      updateAgentStatus(agent.id, "error");
      toast.error(`Health check failed for ${agent.name}`);
    } finally {
      setCheckingHealth((prev) => {
        const next = new Set(prev);
        next.delete(agent.id);
        return next;
      });
    }
  }

  async function handleStartChat(agent: AgentWithStatus) {
    try {
      const { id } = await createConversation({ agent_id: agent.id });
      router.push(`/chat/${id}`);
    } catch {
      toast.error("Failed to create conversation");
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your connected agent gateways
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadAgents} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-1", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingAgent(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Register Agent
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => {
          const glowColor = agent.status === "online" ? "#10b981" : agent.status === "error" ? "#fb565b" : "#8b949e";
          return (
          <Card
            key={agent.id}
            className="relative group/card cursor-pointer"
            style={{ transition: "all 0.3s ease" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `0 0 15px ${glowColor}25, 0 0 40px ${glowColor}10`;
              e.currentTarget.style.borderColor = `${glowColor}30`;
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "";
              e.currentTarget.style.borderColor = "";
              e.currentTarget.style.transform = "";
            }}
            onClick={() => router.push(`/agents/${agent.id}`)}
          >
            <CardContent className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="relative">
                  {agent.avatar_url ? (
                    <img
                      src={agent.avatar_url}
                      alt={agent.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full text-lg font-medium text-white",
                        getAvatarColor(agent.id),
                      )}
                    >
                      {getInitials(agent.name)}
                    </div>
                  )}
                  <StatusDot status={agent.status} />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate text-foreground">{agent.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {GATEWAY_LABELS[agent.gateway_type] ?? agent.gateway_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">
                      {agent.connection_url}
                    </span>
                  </div>
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={agent.is_active}
                    onCheckedChange={() => handleToggleActive(agent)}
                    aria-label="Toggle active"
                  />
                </div>
              </div>

              {/* Status Info */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      agent.status === "online"
                        ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                        : agent.status === "busy"
                          ? "bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.5)]"
                          : agent.status === "error"
                            ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"
                            : "bg-gray-500",
                    )}
                  />
                  <span className="font-medium">{agent.status}</span>
                </div>
                {agent.latency_ms !== undefined && <span>{agent.latency_ms}ms</span>}
                {agent.last_seen && (
                  <span>Last seen: {new Date(agent.last_seen + "Z").toLocaleString()}</span>
                )}
              </div>

              {/* Actions - each button glows on hover */}
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 transition-all duration-300"
                  onClick={() => handleStartChat(agent)}
                  disabled={!agent.is_active}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 10px rgba(59,130,246,0.4), 0 0 25px rgba(59,130,246,0.15)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)"; e.currentTarget.style.color = "#60a5fa"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = ""; e.currentTarget.style.color = ""; }}
                >
                  Chat
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 transition-all duration-300"
                  onClick={() => handleHealthCheck(agent)}
                  disabled={checkingHealth.has(agent.id)}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 8px rgba(16,185,129,0.4), 0 0 20px rgba(16,185,129,0.15)"; e.currentTarget.style.borderColor = "rgba(16,185,129,0.4)"; e.currentTarget.style.color = "#34d399"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = ""; e.currentTarget.style.color = ""; }}
                >
                  {checkingHealth.has(agent.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 transition-all duration-300"
                  onClick={() => {
                    setEditingAgent(agent);
                    setDialogOpen(true);
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 8px rgba(139,92,246,0.4), 0 0 20px rgba(139,92,246,0.15)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"; e.currentTarget.style.color = "#a78bfa"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = ""; e.currentTarget.style.color = ""; }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 transition-all duration-300"
                  onClick={() => handleDelete(agent)}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 8px rgba(251,86,91,0.4), 0 0 20px rgba(251,86,91,0.15)"; e.currentTarget.style.borderColor = "rgba(251,86,91,0.4)"; e.currentTarget.style.color = "#fb7185"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = ""; e.currentTarget.style.color = ""; }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          );
        })}

        {agents.length === 0 && !refreshing && (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No agents registered yet</p>
              <Button
                className="mt-4"
                onClick={() => {
                  setEditingAgent(undefined);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Register Your First Agent
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AgentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agent={editingAgent}
        onSave={editingAgent ? handleEdit : handleCreate}
      />
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "online"
      ? "bg-emerald-500"
      : status === "busy"
        ? "bg-yellow-500"
        : status === "error"
          ? "bg-red-500"
          : "bg-gray-500";

  return (
    <div
      className={cn(
        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card",
        color,
      )}
    />
  );
}
