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
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { PageIntro } from "@/components/layout/page-intro";
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
  const agents = useStore((s) => s.agents);
  const setAgents = useStore((s) => s.setAgents);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="h-full overflow-y-auto">
      <div className="workspace-page workspace-stack max-w-7xl">
        <PageIntro
          eyebrow="External connectivity"
          title="Integrations"
          description="Connect external services, event streams, and delivery channels to the same operational workspace language as the rest of AgentHub."
          actions={
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <Plus className="mr-1 h-4 w-4" />
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
          }
          aside={
            <div className="workspace-metric-grid">
              <div className="workspace-metric">
                <p className="workspace-metric__label">Integrations</p>
                <p className="workspace-metric__value">{integrations.length}</p>
                <p className="workspace-metric__hint">Configured services</p>
              </div>
              <div className="workspace-metric">
                <p className="workspace-metric__label">Active</p>
                <p className="workspace-metric__value">{activeCount}</p>
                <p className="workspace-metric__hint">Currently connected</p>
              </div>
            </div>
          }
        />

      {/* Stats */}
      <div className="workspace-panel-grid grid-cols-2 md:grid-cols-3">
        <Card className="workspace-panel">
          <CardContent className="flex items-center gap-3 p-4">
            <Link className="h-5 w-5 text-[var(--accent-blue)]" />
            <div>
              <div className="text-2xl font-bold">{integrations.length}</div>
              <div className="text-xs text-muted-foreground">Total Integrations</div>
            </div>
          </CardContent>
        </Card>
        <Card className="workspace-panel">
          <CardContent className="flex items-center gap-3 p-4">
            <Power className="h-5 w-5 text-[var(--accent-emerald)]" />
            <div>
              <div className="text-2xl font-bold">{activeCount}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card className="workspace-panel">
          <CardContent className="flex items-center gap-3 p-4">
            <Zap className="h-5 w-5 text-[var(--accent-amber)]" />
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
        <Card className="workspace-panel">
          <CardContent>
            <EmptyState
              icon={Plug}
              title="No integrations yet"
              description="Connect an external service to start receiving events"
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Integration
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
         <div className="workspace-panel-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
           {integrations.map((integration) => {
            const agent = agents.find((a) => a.id === integration.agent_id);
            return (
               <Card key={integration.id} className="workspace-panel overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">
                      {TYPE_ICONS[integration.type] || <Plug className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{integration.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[var(--text-label)]">
                          {getTypeLabel(integration.type)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            integration.is_active
                              ? "text-[var(--text-label)] border-[var(--status-online)]/30 text-[var(--status-online)]"
                              : "text-[var(--text-label)] border-gray-500/30 text-gray-500"
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
            items={{ __none__: "No agent assigned", ...Object.fromEntries(agents.filter((a) => a.is_active).map((a) => [a.id, a.name])) }}
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
