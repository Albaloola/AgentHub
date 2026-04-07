"use client";

import { useEffect, useState } from "react";
import {
  Plus, Trash2, Loader2, Swords, Trophy, Users,
  CheckCircle2, Clock, Vote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import {
  getArenaRounds, createArenaRound, voteArenaRound,
  deleteArenaRound, getArenaLeaderboard, getAgents,
} from "@/lib/api";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import type { ArenaRound, AgentWithStatus } from "@/lib/types";
import { toast } from "sonner";

interface LeaderboardEntry {
  agent_id: string;
  agent_name: string;
  wins: number;
  total_rounds: number;
  win_rate: number;
}

export default function ArenaPage() {
  const { agents, setAgents, arenaRounds, setArenaRounds } = useStore(useShallow((s) => ({ agents: s.agents, setAgents: s.setAgents, arenaRounds: s.arenaRounds, setArenaRounds: s.setArenaRounds })));
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [rounds, a, lb] = await Promise.all([
        getArenaRounds(),
        getAgents(),
        getArenaLeaderboard(),
      ]);
      setArenaRounds(rounds);
      setAgents(a);
      setLeaderboard(lb);
    } catch {
      toast.error("Failed to load arena data");
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(roundId: string, winnerAgentId: string) {
    try {
      await voteArenaRound(roundId, winnerAgentId);
      setArenaRounds(
        arenaRounds.map((r) =>
          r.id === roundId
            ? { ...r, winner_agent_id: winnerAgentId, status: "completed" }
            : r,
        ),
      );
      const lb = await getArenaLeaderboard();
      setLeaderboard(lb);
      toast.success("Vote recorded");
    } catch {
      toast.error("Failed to record vote");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteArenaRound(id);
      setArenaRounds(arenaRounds.filter((r) => r.id !== id));
      toast.success("Round deleted");
    } catch {
      toast.error("Failed to delete round");
    }
  }

  function getAgentName(id: string): string {
    return agents.find((a) => a.id === id)?.name ?? id.slice(0, 8);
  }

  function parseAgentIds(round: ArenaRound): string[] {
    try {
      return JSON.parse(round.agents) as string[];
    } catch {
      return [];
    }
  }

  const completedRounds = arenaRounds.filter((r) => r.status === "completed");
  const uniqueAgentIds = new Set(arenaRounds.flatMap(parseAgentIds));

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Arena</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare agents head-to-head and track performance
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" />
            New Round
          </DialogTrigger>
          <CreateRoundDialog
            agents={agents}
            onCreated={(round) => {
              setArenaRounds([round, ...arenaRounds]);
              setCreateOpen(false);
            }}
          />
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Swords className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{arenaRounds.length}</div>
              <div className="text-xs text-muted-foreground">Total Rounds</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <div className="text-2xl font-bold">{completedRounds.length}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-violet-500" />
            <div>
              <div className="text-2xl font-bold">{uniqueAgentIds.size}</div>
              <div className="text-xs text-muted-foreground">Agents Evaluated</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={0}>
        <TabsList>
          <TabsTrigger value={0}>
            <Swords className="h-4 w-4 mr-1" />
            Rounds
          </TabsTrigger>
          <TabsTrigger value={1}>
            <Trophy className="h-4 w-4 mr-1" />
            Leaderboard
          </TabsTrigger>
        </TabsList>

        {/* Rounds Tab */}
        <TabsContent value={0}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : arenaRounds.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Swords className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="font-medium mb-1">No arena rounds yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a round to compare agents head-to-head
                </p>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Round
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {arenaRounds.map((round) => {
                const agentIds = parseAgentIds(round);
                const isPending = round.status !== "completed";
                return (
                  <Card key={round.id} className="overflow-hidden">
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isPending ? (
                              <Badge variant="outline" className="text-[0.625rem] border-amber-500/30 text-amber-600">
                                <Clock className="h-3 w-3 mr-0.5" />
                                pending
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[0.625rem] border-emerald-500/30 text-emerald-600">
                                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                completed
                              </Badge>
                            )}
                            {round.category && (
                              <Badge variant="outline" className="text-[0.625rem]">
                                {round.category}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm line-clamp-2">{round.prompt}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                          onClick={() => handleDelete(round.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <Separator />

                      <div className="flex flex-wrap gap-2">
                        {agentIds.map((agentId) => {
                          const isWinner = round.winner_agent_id === agentId;
                          return (
                            <div
                              key={agentId}
                              className={cn(
                                "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
                                isWinner
                                  ? "border-amber-500/40 bg-amber-500/10"
                                  : "border-border",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex h-6 w-6 items-center justify-center rounded-full text-[0.5625rem] font-medium text-white",
                                  getAvatarColor(agentId),
                                )}
                              >
                                {getInitials(getAgentName(agentId))}
                              </div>
                              <span>{getAgentName(agentId)}</span>
                              {isWinner && (
                                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                              )}
                              {isPending && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs ml-1"
                                  onClick={() => handleVote(round.id, agentId)}
                                >
                                  <Vote className="h-3 w-3 mr-0.5" />
                                  Vote
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value={1}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : leaderboard.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Trophy className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="font-medium mb-1">No leaderboard data</h3>
                <p className="text-sm text-muted-foreground">
                  Complete some arena rounds to see agent rankings
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Agent</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Wins</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Rounds</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard
                      .sort((a, b) => b.wins - a.wins)
                      .map((entry, idx) => (
                        <tr
                          key={entry.agent_id}
                          className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors"
                        >
                          <td className="p-3 font-medium text-muted-foreground">
                            {idx + 1}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-full text-[0.625rem] font-medium text-white",
                                  getAvatarColor(entry.agent_id),
                                )}
                              >
                                {getInitials(entry.agent_name)}
                              </div>
                              <span className="font-medium">{entry.agent_name}</span>
                              {idx === 0 && (
                                <Trophy className="h-4 w-4 text-amber-500" />
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center font-medium">
                            {entry.wins}
                          </td>
                          <td className="p-3 text-center text-muted-foreground">
                            {entry.total_rounds}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[7.5rem]">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${Math.round(entry.win_rate * 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-10 text-right">
                                {Math.round(entry.win_rate * 100)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateRoundDialog({
  agents,
  onCreated,
}: {
  agents: AgentWithStatus[];
  onCreated: (round: ArenaRound) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleAgent(agentId: string) {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId],
    );
  }

  async function handleSave() {
    if (!prompt.trim()) {
      toast.error("Prompt is required");
      return;
    }
    if (selectedAgents.length < 2) {
      toast.error("Select at least 2 agents");
      return;
    }
    setSaving(true);
    try {
      const result = await createArenaRound(
        prompt.trim(),
        selectedAgents,
        category.trim() || undefined,
      );
      onCreated({
        id: result.id,
        prompt: prompt.trim(),
        category: category.trim() || null,
        agents: JSON.stringify(selectedAgents),
        results: "{}",
        winner_agent_id: null,
        status: "pending",
        created_at: new Date().toISOString(),
      });
      toast.success("Arena round created");
    } catch {
      toast.error("Failed to create round");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create Arena Round</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Prompt</Label>
          <Textarea
            placeholder="Enter a prompt for the agents to respond to..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
          />
        </div>

        <div>
          <Label>Category (optional)</Label>
          <Input
            placeholder="e.g. coding, creative, reasoning"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        <Separator />

        <div>
          <Label className="mb-2 block">
            Select Agents ({selectedAgents.length} selected)
          </Label>
          <div className="space-y-2">
            {agents.filter((a) => a.is_active).map((agent) => {
              const isSelected = selectedAgents.includes(agent.id);
              return (
                <div
                  key={agent.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer transition-colors",
                    isSelected
                      ? "bg-accent border-primary/30"
                      : "hover:bg-accent/30",
                  )}
                  onClick={() => toggleAgent(agent.id)}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-[0.625rem] font-medium text-white",
                      getAvatarColor(agent.id),
                    )}
                  >
                    {getInitials(agent.name)}
                  </div>
                  <span className="flex-1 text-sm">{agent.name}</span>
                  {isSelected && (
                    <Badge variant="outline" className="text-[0.625rem]">
                      selected
                    </Badge>
                  )}
                </div>
              );
            })}
            {agents.filter((a) => a.is_active).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active agents available
              </p>
            )}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={handleSave}
          disabled={saving || !prompt.trim() || selectedAgents.length < 2}
        >
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Create Round
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
