"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Activity, MessageSquare, Wrench, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { getAgents, getConversations, checkAgentHealth, getCapabilities } from "@/lib/api";
import type { AgentWithStatus, ConversationWithDetails } from "@/lib/types";
import type { AgentCapabilities } from "@/lib/api";

export default function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<AgentWithStatus | null>(null);
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [capabilities, setCapabilities] = useState<AgentCapabilities | null>(null);
  const [health, setHealth] = useState<{ status: string; latency_ms: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgent();
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
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
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
          <Button variant="link" onClick={() => router.push("/")}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
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
      </div>
    </ScrollArea>
  );
}
