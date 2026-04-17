"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageIntro } from "@/components/layout/page-intro";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { getAgents, createConversation } from "@/lib/api";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { toast } from "sonner";

export default function GroupsPage() {
  const router = useRouter();
  const agents = useStore((s) => s.agents);
  const setAgents = useStore((s) => s.setAgents);
  const [name, setName] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [responseMode, setResponseMode] = useState<string>("discussion");

  useEffect(() => {
    getAgents().then(setAgents).catch(() => toast.error("Failed to load agents"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleAgent(id: string) {
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (selectedAgents.size < 2) {
      toast.error("Select at least 2 agents for a group chat");
      return;
    }
    try {
      const { id } = await createConversation({
        type: "group",
        name: name.trim() || "Group Chat",
        agent_ids: Array.from(selectedAgents),
        response_mode: responseMode,
      });
      toast.success("Group chat created");
      router.push(`/chat/${id}`);
    } catch {
      toast.error("Failed to create group chat");
    }
  }

  const activeAgents = agents.filter((a) => a.is_active);
  const responseModeDescription =
    responseMode === "discussion"
      ? "Each agent sees previous replies before responding. Best for collaborative problem-solving."
      : responseMode === "parallel"
        ? "All agents respond independently at the same time. Best for collecting multiple viewpoints fast."
        : "You direct each message to a specific participant. Best for moderated or role-based conversations.";

  return (
    <div className="h-full overflow-y-auto">
      <div className="workspace-page workspace-stack max-w-6xl">
        <PageIntro
          eyebrow="Shared channels"
          title="Launch a group channel"
          description="Assemble a squad, choose how responses should flow, and open a channel that feels native to the rest of the workspace shell."
          aside={
            <div className="workspace-metric-grid">
              <div className="workspace-metric">
                <p className="workspace-metric__label">Active agents</p>
                <p className="workspace-metric__value">{activeAgents.length}</p>
                <p className="workspace-metric__hint">Available for group routing</p>
              </div>
              <div className="workspace-metric">
                <p className="workspace-metric__label">Selected</p>
                <p className="workspace-metric__value">{selectedAgents.size}</p>
                <p className="workspace-metric__hint">Need at least two to launch</p>
              </div>
            </div>
          }
        />

        <div className="workspace-panel-grid md:grid-cols-2">
        <Card className="workspace-panel surface-panel-strong">
          <CardHeader>
            <div className="space-y-2">
              <p className="workspace-eyebrow">Setup</p>
              <CardTitle className="text-base">Channel configuration</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                Name the room, decide how agents should take turns, then launch the conversation in one step.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Agent Roundtable"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="response-mode">Response Mode</Label>
              <Select value={responseMode} onValueChange={(v) => { if (v) setResponseMode(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discussion">
                    Discussion — Agents respond one at a time, seeing previous responses
                  </SelectItem>
                  <SelectItem value="parallel">
                    Parallel — All agents respond simultaneously
                  </SelectItem>
                  <SelectItem value="targeted">
                    Targeted — Address specific agents in the group
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="workspace-list-row px-4 py-3 text-sm text-muted-foreground">
                {responseModeDescription}
              </div>
            </div>

            <Button
              onClick={handleCreate}
              disabled={selectedAgents.size < 2}
              className="w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Launch channel ({selectedAgents.size} agents)
            </Button>
          </CardContent>
        </Card>

        <Card className="workspace-panel surface-panel-strong">
          <CardHeader>
            <div className="space-y-2">
              <p className="workspace-eyebrow">Roster</p>
              <CardTitle className="text-base">Select agents</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                Pick at least two active agents. The selected roster becomes the launch context for the new channel.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={cn(
                    "workspace-list-row flex w-full items-center gap-3 px-4 py-3 text-left",
                    selectedAgents.has(agent.id)
                      ? "border-[var(--theme-accent-border)] bg-[var(--theme-accent-softer)] shadow-[var(--theme-accent-shadow)]"
                      : "",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white",
                      getAvatarColor(agent.id),
                    )}
                  >
                    {getInitials(agent.name)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{agent.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[var(--text-label)] px-1.5">
                        {agent.gateway_type}
                      </Badge>
                      <span>{agent.is_active ? "Ready for routing" : "Inactive"}</span>
                    </div>
                  </div>
                  {selectedAgents.has(agent.id) && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--theme-accent)] shadow-[var(--theme-accent-shadow)]">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </button>
              ))}

              {activeAgents.length === 0 && (
                <EmptyState
                  icon={Users}
                  eyebrow="Roster"
                  title="No active agents available"
                  description="Register agents and mark them active before you create a shared conversation lane."
                  className="py-8"
                  iconClassName="h-10 w-10"
                  action={
                    <Button variant="outline" size="sm" onClick={() => router.push("/agents")}>
                      Register agents
                    </Button>
                  }
                />
              )}

              {activeAgents.length === 1 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  You need at least 2 active agents for a group chat.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
