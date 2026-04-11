"use client";

import { useEffect, useState } from "react";
import {
  Plus, Webhook as WebhookIcon, Trash2, Copy, Loader2,
  ChevronDown, ChevronUp, Zap, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import {
  getWebhooks, createWebhook, updateWebhook, deleteWebhook,
  getWebhookEvents, getAgents,
} from "@/lib/api";
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
import type { Webhook, WebhookEvent, AgentWithStatus } from "@/lib/types";
import { toast } from "sonner";

export default function WebhooksPage() {
  const agents = useStore((s) => s.agents);
  const setAgents = useStore((s) => s.setAgents);
  const [webhooks, setWebhooks] = useState<(Webhook & { agent_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, WebhookEvent[]>>({});
  const [eventsLoading, setEventsLoading] = useState<string | null>(null);
  const [deletingWebhook, setDeletingWebhook] = useState<(Webhook & { agent_name?: string }) | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [w, a] = await Promise.all([getWebhooks(), getAgents()]);
      setWebhooks(w);
      setAgents(a);
    } catch {
      toast.error("Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(webhook: Webhook & { agent_name?: string }) {
    try {
      await updateWebhook(webhook.id, { is_active: !webhook.is_active });
      setWebhooks((prev) =>
        prev.map((w) =>
          w.id === webhook.id ? { ...w, is_active: !w.is_active } : w,
        ),
      );
      toast.success(webhook.is_active ? "Webhook paused" : "Webhook activated");
    } catch {
      toast.error("Failed to update webhook");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      toast.success("Webhook deleted");
    } catch {
      toast.error("Failed to delete webhook");
    }
  }

  async function handleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!events[id]) {
      setEventsLoading(id);
      try {
        const ev = await getWebhookEvents(id, 10);
        setEvents((prev) => ({ ...prev, [id]: ev }));
      } catch {
        toast.error("Failed to load events");
      } finally {
        setEventsLoading(null);
      }
    }
  }

  function copyUrl(webhookId: string) {
    const url = `${window.location.origin}/api/webhooks/${webhookId}/trigger`;
    navigator.clipboard.writeText(url);
    toast.success("Trigger URL copied");
  }

  const totalTriggers = webhooks.reduce((s, w) => s + w.total_triggers, 0);
  const activeCount = webhooks.filter((w) => w.is_active).length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trigger agent actions from external services via HTTP
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" />
            New Webhook
          </DialogTrigger>
          <CreateWebhookDialog
            agents={agents}
            onCreated={(w) => {
              setWebhooks((prev) => [w, ...prev]);
              setCreateOpen(false);
            }}
          />
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <WebhookIcon className="h-5 w-5 text-[var(--accent-blue)]" />
            <div>
              <div className="text-2xl font-bold">{webhooks.length}</div>
              <div className="text-xs text-muted-foreground">Total Webhooks</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Zap className="h-5 w-5 text-[var(--accent-amber)]" />
            <div>
              <div className="text-2xl font-bold">{totalTriggers}</div>
              <div className="text-xs text-muted-foreground">Total Triggers</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Activity className="h-5 w-5 text-[var(--status-online)]" />
            <div>
              <div className="text-2xl font-bold">{activeCount}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <WebhookIcon className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No webhooks yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a webhook to let external services trigger your agents
            </p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => {
            const isExpanded = expandedId === webhook.id;
            const webhookEvents = events[webhook.id] || [];
            return (
              <Card key={webhook.id} className="overflow-hidden">
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => handleExpand(webhook.id)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-blue)]/10">
                    <WebhookIcon className="h-5 w-5 text-[var(--accent-blue)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{webhook.name}</span>
                      <Badge
                        variant="outline"
                        className={
                          webhook.is_active
                            ? "text-[0.625rem] border-[var(--status-online)]/30 text-[var(--status-online)]"
                            : "text-[0.625rem] border-muted-foreground/30 text-muted-foreground"
                        }
                      >
                        {webhook.is_active ? "active" : "paused"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      Agent: {webhook.agent_name || agents.find((a) => a.id === webhook.agent_id)?.name || "Unknown Agent"} &middot;{" "}
                      {webhook.total_triggers} triggers
                      {webhook.last_triggered_at && (
                        <> &middot; Last: {new Date(webhook.last_triggered_at).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={webhook.is_active}
                      onCheckedChange={() => handleToggleActive(webhook)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); copyUrl(webhook.id); }}
                      title="Copy trigger URL"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeletingWebhook(webhook); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-3 bg-muted/30 space-y-3">
                    {/* Trigger URL */}
                    <div>
                      <span className="text-xs text-muted-foreground">Trigger URL:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-background rounded-md px-3 py-1.5 border border-border flex-1 truncate">
                          {window.location.origin}/api/webhooks/{webhook.id}/trigger
                        </code>
                        <Button variant="outline" size="sm" onClick={() => copyUrl(webhook.id)}>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Rate Limit:</span>{" "}
                        <span className="font-medium">{webhook.rate_limit_per_min}/min</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Triggers:</span>{" "}
                        <span className="font-medium">{webhook.total_triggers}</span>
                      </div>
                    </div>

                    {webhook.system_prompt && (
                      <div>
                        <span className="text-xs text-muted-foreground">System Prompt:</span>
                        <pre className="mt-1 text-xs bg-background rounded-md p-3 whitespace-pre-wrap border border-border">
                          {webhook.system_prompt}
                        </pre>
                      </div>
                    )}

                    {webhook.body_transform && (
                      <div>
                        <span className="text-xs text-muted-foreground">Body Transform (JSON Path):</span>
                        <code className="mt-1 block text-xs bg-background rounded-md px-3 py-1.5 border border-border">
                          {webhook.body_transform}
                        </code>
                      </div>
                    )}

                    <Separator />

                    {/* Recent Events */}
                    <div>
                      <span className="text-xs font-medium">Recent Events</span>
                      {eventsLoading === webhook.id ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : webhookEvents.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3">No events yet</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {webhookEvents.map((ev) => (
                            <div
                              key={ev.id}
                              className="flex items-start gap-2 text-xs bg-background rounded-md p-2 border border-border"
                            >
                              <Badge
                                variant="outline"
                                className={
                                  ev.status === "success"
                                    ? "text-[0.625rem] border-[var(--status-online)]/30 text-[var(--status-online)] shrink-0"
                                    : ev.status === "error"
                                      ? "text-[0.625rem] border-[var(--status-danger)]/30 text-[var(--status-danger)] shrink-0"
                                      : "text-[0.625rem] shrink-0"
                                }
                              >
                                {ev.status}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                {ev.payload && (
                                  <pre className="text-[0.625rem] text-muted-foreground truncate max-w-full">
                                    {ev.payload.length > 120
                                      ? ev.payload.slice(0, 120) + "..."
                                      : ev.payload}
                                  </pre>
                                )}
                                {ev.error && (
                                  <p className="text-[0.625rem] text-[var(--status-danger)] mt-0.5">{ev.error}</p>
                                )}
                              </div>
                              <span className="text-[0.625rem] text-muted-foreground shrink-0">
                                {new Date(ev.created_at).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deletingWebhook} onOpenChange={(open) => { if (!open) setDeletingWebhook(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingWebhook?.name}&quot;? This will permanently remove the webhook and its event history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deletingWebhook) {
                  handleDelete(deletingWebhook.id);
                  setDeletingWebhook(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateWebhookDialog({
  agents,
  onCreated,
}: {
  agents: AgentWithStatus[];
  onCreated: (webhook: Webhook & { agent_name?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [agentId, setAgentId] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [bodyTransform, setBodyTransform] = useState("");
  const [rateLimit, setRateLimit] = useState(10);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Webhook name is required");
      return;
    }
    if (!agentId) {
      toast.error("Please select an agent");
      return;
    }
    setSaving(true);
    try {
      const result = await createWebhook({
        name: name.trim(),
        agent_id: agentId,
        system_prompt: systemPrompt.trim() || undefined,
        body_transform: bodyTransform.trim() || undefined,
        rate_limit_per_min: rateLimit,
      });
      const agent = agents.find((a) => a.id === agentId);
      onCreated({ ...result, agent_name: agent?.name });
      toast.success("Webhook created");
    } catch {
      toast.error("Failed to create webhook");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create Webhook</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input
            placeholder="e.g. GitHub Push Handler"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <Label>Agent</Label>
          <Select value={agentId} onValueChange={(v) => v && setAgentId(v)}>
            <SelectTrigger><SelectValue placeholder="Select an agent..." /></SelectTrigger>
            <SelectContent>
              {agents.filter((a) => a.is_active).map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>System Prompt</Label>
          <Textarea
            placeholder="Optional prompt prepended to each trigger..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <Label>Body Transform (JSON Path)</Label>
          <Input
            placeholder="e.g. $.pull_request.body"
            value={bodyTransform}
            onChange={(e) => setBodyTransform(e.target.value)}
          />
          <p className="text-[0.625rem] text-muted-foreground mt-0.5">
            Extract a specific field from the incoming payload
          </p>
        </div>

        <div>
          <Label>Rate Limit (per minute)</Label>
          <Input
            type="number"
            min={1}
            value={rateLimit}
            onChange={(e) => setRateLimit(parseInt(e.target.value) || 10)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave} disabled={saving || !name.trim() || !agentId}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Create Webhook
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
