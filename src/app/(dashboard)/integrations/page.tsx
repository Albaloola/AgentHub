"use client";

import { useEffect, useState } from "react";
import {
  Plus, Trash2, Loader2, GitPullRequest, MessageSquare, MessageCircle,
  Send, Mail, Plug, Ticket, GitBranch, Link, Activity, Zap, Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import {
  getIntegrations, createIntegration, updateIntegration, deleteIntegration, getAgents,
} from "@/lib/api";
import type { Integration, AgentWithStatus } from "@/lib/types";
import { INTEGRATION_TYPES } from "@/lib/types";
import { toast } from "sonner";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  github: <GitPullRequest className="h-5 w-5" />,
  gitlab: <GitBranch className="h-5 w-5" />,
  jira: <Ticket className="h-5 w-5" />,
  slack: <MessageSquare className="h-5 w-5" />,
  discord: <MessageCircle className="h-5 w-5" />,
  telegram: <Send className="h-5 w-5" />,
  email: <Mail className="h-5 w-5" />,
  custom: <Plug className="h-5 w-5" />,
};

function getTypeLabel(type: string): string {
  const found = INTEGRATION_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
}

export default function IntegrationsPage() {
  const { agents, setAgents } = useStore();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [i, a] = await Promise.all([getIntegrations(), getAgents()]);
      setIntegrations(i);
      setAgents(a);
    } catch {
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(integration: Integration) {
    try {
      await updateIntegration(integration.id, { is_active: !integration.is_active });
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integration.id ? { ...i, is_active: !i.is_active } : i,
        ),
      );
      toast.success(integration.is_active ? "Integration deactivated" : "Integration activated");
    } catch {
      toast.error("Failed to update integration");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteIntegration(id);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
      toast.success("Integration deleted");
    } catch {
      toast.error("Failed to delete integration");
    }
  }

  const activeCount = integrations.filter((i) => i.is_active).length;
  const totalEvents = integrations.reduce((sum, i) => sum + i.event_count, 0);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect agents to external services and event sources
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" />
            New Integration
          </DialogTrigger>
          <CreateIntegrationDialog
            agents={agents}
            onCreated={(i) => {
              setIntegrations((prev) => [i, ...prev]);
              setCreateOpen(false);
            }}
          />
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Link className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{integrations.length}</div>
              <div className="text-xs text-muted-foreground">Total Integrations</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Power className="h-5 w-5 text-emerald-500" />
            <div>
              <div className="text-2xl font-bold">{activeCount}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Zap className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-2xl font-bold">{totalEvents.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Events</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : integrations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Plug className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No integrations yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect an external service to start receiving events
            </p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Integration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => {
            const agent = agents.find((a) => a.id === integration.agent_id);
            return (
              <Card key={integration.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-500">
                      {TYPE_ICONS[integration.type] || <Plug className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{integration.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {getTypeLabel(integration.type)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            integration.is_active
                              ? "text-[10px] border-emerald-500/30 text-emerald-600"
                              : "text-[10px] border-gray-500/30 text-gray-500"
                          }
                        >
                          {integration.is_active ? "connected" : "disconnected"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      <span>{integration.event_count} events</span>
                    </div>
                    <div>
                      {integration.last_sync_at
                        ? `Synced ${new Date(integration.last_sync_at + "Z").toLocaleDateString()}`
                        : "Never synced"}
                    </div>
                    {agent && (
                      <div className="col-span-2 text-xs">
                        Agent: <span className="font-medium">{agent.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={integration.is_active}
                        onCheckedChange={() => handleToggleActive(integration)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {integration.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(integration.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateIntegrationDialog({
  agents,
  onCreated,
}: {
  agents: AgentWithStatus[];
  onCreated: (integration: Integration) => void;
}) {
  const [type, setType] = useState("github");
  const [name, setName] = useState("");
  const [configJson, setConfigJson] = useState("{}");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Integration name is required");
      return;
    }
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(configJson);
    } catch {
      toast.error("Invalid JSON in config");
      return;
    }
    setSaving(true);
    try {
      const result = await createIntegration({
        type,
        name: name.trim(),
        config,
        agent_id: agentId || undefined,
      });
      onCreated({
        id: result.id,
        type,
        name: name.trim(),
        config: configJson,
        agent_id: agentId,
        is_active: true,
        last_sync_at: null,
        event_count: 0,
        created_at: new Date().toISOString(),
      });
      toast.success("Integration created");
    } catch {
      toast.error("Failed to create integration");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create Integration</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => v && setType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INTEGRATION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Name</Label>
          <Input
            placeholder="e.g. Production GitHub"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <Label>Configuration (JSON)</Label>
          <Textarea
            placeholder='{"token": "...", "repo": "..."}'
            value={configJson}
            onChange={(e) => setConfigJson(e.target.value)}
            rows={5}
            className="font-mono text-xs"
          />
        </div>

        <div>
          <Label>Agent (optional)</Label>
          <Select
            value={agentId ?? "__none__"}
            onValueChange={(v) => setAgentId(v === "__none__" ? null : v ?? null)}
          >
            <SelectTrigger><SelectValue placeholder="No agent assigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No agent assigned</SelectItem>
              {agents.filter((a) => a.is_active).map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Create Integration
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
