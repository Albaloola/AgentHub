"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusStyle } from "@/lib/status-colors";
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
import { FadeIn, MotionList, MotionItem } from "@/components/ui/motion-primitives";
import { GATEWAY_LABELS } from "@/lib/types";
import type { Agent, AgentWithStatus, GatewayType } from "@/lib/types";
import { AgentDialog } from "@/components/agents/agent-dialog";
import { toast } from "sonner";

export default function AgentsPage() {
  const router = useRouter();
  const agents = useStore((s) => s.agents);
  const setAgents = useStore((s) => s.setAgents);
  const updateAgentStatus = useStore((s) => s.updateAgentStatus);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | undefined>();
  const [checkingHealth, setCheckingHealth] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<AgentWithStatus | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Click outside to collapse expanded card
  useEffect(() => {
    if (!expandedAgent) return;
    function handleClickOutside(e: MouseEvent) {
      // Close if clicking outside the grid entirely
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
        setExpandedAgent(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expandedAgent]);

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
      {/* Backdrop overlay when a card is expanded */}
      {expandedAgent && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] animate-[fade-in_0.2s_ease-out]"
          onClick={() => setExpandedAgent(null)}
        />
      )}

      <FadeIn direction="up" distance={16}>
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
      </FadeIn>

      <div ref={gridRef} className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {refreshing && agents.length === 0 && (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <AgentCardSkeleton key={i} />
            ))}
          </>
        )}

        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isExpanded={expandedAgent === agent.id}
            onToggleExpand={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
            onStartChat={() => handleStartChat(agent)}
            onHealthCheck={() => handleHealthCheck(agent)}
            isCheckingHealth={checkingHealth.has(agent.id)}
            onEdit={() => { setEditingAgent(agent); setDialogOpen(true); }}
            onDelete={() => setDeletingAgent(agent)}
            onToggleActive={() => handleToggleActive(agent)}
            onViewProfile={() => router.push(`/agents/${agent.id}`)}
          />
        ))}

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

      <AlertDialog open={!!deletingAgent} onOpenChange={(open) => { if (!open) setDeletingAgent(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingAgent?.name}&quot;? This action cannot be undone. All associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deletingAgent) {
                  handleDelete(deletingAgent);
                  setDeletingAgent(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AgentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agent={editingAgent}
        onSave={editingAgent ? handleEdit : handleCreate}
      />
    </div>
  );
}

function AgentCard({
  agent,
  isExpanded,
  onToggleExpand,
  onStartChat,
  onHealthCheck,
  isCheckingHealth,
  onEdit,
  onDelete,
  onToggleActive,
  onViewProfile,
}: {
  agent: AgentWithStatus;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStartChat: () => void;
  onHealthCheck: () => void;
  isCheckingHealth: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onViewProfile: () => void;
}) {
  const glowColor = agent.status === "online" ? "#10b981" : agent.status === "error" ? "#fb565b" : "#8b949e";
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState<number | null>(null);

  // Capture card height before expanding so the placeholder holds the grid spot
  useEffect(() => {
    if (isExpanded && cardRef.current && cardHeight === null) {
      setCardHeight(cardRef.current.offsetHeight);
    }
    if (!isExpanded) {
      setCardHeight(null);
    }
  }, [isExpanded]);

  return (
    <div
      className="relative"
      style={{
        // Placeholder holds original grid height when card is lifted out
        height: isExpanded && cardHeight ? cardHeight : undefined,
        zIndex: isExpanded ? 50 : 1,
      }}
    >
      <Card
        ref={cardRef}
        className={cn(
          "group/card cursor-pointer overflow-visible transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isExpanded && "absolute inset-x-0 top-0",
        )}
        style={{
          ...(isExpanded ? {
            boxShadow: `0 0 20px ${glowColor}90, 0 0 50px ${glowColor}40, 0 0 80px ${glowColor}15`,
            borderColor: `${glowColor}70`,
            transform: "scale(1.03)",
          } : {}),
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.boxShadow = `0 0 18px ${glowColor}80, 0 0 45px ${glowColor}35, 0 0 70px ${glowColor}12`;
            e.currentTarget.style.borderColor = `${glowColor}60`;
            e.currentTarget.style.transform = "translateY(-2px)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.boxShadow = "";
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.transform = "";
          }
        }}
        onClick={onToggleExpand}
      >
        <CardContent className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="relative">
              {agent.avatar_url ? (
                <img src={agent.avatar_url} alt={agent.name} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-full text-lg font-medium text-white", getAvatarColor(agent.id))}>
                  {getInitials(agent.name)}
                </div>
              )}
              <StatusDot status={agent.status} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate text-foreground">{agent.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="text-[0.625rem]">{GATEWAY_LABELS[agent.gateway_type] ?? agent.gateway_type}</Badge>
                <span className="text-xs text-muted-foreground truncate">{agent.connection_url}</span>
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <Switch checked={agent.is_active} onCheckedChange={onToggleActive} aria-label="Toggle active" />
            </div>
          </div>

          {/* Status Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={getStatusStyle(agent.status)} />
              <span className="font-medium">{agent.status}</span>
            </div>
            {agent.latency_ms !== undefined && <span>{agent.latency_ms}ms</span>}
            {agent.last_seen && <span>Last seen: {new Date(agent.last_seen + "Z").toLocaleString()}</span>}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" className="h-11 flex-1 min-w-[7rem] transition-all duration-300 neon-blue hover:text-[var(--accent-blue)] hover:scale-105" onClick={onStartChat} disabled={!agent.is_active}>
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Chat
            </Button>
            <Button variant="outline" className="h-11 w-11 p-0 flex-shrink-0 transition-all duration-300 neon-emerald hover:text-[var(--accent-emerald)] hover:scale-105" onClick={onHealthCheck} disabled={isCheckingHealth}>
              {isCheckingHealth ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button variant="outline" className="h-11 w-11 p-0 flex-shrink-0 transition-all duration-300 neon-violet hover:text-[var(--accent-violet)] hover:scale-105" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
            <Button variant="outline" className="h-11 w-11 p-0 flex-shrink-0 transition-all duration-300 neon-rose hover:text-[var(--accent-rose)] hover:scale-105" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
          </div>

          {/* Detail panel — expands inside the card */}
          <div
            className="grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-hidden">
              <div className="border-t border-foreground/[0.06] pt-4 mt-2 space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Agent Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Gateway</span><p className="font-medium text-foreground">{GATEWAY_LABELS[agent.gateway_type] ?? agent.gateway_type}</p></div>
                  <div><span className="text-muted-foreground">Status</span><p className="font-medium text-foreground capitalize">{agent.status}</p></div>
                  <div><span className="text-muted-foreground">Messages</span><p className="font-medium text-foreground">{agent.total_messages}</p></div>
                  <div><span className="text-muted-foreground">Tokens</span><p className="font-medium text-foreground">{agent.total_tokens}</p></div>
                  <div><span className="text-muted-foreground">Avg Response</span><p className="font-medium text-foreground">{agent.avg_response_time_ms}ms</p></div>
                  <div><span className="text-muted-foreground">Errors</span><p className="font-medium text-foreground">{agent.error_count}</p></div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1 transition-all duration-300 hover-glow-violet" onClick={onEdit}>
                    <Pencil className="h-4 w-4 mr-2" />Edit Agent Settings
                  </Button>
                  <Button variant="outline" size="sm" onClick={onViewProfile} className="transition-all duration-300 hover-glow-blue">Full Profile</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AgentCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-5 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>

        {/* Status Info */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <div
      className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card"
      style={getStatusStyle(status)}
    />
  );
}
