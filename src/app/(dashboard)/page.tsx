"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  MessageSquare,
  Activity,
  TrendingUp,
  Zap,
  ArrowRight,
  Plus,
  Users,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAgents, getConversations, createConversation } from "@/lib/api";
import { cn, getInitials, getAvatarColor, timeAgo } from "@/lib/utils";
import { FadeIn, MotionList, MotionItem } from "@/components/ui/motion-primitives";
import { toast } from "sonner";
import type { AgentWithStatus, ConversationWithDetails } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentWithStatus[]>([]);
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [agentsData, convsData] = await Promise.all([
        getAgents(),
        getConversations(),
      ]);
      setAgents(agentsData);
      setConversations(convsData.slice(0, 10));
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  const onlineAgents = agents.filter((a) => a.status === "online");
  const activeAgents = agents.filter((a) => a.is_active);
  const totalMessages = agents.reduce((sum, a) => sum + (a.total_messages || 0), 0);
  const totalTokens = agents.reduce((sum, a) => sum + (a.total_tokens || 0), 0);

  async function handleQuickChat(agentId: string) {
    try {
      const { id } = await createConversation({ agent_id: agentId });
      router.push(`/chat/${id}`);
    } catch {
      toast.error("Failed to create conversation");
    }
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-rounded p-4 md:p-6 space-y-8">
      <FadeIn direction="up" distance={16}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
            <p className="text-muted-foreground mt-2">
              Overview of your agents, recent activity, and system health
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/agents")}>
              <Bot className="h-4 w-4 mr-2" />
              Manage Agents
            </Button>
            <Button onClick={() => router.push("/agents")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Agent
            </Button>
          </div>
        </div>
      </FadeIn>

      <FadeIn direction="up" distance={16} delay={0.1}>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Agents"
            value={agents.length}
            subtitle={`${onlineAgents.length} online`}
            icon={Bot}
            trend={onlineAgents.length > 0 ? "+active" : undefined}
            loading={loading}
            href="/agents"
            color="blue"
          />
          <StatCard
            title="Active Agents"
            value={activeAgents.length}
            subtitle={`${Math.round((activeAgents.length / Math.max(agents.length, 1)) * 100)}% enabled`}
            icon={Zap}
            loading={loading}
            href="/agents"
            color="amber"
          />
          <StatCard
            title="Total Messages"
            value={formatNumber(totalMessages)}
            subtitle="Across all agents"
            icon={MessageSquare}
            loading={loading}
            href="/analytics"
            color="emerald"
          />
          <StatCard
            title="Tokens Processed"
            value={formatNumber(totalTokens)}
            subtitle="Lifetime usage"
            icon={BarChart3}
            loading={loading}
            href="/analytics"
            color="violet"
          />
        </div>
      </FadeIn>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <FadeIn direction="up" distance={16} delay={0.2} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-400" />
                  Agent Status
                </CardTitle>
              </div>
              <Link
                href="/agents"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : agents.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No agents registered yet</p>
                  <Button className="mt-4" onClick={() => router.push("/agents")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Register Your First Agent
                  </Button>
                </div>
              ) : (
                <MotionList className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded pr-2">
                  {agents.slice(0, 6).map((agent) => (
                    <MotionItem key={agent.id}>
                      <div
                        className="flex items-center gap-4 p-3 rounded-lg border border-foreground/[0.06] hover:border-foreground/[0.12] hover:bg-foreground/[0.02] transition-all cursor-pointer group"
                        onClick={() => router.push(`/agents/${agent.id}`)}
                      >
                        <div className="relative">
                          {agent.avatar_url ? (
                            <img
                              src={agent.avatar_url}
                              alt={agent.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white",
                                getAvatarColor(agent.id)
                              )}
                            >
                              {getInitials(agent.name)}
                            </div>
                          )}
                          <div
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                              agent.status === "online" && "bg-emerald-500",
                              agent.status === "error" && "bg-rose-500",
                              agent.status === "offline" && "bg-slate-500"
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{agent.name}</span>
                            {!agent.is_active && (
                              <Badge variant="secondary" className="text-[0.625rem]">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="capitalize">{agent.status}</span>
                            {agent.latency_ms !== undefined && (
                              <span>{agent.latency_ms}ms</span>
                            )}
                            {agent.total_messages > 0 && (
                              <span>{agent.total_messages} msgs</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickChat(agent.id);
                          }}
                          disabled={!agent.is_active}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                      </div>
                    </MotionItem>
                  ))}
                </MotionList>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn direction="up" distance={16} delay={0.3}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-400" />
                  Recent Activity
                </CardTitle>
              </div>
              <Link
                href="/search"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Search <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No conversations yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push("/agents")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Start a Chat
                  </Button>
                </div>
              ) : (
                <MotionList className="space-y-3">
                  {conversations.map((conv) => (
                    <MotionItem key={conv.id}>
                      <Link
                        href={`/chat/${conv.id}`}
                        className="block p-3 rounded-lg border border-foreground/[0.06] hover:border-foreground/[0.12] hover:bg-foreground/[0.02] transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">
                              {conv.name || "Untitled Conversation"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {conv.agents?.[0]?.name || "Unknown Agent"}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {timeAgo(conv.updated_at)}
                          </span>
                        </div>
                        {conv.summary && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {conv.summary}
                          </p>
                        )}
                      </Link>
                    </MotionItem>
                  ))}
                </MotionList>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <FadeIn direction="up" distance={16} delay={0.4}>
        <Card className="border-dashed">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/20">
                <Sparkles className="h-6 w-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Quick Actions</h3>
                <p className="text-sm text-muted-foreground">
                  Jump to common tasks and workflows
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => router.push("/agents")}>
                  <Bot className="h-4 w-4 mr-2" />
                  Agents
                </Button>
                <Button variant="outline" onClick={() => router.push("/groups")}>
                  <Users className="h-4 w-4 mr-2" />
                  Group Chats
                </Button>
                <Button variant="outline" onClick={() => router.push("/analytics")}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
                <Button variant="outline" onClick={() => router.push("/playground")}>
                  <Zap className="h-4 w-4 mr-2" />
                  Playground
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  loading,
  href,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: string;
  loading: boolean;
  href: string;
  color: "blue" | "amber" | "emerald" | "violet" | "rose" | "cyan";
}) {
  const colorClasses = {
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400",
    amber: "from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400",
    emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400",
    violet: "from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400",
    rose: "from-rose-500/20 to-rose-600/10 border-rose-500/20 text-rose-400",
    cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/20 text-cyan-400",
  };

  return (
    <Link href={href} className="block">
      <Card className="hover:border-foreground/[0.12] transition-all cursor-pointer group">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {loading ? (
                <Skeleton className="h-8 w-24 mt-2" />
              ) : (
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-2xl font-bold">{value}</p>
                  {trend && (
                    <span className="text-xs text-emerald-400 font-medium">
                      {trend}
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            </div>
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br border",
                colorClasses[color]
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}
