"use client";

import { useEffect, useState } from "react";
import {
  Plus, Globe, Trash2, Loader2, Copy, Eye, EyeOff,
  Network, Info, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { getA2ACards, publishA2ACard, updateA2ACard, deleteA2ACard, getAgents } from "@/lib/api";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import type { A2AAgentCard, AgentWithStatus } from "@/lib/types";
import { toast } from "sonner";

type CardWithName = A2AAgentCard & { agent_name?: string };

export default function A2APage() {
  const agents = useStore((s) => s.agents);
  const setAgents = useStore((s) => s.setAgents);
  const [cards, setCards] = useState<CardWithName[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [c, a] = await Promise.all([getA2ACards(), getAgents()]);
      setCards(c);
      setAgents(a);
    } catch {
      toast.error("Failed to load A2A cards");
    } finally {
      setLoading(false);
    }
  }

  async function handleTogglePublished(card: CardWithName) {
    try {
      await updateA2ACard(card.id, { is_published: !card.is_published });
      setCards((prev) =>
        prev.map((c) =>
          c.id === card.id ? { ...c, is_published: !c.is_published } : c,
        ),
      );
      toast.success(card.is_published ? "Card unpublished" : "Card published");
    } catch {
      toast.error("Failed to update card");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteA2ACard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
      toast.success("Agent card deleted");
    } catch {
      toast.error("Failed to delete card");
    }
  }

  function copyEndpoint(url: string | null) {
    if (!url) return;
    navigator.clipboard.writeText(window.location.origin + url);
    toast.success("Endpoint URL copied");
  }

  function formatCardJson(jsonStr: string): string {
    try {
      return JSON.stringify(JSON.parse(jsonStr), null, 2);
    } catch {
      return jsonStr;
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">A2A Agent Cards</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Publish and manage Agent-to-Agent protocol cards
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" />
            Publish Card
          </DialogTrigger>
          <PublishCardDialog
            agents={agents}
            existingAgentIds={cards.map((c) => c.agent_id)}
            onPublished={(card) => {
              setCards((prev) => [card, ...prev]);
              setCreateOpen(false);
            }}
          />
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Network className="h-5 w-5 text-[var(--accent-blue)]" />
            <div>
              <div className="text-2xl font-bold">{cards.length}</div>
              <div className="text-xs text-muted-foreground">Total Cards</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Globe className="h-5 w-5 text-[var(--status-online)]" />
            <div>
              <div className="text-2xl font-bold">
                {cards.filter((c) => c.is_published).length}
              </div>
              <div className="text-xs text-muted-foreground">Published</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <EyeOff className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">
                {cards.filter((c) => !c.is_published).length}
              </div>
              <div className="text-xs text-muted-foreground">Unpublished</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info section */}
      <Card className="border-[var(--accent-blue)]/20 bg-[var(--accent-blue)]/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="h-5 w-5 text-[var(--accent-blue)] mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">About A2A Protocol</p>
            <p>
              Agent-to-Agent (A2A) is a protocol that enables AI agents to discover and
              communicate with each other. An Agent Card describes an agent&apos;s capabilities,
              endpoint, and supported interaction patterns. Published cards are discoverable
              by other agents in the network.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : cards.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Network}
              title="No agent cards yet"
              description="Publish an A2A card to make an agent discoverable by other agents"
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Publish Card
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => {
            const agentName = card.agent_name || "Unknown Agent";
            return (
              <Card key={card.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-caption)] font-medium text-white shrink-0",
                        getAvatarColor(card.agent_id),
                      )}
                    >
                      {getInitials(agentName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium">{agentName}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[var(--text-label)]",
                            card.is_published
                              ? "border-[var(--status-online)]/30 text-[var(--status-online)]"
                              : "border-muted-foreground/30 text-muted-foreground",
                          )}
                        >
                          {card.is_published ? "published" : "unpublished"}
                        </Badge>
                      </div>
                      {card.endpoint_url && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ExternalLink className="h-3 w-3" />
                          <span className="truncate">{card.endpoint_url}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 ml-1"
                            onClick={() => copyEndpoint(card.endpoint_url)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPreviewId(previewId === card.id ? null : card.id)}
                        title="Preview card JSON"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={card.is_published}
                        onCheckedChange={() => handleTogglePublished(card)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(card.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Card JSON preview */}
                  {previewId === card.id && (
                    <div className="mt-3 border-t border-border pt-3">
                      <div className="text-xs text-muted-foreground mb-1">Agent Card JSON</div>
                      <pre className="text-xs bg-muted/50 rounded-md p-3 whitespace-pre-wrap border border-border overflow-x-auto max-h-64 overflow-y-auto">
                        {formatCardJson(card.card_json)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PublishCardDialog({
  agents,
  existingAgentIds,
  onPublished,
}: {
  agents: AgentWithStatus[];
  existingAgentIds: string[];
  onPublished: (card: CardWithName) => void;
}) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const availableAgents = agents.filter(
    (a) => a.is_active && !existingAgentIds.includes(a.id),
  );
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  function generateCardJson(agent: AgentWithStatus): Record<string, unknown> {
    return {
      name: agent.name,
      description: `AI agent powered by ${agent.gateway_type} gateway`,
      url: `/api/a2a/invoke`,
      version: "1.0.0",
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: false,
      },
      defaultInputModes: ["text"],
      defaultOutputModes: ["text"],
      skills: [
        {
          id: "general",
          name: "General Conversation",
          description: `Interact with ${agent.name}`,
          tags: ["conversation", "assistant"],
        },
      ],
    };
  }

  async function handlePublish() {
    if (!selectedAgent) {
      toast.error("Select an agent");
      return;
    }
    setSaving(true);
    try {
      const cardJson = generateCardJson(selectedAgent);
      const result = await publishA2ACard(selectedAgent.id, cardJson);
      onPublished({
        id: result.id,
        agent_id: selectedAgent.id,
        card_json: JSON.stringify(cardJson),
        endpoint_url: `/api/a2a/${result.id}/invoke`,
        is_published: true,
        created_at: new Date().toISOString(),
        agent_name: selectedAgent.name,
      });
      toast.success("Agent card published");
    } catch {
      toast.error("Failed to publish card");
    } finally {
      setSaving(false);
    }
  }

  const previewJson = selectedAgent
    ? JSON.stringify(generateCardJson(selectedAgent), null, 2)
    : null;

  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Publish Agent Card</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Agent</Label>
          <Select value={selectedAgentId} onValueChange={(v) => v && setSelectedAgentId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select an agent..." />
            </SelectTrigger>
            <SelectContent>
              {availableAgents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
              {availableAgents.length === 0 && (
                <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                  No available agents
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {previewJson && (
          <>
            <Separator />
            <div>
              <Label className="mb-2 block">Card Preview</Label>
              <pre className="text-xs bg-muted/50 rounded-md p-3 whitespace-pre-wrap border border-border overflow-x-auto max-h-52 overflow-y-auto">
                {previewJson}
              </pre>
            </div>
          </>
        )}
      </div>
      <DialogFooter>
        <Button onClick={handlePublish} disabled={saving || !selectedAgentId}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Publish Card
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
