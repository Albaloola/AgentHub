"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bot, MessageSquare, Plus, Users, Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { getAgents, getConversations, createConversation } from "@/lib/api";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import type { AgentWithStatus } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { agents, setAgents, conversations, setConversations } = useStore();

  useEffect(() => {
    loadData();
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

  const onlineCount = agents.filter((a) => a.status === "online").length;
  const totalMessages = conversations.reduce((sum, c) => sum + c.message_count, 0);

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and chat with your connected agents
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard icon={Bot} label="Total Agents" value={agents.length} />
        <StatCard
          icon={Activity}
          label="Online"
          value={onlineCount}
          accent="text-emerald-500"
        />
        <StatCard icon={MessageSquare} label="Conversations" value={conversations.length} />
        <StatCard icon={Users} label="Total Messages" value={totalMessages} />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => router.push("/agents")}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/10">
              <Plus className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Register Agent</h3>
              <p className="text-sm text-muted-foreground">Connect a new agent gateway</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => router.push("/groups")}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-600/10">
              <Users className="h-6 w-6 text-violet-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Create Group Chat</h3>
              <p className="text-sm text-muted-foreground">Orchestrate multiple agents</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Agent Quick-Chat Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Chat</h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {agents.filter((a) => a.is_active).map((agent) => (
            <Card
              key={agent.id}
              className="hover:bg-accent/30 transition-colors cursor-pointer"
              onClick={() => startChat(agent)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className="relative">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white",
                      getAvatarColor(agent.id),
                    )}
                  >
                    {getInitials(agent.name)}
                  </div>
                  <StatusDot status={agent.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{agent.name}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {agent.gateway_type}
                    </Badge>
                    {agent.latency_ms !== undefined && (
                      <span className="text-[10px] text-muted-foreground">
                        {agent.latency_ms}ms
                      </span>
                    )}
                  </div>
                </div>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}

          {agents.filter((a) => a.is_active).length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Bot className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No active agents.{" "}
                  <button
                    className="text-blue-500 hover:underline"
                    onClick={() => router.push("/agents")}
                  >
                    Register one
                  </button>
                  .
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={cn("h-5 w-5", accent ?? "text-muted-foreground")} />
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
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
        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
        color,
      )}
    />
  );
}
