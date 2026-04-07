"use client";

import { useEffect, useState } from "react";
import {
  Plus, Shield, Trash2, Loader2, Search,
  ShieldAlert, ShieldCheck, Eye, AlertTriangle,
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
import { getGuardrails, createGuardrail, updateGuardrail, deleteGuardrail, getAgents } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { GuardrailRule, AgentWithStatus } from "@/lib/types";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, string> = {
  content_filter: "Content Filter",
  pii_detection: "PII Detection",
  injection_detection: "Injection Detection",
  length_limit: "Length Limit",
  custom_regex: "Custom Regex",
};

const TYPE_COLORS: Record<string, string> = {
  content_filter: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  pii_detection: "bg-violet-500/10 text-violet-600 border-violet-500/30",
  injection_detection: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  length_limit: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
  custom_regex: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/30",
};

const ACTION_COLORS: Record<string, string> = {
  block: "bg-red-500/10 text-red-600 border-red-500/30",
  warn: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  redact: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  log: "bg-gray-500/10 text-gray-500 border-gray-500/30",
};

const PATTERN_HELPERS: Record<string, string> = {
  content_filter: "Enter comma-separated keywords to filter (e.g. spam, profanity, harmful)",
  pii_detection: "Enter PII types to detect (e.g. email, phone, ssn, credit_card)",
  injection_detection: "Enter injection patterns to watch for (e.g. ignore previous, system prompt)",
  length_limit: "Enter maximum character count (e.g. 4000)",
  custom_regex: "Enter a regular expression pattern (e.g. \\b\\d{3}-\\d{2}-\\d{4}\\b)",
};

export default function GuardrailsPage() {
  const agents = useStore((s) => s.agents);
  const setAgents = useStore((s) => s.setAgents);
  const [rules, setRules] = useState<GuardrailRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [g, a] = await Promise.all([getGuardrails(), getAgents()]);
      setRules(g);
      setAgents(a);
    } catch {
      toast.error("Failed to load guardrails");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(rule: GuardrailRule) {
    try {
      await updateGuardrail(rule.id, { is_active: !rule.is_active });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r)),
      );
      toast.success(rule.is_active ? "Rule deactivated" : "Rule activated");
    } catch {
      toast.error("Failed to update rule");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteGuardrail(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success("Rule deleted");
    } catch {
      toast.error("Failed to delete rule");
    }
  }

  const filtered = rules.filter((r) =>
    !searchQuery ||
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.type.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const activeCount = rules.filter((r) => r.is_active).length;
  const totalTriggers = rules.reduce((sum, r) => sum + r.trigger_count, 0);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Guardrails</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Safety rules to filter, detect, and control agent inputs and outputs
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" />
            New Rule
          </DialogTrigger>
          <CreateGuardrailDialog
            agents={agents}
            onCreated={(rule) => {
              setRules((prev) => [rule, ...prev]);
              setCreateOpen(false);
            }}
          />
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Shield className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{rules.length}</div>
              <div className="text-xs text-muted-foreground">Total Rules</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <div>
              <div className="text-2xl font-bold">{activeCount}</div>
              <div className="text-xs text-muted-foreground">Active Rules</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-2xl font-bold">{totalTriggers}</div>
              <div className="text-xs text-muted-foreground">Total Triggers</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search rules..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Rule List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">
              {rules.length === 0 ? "No guardrail rules yet" : "No matching rules"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {rules.length === 0
                ? "Create a rule to enforce safety policies on agent behavior"
                : "Try a different search term"}
            </p>
            {rules.length === 0 && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Rule
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((rule) => {
            const agentName = rule.agent_id
              ? agents.find((a) => a.id === rule.agent_id)?.name
              : null;
            return (
              <Card key={rule.id} className="overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10">
                    <Shield className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{rule.name}</span>
                      <Badge
                        variant="outline"
                        className={cn("text-[0.625rem]", TYPE_COLORS[rule.type])}
                      >
                        {TYPE_LABELS[rule.type] || rule.type}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn("text-[0.625rem]", ACTION_COLORS[rule.action])}
                      >
                        {rule.action}
                      </Badge>
                      <Badge variant="outline" className="text-[0.625rem]">
                        {rule.scope}
                        {agentName ? `: ${agentName}` : ""}
                      </Badge>
                    </div>
                    {rule.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {rule.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {rule.trigger_count > 0 && (
                        <span>
                          <AlertTriangle className="h-3 w-3 inline mr-0.5" />
                          {rule.trigger_count} triggers
                        </span>
                      )}
                      {rule.last_triggered_at && (
                        <span>Last: {new Date(rule.last_triggered_at + "Z").toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => handleToggle(rule)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateGuardrailDialog({
  agents,
  onCreated,
}: {
  agents: AgentWithStatus[];
  onCreated: (rule: GuardrailRule) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("content_filter");
  const [pattern, setPattern] = useState("");
  const [action, setAction] = useState<string>("block");
  const [scope, setScope] = useState<string>("global");
  const [agentId, setAgentId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Rule name is required");
      return;
    }
    if (!pattern.trim()) {
      toast.error("Pattern is required");
      return;
    }
    setSaving(true);
    try {
      const result = await createGuardrail({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        pattern: pattern.trim(),
        action,
        scope,
        agent_id: scope === "agent" && agentId ? agentId : undefined,
      });
      onCreated({
        id: result.id,
        name: name.trim(),
        description: description.trim() || null,
        type: type as GuardrailRule["type"],
        pattern: pattern.trim(),
        action: action as GuardrailRule["action"],
        scope: scope as GuardrailRule["scope"],
        agent_id: scope === "agent" && agentId ? agentId : null,
        is_active: true,
        trigger_count: 0,
        last_triggered_at: null,
        created_at: new Date().toISOString(),
      });
      toast.success("Guardrail rule created");
    } catch {
      toast.error("Failed to create rule");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create Guardrail Rule</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input
            placeholder="e.g. Block profanity"
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
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="content_filter">Content Filter</SelectItem>
              <SelectItem value="pii_detection">PII Detection</SelectItem>
              <SelectItem value="injection_detection">Injection Detection</SelectItem>
              <SelectItem value="length_limit">Length Limit</SelectItem>
              <SelectItem value="custom_regex">Custom Regex</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Pattern</Label>
          <Textarea
            placeholder={PATTERN_HELPERS[type] || "Enter pattern..."}
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            rows={3}
          />
          <p className="text-[0.625rem] text-muted-foreground mt-1">
            {PATTERN_HELPERS[type]}
          </p>
        </div>

        <div>
          <Label>Action</Label>
          <Select value={action} onValueChange={(v) => v && setAction(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="block">Block</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="redact">Redact</SelectItem>
              <SelectItem value="log">Log</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div>
          <Label>Scope</Label>
          <Select value={scope} onValueChange={(v) => v && setScope(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="conversation">Conversation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {scope === "agent" && (
          <div>
            <Label>Agent</Label>
            <Select value={agentId} onValueChange={(v) => v && setAgentId(v)}>
              <SelectTrigger><SelectValue placeholder="Select agent..." /></SelectTrigger>
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
        <Button onClick={handleSave} disabled={saving || !name.trim() || !pattern.trim()}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Create Rule
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
