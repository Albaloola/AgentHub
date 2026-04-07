"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot, MessageSquare, Plus, Users, Activity, ArrowRight,
  Zap, Clock, Shield, GitBranch, Brain, Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HudPanel, HudStat } from "@/components/ui/hud-panel";
import { LivingAvatar } from "@/components/ui/living-avatar";
import { useStore } from "@/lib/store";
import { getAgents, getConversations, createConversation, checkAgentHealth } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import type { AgentWithStatus } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { agents, setAgents, conversations, setConversations, updateAgentStatus } = useStore();
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    loadData();
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function loadData() {
    const [a, c] = await Promise.all([getAgents(), getConversations()]);
    setAgents(a);
    setConversations(c);
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

  return (
    <div className="starfield min-h-full">
      <div className="relative z-10 p-6 space-y-6">
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
            <Button variant="outline" size="sm" className="rounded-xl glass gap-1.5 transition-all duration-200 hover-lift" onClick={() => router.push("/agents")}>
              <Plus className="h-3.5 w-3.5" />
              New Agent
            </Button>
            <Button size="sm" className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 gap-1.5 transition-all duration-200 hover-lift animate-[luminance-pulse_3s_ease-in-out_infinite]" onClick={() => router.push("/groups")}>
              <Users className="h-3.5 w-3.5" />
              Group Chat
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <HudStat icon={<Bot className="h-4 w-4" />} label="Agents Online" value={`${onlineCount}/${agents.length}`} accent="emerald" />
          <HudStat icon={<MessageSquare className="h-4 w-4" />} label="Conversations" value={conversations.length} accent="blue" />
          <HudStat icon={<Zap className="h-4 w-4" />} label="Messages" value={totalMessages} accent="violet" />
          <HudStat icon={<Activity className="h-4 w-4" />} label="Active (24h)" value={activeConvs} accent="amber" />
        </div>

        {/* Main panels grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Agent Fleet Panel */}
          <HudPanel
            title="Agent Fleet"
            icon={<Cpu className="h-4 w-4" />}
            accent="blue"
            className="md:col-span-2"
            controls
            collapsible
            status={`${onlineCount} online`}
          >
            <div className="p-4 space-y-3">
              {agents.filter((a) => a.is_active).map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.1] hover:shadow-[0_0_16px_oklch(0.55_0.24_264/0.08)] cursor-pointer group light-sweep-hover"
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
                      <Badge variant="outline" className="text-[10px] rounded-md">{agent.gateway_type}</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground/50 mt-0.5">
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

          {/* Quick Actions Panel */}
          <HudPanel
            title="Quick Actions"
            icon={<Zap className="h-4 w-4" />}
            accent="violet"
            collapsible
          >
            <div className="p-4 space-y-2">
              {[
                { label: "Templates", desc: "Start from a template", icon: GitBranch, href: "/templates", color: "text-blue-400" },
                { label: "Playground", desc: "Test prompts", icon: Activity, href: "/playground", color: "text-violet-400" },
                { label: "Arena", desc: "Compare agents", icon: Shield, href: "/arena", color: "text-amber-400" },
                { label: "Knowledge", desc: "Manage documents", icon: Brain, href: "/knowledge", color: "text-emerald-400" },
              ].map((action) => (
                <button
                  key={action.label}
                  className="flex items-center gap-3 w-full rounded-xl border border-white/[0.04] p-3 text-left transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.08] hover:shadow-[0_0_12px_oklch(0.55_0.24_264/0.06)] light-sweep-hover"
                  onClick={() => router.push(action.href)}
                >
                  <action.icon className={cn("h-4 w-4", action.color)} />
                  <div>
                    <div className="text-sm font-medium">{action.label}</div>
                    <div className="text-[10px] text-muted-foreground/50">{action.desc}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground/30" />
                </button>
              ))}
            </div>
          </HudPanel>
        </div>

        {/* Recent Conversations */}
        {conversations.length > 0 && (
          <HudPanel
            title="Recent Conversations"
            icon={<Clock className="h-4 w-4" />}
            accent="cyan"
            controls
            collapsible
            status={`${conversations.length} total`}
          >
            <div className="p-4">
              <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {conversations.slice(0, 6).map((conv) => {
                  const agent = conv.agents[0];
                  return (
                    <button
                      key={conv.id}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.04] p-3 text-left transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.08] hover:shadow-[0_0_12px_oklch(0.55_0.24_264/0.06)] light-sweep-hover"
                      onClick={() => router.push(`/chat/${conv.id}`)}
                    >
                      {agent && (
                        <LivingAvatar name={agent.name} id={agent.id} state="idle" size="sm" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{conv.name}</div>
                        <div className="text-[10px] text-muted-foreground/50">
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
        )}

        {/* About AgentHub */}
        <HudPanel
          title="About AgentHub"
          accent="violet"
          collapsible
        >
          <div className="p-6 max-w-3xl space-y-4">
            <p className="text-base text-muted-foreground/70 leading-relaxed">
              <strong className="text-foreground font-semibold">AgentHub</strong> is a multi-agent dashboard for connecting to, chatting with, and orchestrating autonomous AI agents through their independent gateways. It serves as a pure presentation and routing layer — it doesn't run models, manage API keys, or handle inference directly.
            </p>
            <p className="text-base text-muted-foreground/60 leading-relaxed">
              The vision is to create a unified command center where you can manage your entire fleet of AI agents — from individual assistants to complex multi-agent workflows — all from one beautiful, living interface. Every interaction is designed to feel intentional, every animation purposeful.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
              <span className="text-xs text-muted-foreground/40">v0.1.0</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            </div>
            <p className="text-sm text-muted-foreground/50 text-center italic">
              Wishing you the best in your AI journey. May your agents be ever helpful. ✦
            </p>
          </div>
        </HudPanel>
      </div>
    </div>
  );
}
