"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Group Chat</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select multiple agents to orchestrate a group conversation
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
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
              <p className="text-xs text-muted-foreground">
                {responseMode === "discussion" &&
                  "Each agent sees all previous responses before replying. Good for collaborative problem-solving."}
                {responseMode === "parallel" &&
                  "All agents respond at the same time without seeing each other's responses. Good for independent opinions."}
                {responseMode === "targeted" &&
                  "You choose which agent to address each message to. Good for moderated conversations."}
              </p>
            </div>

            <Button
              onClick={handleCreate}
              disabled={selectedAgents.size < 2}
              className="w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Create Group Chat ({selectedAgents.size} agents)
            </Button>
          </CardContent>
        </Card>

        {/* Agent Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    selectedAgents.has(agent.id)
                      ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/10"
                      : "border-border hover:bg-accent/50",
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
                    <div className="text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[0.625rem] px-1">
                        {agent.gateway_type}
                      </Badge>
                    </div>
                  </div>
                  {selectedAgents.has(agent.id) && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-blue)]">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </button>
              ))}

              {activeAgents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No active agents available.
                  <br />
                  <button
                    className="text-[var(--accent-blue)] hover:underline mt-1"
                    onClick={() => router.push("/agents")}
                  >
                    Register agents first
                  </button>
                </div>
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
  );
}
