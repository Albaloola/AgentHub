"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bot, MessageSquare, Plus, Users, Activity, ArrowRight,
  Zap, Clock, Shield, GitBranch, Brain, Cpu, GripVertical, Lock, Unlock, LayoutGrid, LayoutList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HudPanel, HudStat } from "@/components/ui/hud-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { LivingAvatar } from "@/components/ui/living-avatar";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { getAgents, getConversations, createConversation, checkAgentHealth } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import type { AgentWithStatus } from "@/lib/types";
import { Responsive } from "react-grid-layout";
import "react-grid-layout/css/styles.css";

const DEFAULT_LAYOUTS = {
  lg: [
    { i: "stats", x: 0, y: 0, w: 12, h: 2, isResizable: false },
    { i: "fleet", x: 0, y: 2, w: 8, h: 6, minW: 4, minH: 3 },
    { i: "actions", x: 8, y: 2, w: 4, h: 6, minW: 3, minH: 3 },
    { i: "recent", x: 0, y: 8, w: 12, h: 5, minW: 6, minH: 3 },
  ],
  md: [
    { i: "stats", x: 0, y: 0, w: 10, h: 2, isResizable: false },
    { i: "fleet", x: 0, y: 2, w: 6, h: 6, minW: 4, minH: 3 },
    { i: "actions", x: 6, y: 2, w: 4, h: 6, minW: 3, minH: 3 },
    { i: "recent", x: 0, y: 8, w: 10, h: 5, minW: 4, minH: 3 },
  ],
  sm: [
    { i: "stats", x: 0, y: 0, w: 6, h: 2, isResizable: false },
    { i: "fleet", x: 0, y: 2, w: 6, h: 6, minW: 3, minH: 3 },
    { i: "actions", x: 0, y: 8, w: 6, h: 5, minW: 3, minH: 3 },
    { i: "recent", x: 0, y: 13, w: 6, h: 5, minW: 3, minH: 3 },
  ],
};

function loadLayouts(): typeof DEFAULT_LAYOUTS {
  try {
    const stored = localStorage.getItem("agenthub-dashboard-layouts");
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_LAYOUTS;
}

function saveLayouts(layouts: typeof DEFAULT_LAYOUTS) {
  try {
    localStorage.setItem("agenthub-dashboard-layouts", JSON.stringify(layouts));
  } catch {}
}

export default function HomePage() {
  const router = useRouter();
  const { agents, setAgents, conversations, setConversations, updateAgentStatus } = useStore(useShallow((s) => ({ agents: s.agents, setAgents: s.setAgents, conversations: s.conversations, setConversations: s.setConversations, updateAgentStatus: s.updateAgentStatus })));
  const [gridLocked, setGridLocked] = useState(true);
  const [fleetView, setFleetView] = useState<"list" | "grid">("list");
  const [layouts, setLayouts] = useState(DEFAULT_LAYOUTS);
  const [time, setTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1024);

  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setLayouts(loadLayouts());
  }, []);

  useEffect(() => {
    loadData();
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLayoutChange = useCallback((_layout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    saveLayouts(allLayouts);
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([getAgents(), getConversations()]);
      setAgents(a);
      setConversations(c);
    } finally {
      setLoading(false);
    }
  }

  async function startChat(agent: AgentWithStatus) {
    const { id } = await createConversation({ agent_id: agent.id });
    router.push(`/chat/${id}`);
  }

  async function pingAgent(agent: AgentWithStatus) {
    try {
      const result = await checkAgentHealth(agent.id);
      updateAgentStatus(agent.id, result.status === "ok" ? "online" : "error", result.latency_ms);
    } catch {
      updateAgentStatus(agent.id, "error");
    }
  }

  const onlineCount = agents.filter((a) => a.status === "online").length;
  const totalMessages = conversations.reduce((sum, c) => sum + c.message_count, 0);
  const activeConvs = conversations.filter((c) => {
    const updated = new Date(c.updated_at + "Z");
    return Date.now() - updated.getTime() < 24 * 60 * 60 * 1000;
  }).length;

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-full">
      <div className="relative z-10 p-6 space-y-4">
        {/* Mission control header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">Mission Control</h1>
            <p className="text-sm text-muted-foreground/60 mt-0.5">
              {time ? (
                <>
                  {time.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  {" "}
                  <span className="tabular-nums">{time.toLocaleTimeString()}</span>
                </>
              ) : (
                <span className="tabular-nums">--:--:--</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "rounded-xl gap-1.5 transition-all duration-200",
                gridLocked ? "text-muted-foreground" : "glass neon-action text-blue-400",
              )}
              onClick={() => setGridLocked(!gridLocked)}
              title={gridLocked ? "Unlock grid to rearrange panels" : "Lock grid layout"}
              aria-label={gridLocked ? "Unlock grid layout" : "Lock grid layout"}
            >
              {gridLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              {gridLocked ? "Locked" : "Editing"}
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl glass neon-action gap-1.5 transition-all duration-200 hover-lift" onClick={() => router.push("/agents")}>
              <Plus className="h-3.5 w-3.5" />
              New Agent
            </Button>
            <Button size="sm" className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 neon-action gap-1.5 transition-all duration-200 hover-lift" onClick={() => router.push("/groups")}>
              <Users className="h-3.5 w-3.5" />
              Group Chat
            </Button>
          </div>
        </div>

        {/* Draggable grid */}
        <div ref={gridContainerRef}>
        <Responsive
          className="dashboard-grid"
          width={containerWidth}
          layouts={layouts}
          breakpoints={{ lg: 1024, md: 768, sm: 0 }}
          cols={{ lg: 12, md: 10, sm: 6 }}
          rowHeight={60}
          margin={[16, 16] as [number, number]}
          containerPadding={[0, 0] as [number, number]}
          dragConfig={{ enabled: !gridLocked, handle: ".panel-drag-header", cancel: "button, a, input" }}
          resizeConfig={{ enabled: !gridLocked, handles: ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const }}
          onLayoutChange={handleLayoutChange}
        >
          {/* Stats row */}
          <div key="stats">
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 h-full">
              <HudStat icon={<Bot className="h-4 w-4" />} label="Agents Online" value={`${onlineCount}/${agents.length}`} accent="emerald" />
              <HudStat icon={<MessageSquare className="h-4 w-4" />} label="Conversations" value={conversations.length} accent="blue" />
              <HudStat icon={<Zap className="h-4 w-4" />} label="Messages" value={totalMessages} accent="violet" />
              <HudStat icon={<Activity className="h-4 w-4" />} label="Active (24h)" value={activeConvs} accent="amber" />
            </div>
          </div>

          {/* Agent Fleet Panel */}
          <div key="fleet">
            <HudPanel
              title="Agent Fleet"
              icon={<Cpu className="h-4 w-4" />}
              accent="blue"
              collapsible
              status={`${onlineCount} online`}
              className="h-full"
              badge={
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-md"
                    onClick={(e) => { e.stopPropagation(); setFleetView(fleetView === "list" ? "grid" : "list"); }}
                    title={fleetView === "list" ? "Grid view" : "List view"}
                    aria-label={fleetView === "list" ? "Switch to grid view" : "Switch to list view"}
                  >
                    {fleetView === "list" ? <LayoutGrid className="h-3 w-3" /> : <LayoutList className="h-3 w-3" />}
                  </Button>
                  {!gridLocked && <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 cursor-grab" />}
                </div>
              }
            >
              <div className={cn("p-4 overflow-y-auto scrollbar-hidden", fleetView === "list" ? "space-y-3" : "grid grid-cols-2 gap-3")} style={{ maxHeight: "calc(100% - 40px)" }}>
                {agents.filter((a) => a.is_active).map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3 transition-all duration-300 hover:bg-foreground/[0.04] hover:border-foreground/[0.1] hover:shadow-[0_0_16px_oklch(0.55_0.24_264/0.08)] cursor-pointer group light-sweep-hover"
                    onClick={() => startChat(agent)}
                  >
                    <LivingAvatar
                      name={agent.name}
                      id={agent.id}
                      state={agent.status === "online" ? "idle" : agent.status === "error" ? "error" : "offline"}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{agent.name}</span>
                        <span
                          className={cn(
                            "inline-block h-2 w-2 rounded-full shrink-0",
                            agent.health_score > 80
                              ? "bg-emerald-500 shadow-[0_0_4px_theme(colors.emerald.500/0.5)]"
                              : agent.health_score >= 50
                                ? "bg-yellow-500 shadow-[0_0_4px_theme(colors.yellow.500/0.5)]"
                                : "bg-red-500 shadow-[0_0_4px_theme(colors.red.500/0.5)]",
                          )}
                          title={`Health: ${agent.health_score}/100`}
                        />
                        <Badge variant="outline" className="text-[0.625rem] rounded-md">{agent.gateway_type}</Badge>
                      </div>
                      <div className="text-[0.6875rem] text-muted-foreground/50 mt-0.5">
                        {agent.total_messages} messages
                        {agent.latency_ms !== undefined && <span className="ml-2">{agent.latency_ms}ms</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); pingAgent(agent); }}
                      >
                        Ping
                      </Button>
                      <MessageSquare className="h-4 w-4 text-muted-foreground/40 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </div>
                ))}

                {agents.filter((a) => a.is_active).length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground/50">
                    No agents registered.
                    <button className="text-blue-400 ml-1 hover:underline" onClick={() => router.push("/agents")}>
                      Add one
                    </button>
                  </div>
                )}
              </div>
            </HudPanel>
          </div>

          {/* Quick Actions Panel */}
          <div key="actions">
            <HudPanel
              title="Quick Actions"
              icon={<Zap className="h-4 w-4" />}
              accent="violet"
              collapsible
              className="h-full"
              badge={!gridLocked ? <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 cursor-grab grid-drag-handle" /> : undefined}
            >
              <div className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100% - 40px)" }}>
                {[
                  { label: "Templates", desc: "Start from a template", icon: GitBranch, href: "/templates", color: "text-blue-400" },
                  { label: "Playground", desc: "Test prompts", icon: Activity, href: "/playground", color: "text-violet-400" },
                  { label: "Arena", desc: "Compare agents", icon: Shield, href: "/arena", color: "text-amber-400" },
                  { label: "Knowledge", desc: "Manage documents", icon: Brain, href: "/knowledge", color: "text-emerald-400" },
                ].map((action) => (
                  <button
                    key={action.label}
                    className="flex items-center gap-3 w-full rounded-xl border border-foreground/[0.04] p-3 text-left transition-all duration-300 hover:bg-foreground/[0.04] hover:border-foreground/[0.08] hover:shadow-[0_0_12px_oklch(0.55_0.24_264/0.06)] light-sweep-hover"
                    onClick={() => router.push(action.href)}
                  >
                    <action.icon className={cn("h-4 w-4", action.color)} />
                    <div>
                      <div className="text-sm font-medium">{action.label}</div>
                      <div className="text-[0.625rem] text-muted-foreground/50">{action.desc}</div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground/30" />
                  </button>
                ))}
              </div>
            </HudPanel>
          </div>

          {/* Recent Conversations */}
          <div key="recent">
            <HudPanel
              title="Recent Conversations"
              icon={<Clock className="h-4 w-4" />}
              accent="cyan"
              collapsible
              status={`${conversations.length} total`}
              className="h-full"
              badge={!gridLocked ? <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 cursor-grab grid-drag-handle" /> : undefined}
            >
              <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(100% - 40px)" }}>
                <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {conversations.slice(0, 6).map((conv) => {
                    const agent = conv.agents[0];
                    return (
                      <button
                        key={conv.id}
                        className="flex items-center gap-3 rounded-xl border border-foreground/[0.04] p-3 text-left transition-all duration-300 hover:bg-foreground/[0.04] hover:border-foreground/[0.08] hover:shadow-[0_0_12px_oklch(0.55_0.24_264/0.06)] light-sweep-hover"
                        onClick={() => router.push(`/chat/${conv.id}`)}
                      >
                        {agent && (
                          <LivingAvatar name={agent.name} id={agent.id} state="idle" size="sm" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{conv.name}</div>
                          <div className="text-[0.625rem] text-muted-foreground/50">
                            {conv.message_count} msgs
                            <span className="mx-1">.</span>
                            {timeAgo(conv.updated_at)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </HudPanel>
          </div>
        </Responsive>
        </div>

        {/* Version footer */}
        <div className="flex items-center gap-2 pt-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />
          <span className="text-[0.625rem] text-muted-foreground/30">AgentHub v0.1.0</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-full">
      <div className="relative z-10 p-6 space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-xl" />
            <Skeleton className="h-8 w-28 rounded-xl" />
            <Skeleton className="h-8 w-28 rounded-xl" />
          </div>
        </div>

        {/* Stats row skeleton */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-card/60 backdrop-blur-sm p-4"
            >
              <Skeleton className="h-4 w-4 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>

        {/* Main panels skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Fleet panel skeleton */}
          <div className="md:col-span-2 rounded-2xl border border-foreground/[0.06] bg-card/80 backdrop-blur-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-foreground/[0.04]">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] p-3"
                >
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-7 w-12 rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions panel skeleton */}
          <div className="rounded-2xl border border-foreground/[0.06] bg-card/80 backdrop-blur-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-foreground/[0.04]">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-foreground/[0.04] p-3"
                >
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-2.5 w-28" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent conversations skeleton */}
        <div className="rounded-2xl border border-foreground/[0.06] bg-card/80 backdrop-blur-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-foreground/[0.04]">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="p-4">
            <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-foreground/[0.04] p-3"
                >
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
