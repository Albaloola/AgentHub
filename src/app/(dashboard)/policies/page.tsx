"use client";

import { useEffect, useState } from "react";
import {
  Plus, Shield, Trash2, Loader2, AlertOctagon,
  ShieldCheck, ShieldAlert, Activity,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { getPolicies, createPolicy, updatePolicy, deletePolicy, getAgents } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PolicyRule, AgentWithStatus } from "@/lib/types";
import { toast } from "sonner";

export default function PoliciesPage() {
  const agents = useStore((s) => s.agents);
  const setAgents = useStore((s) => s.setAgents);
  const [policies, setPolicies] = useState<PolicyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([getPolicies(), getAgents()]);
      setPolicies(p);
      setAgents(a);
    } catch {
      toast.error("Failed to load policies");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(policy: PolicyRule) {
    try {
      await updatePolicy(policy.id, { is_active: !policy.is_active });
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === policy.id ? { ...p, is_active: !p.is_active } : p,
        ),
      );
      toast.success(policy.is_active ? "Policy deactivated" : "Policy activated");
    } catch {
      toast.error("Failed to update policy");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePolicy(id);
      setPolicies((prev) => prev.filter((p) => p.id !== id));
      toast.success("Policy deleted");
    } catch {
      toast.error("Failed to delete policy");
    }
  }

  function getAgentName(agentId: string | null) {
    if (!agentId) return null;
    return agents.find((a) => a.id === agentId)?.name ?? "Unknown";
  }

  const totalViolations = policies.reduce((s, p) => s + p.violation_count, 0);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Policies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Runtime policy rules for governing agent behavior
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" />
            New Policy
          </DialogTrigger>
          <CreatePolicyDialog
            agents={agents}
            onCreated={(p) => {
              setPolicies((prev) => [p, ...prev]);
              setCreateOpen(false);
            }}
          />
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Shield className="h-5 w-5 text-[var(--accent-blue)]" />
            <div>
              <div className="text-2xl font-bold">{policies.length}</div>
              <div className="text-xs text-muted-foreground">Total Policies</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ShieldCheck className="h-5 w-5 text-[var(--status-online)]" />
            <div>
              <div className="text-2xl font-bold">
                {policies.filter((p) => p.is_active).length}
              </div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertOctagon className="h-5 w-5 text-[var(--status-danger)]" />
            <div>
              <div className="text-2xl font-bold">{totalViolations}</div>
              <div className="text-xs text-muted-foreground">Total Violations</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policy List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : policies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No policies yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create policy rules to govern agent behavior at runtime
            </p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Policy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {policies.map((policy) => {
            const severityColor =
              policy.severity === "block"
                ? "border-[var(--status-danger)]/30 text-[var(--status-danger)] bg-[var(--status-danger)]/10"
                : policy.severity === "warn"
                  ? "border-[var(--status-warning)]/30 text-[var(--status-warning)] bg-[var(--status-warning)]/10"
                  : "border-muted-foreground/30 text-muted-foreground bg-muted";
            const agentName = getAgentName(policy.agent_id);
            return (
              <Card
                key={policy.id}
                className={cn(!policy.is_active && "opacity-60")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-blue)]/10 shrink-0">
                      {policy.severity === "block" ? (
                        <ShieldAlert className="h-5 w-5 text-[var(--status-danger)]" />
                      ) : policy.severity === "warn" ? (
                        <AlertOctagon className="h-5 w-5 text-[var(--status-warning)]" />
                      ) : (
                        <Activity className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-medium">{policy.name}</span>
                        <Badge variant="outline" className="text-[0.625rem]">
                          {policy.type}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn("text-[0.625rem]", severityColor)}
                        >
                          {policy.severity}
                        </Badge>
                        <Badge variant="outline" className="text-[0.625rem]">
                          {policy.scope}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {agentName && <span>Agent: {agentName}</span>}
                        <span>{policy.violation_count} violations</span>
                      </div>
                      {policy.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {policy.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={policy.is_active}
                        onCheckedChange={() => handleToggleActive(policy)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(policy.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

function CreatePolicyDialog({
  agents,
  onCreated,
}: {
  agents: AgentWithStatus[];
  onCreated: (policy: PolicyRule) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("action_filter");
  const [ruleJson, setRuleJson] = useState('{\n  "pattern": "",\n  "action": "deny"\n}');
  const [severity, setSeverity] = useState("warn");
  const [scope, setScope] = useState("global");
  const [agentId, setAgentId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Policy name is required");
      return;
    }
    let parsedRule: Record<string, unknown>;
    try {
      parsedRule = JSON.parse(ruleJson);
    } catch {
      toast.error("Invalid JSON in rule definition");
      return;
    }
    setSaving(true);
    try {
      const result = await createPolicy({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        rule_json: parsedRule,
        severity,
        scope,
        agent_id: scope === "agent" && agentId ? agentId : undefined,
      });
      onCreated({
        id: result.id,
        name: name.trim(),
        description: description.trim() || null,
        type,
        rule_json: ruleJson,
        severity: severity as PolicyRule["severity"],
        scope: scope as PolicyRule["scope"],
        agent_id: scope === "agent" && agentId ? agentId : null,
        is_active: true,
        violation_count: 0,
        created_at: new Date().toISOString(),
      });
      toast.success("Policy created");
    } catch {
      toast.error("Failed to create policy");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create Policy</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input
            placeholder="e.g. Block PII Exposure"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <Label>Description</Label>
          <Input
            placeholder="Optional description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => v && setType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="action_filter">Action Filter</SelectItem>
              <SelectItem value="data_access">Data Access</SelectItem>
              <SelectItem value="rate_limit">Rate Limit</SelectItem>
              <SelectItem value="tool_restriction">Tool Restriction</SelectItem>
              <SelectItem value="output_filter">Output Filter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Rule Definition (JSON)</Label>
          <Textarea
            className="font-mono text-xs"
            placeholder='{"pattern": "", "action": "deny"}'
            value={ruleJson}
            onChange={(e) => setRuleJson(e.target.value)}
            rows={5}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Severity</Label>
            <Select value={severity} onValueChange={(v) => v && setSeverity(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="block">Block</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="log">Log</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Scope</Label>
            <Select value={scope} onValueChange={(v) => v && setScope(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {scope === "agent" && (
          <div>
            <Label>Agent</Label>
            <Select value={agentId} onValueChange={(v) => v && setAgentId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select agent..." />
              </SelectTrigger>
              <SelectContent>
                {agents.filter((a) => a.is_active).map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Create Policy
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
