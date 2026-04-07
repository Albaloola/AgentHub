"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, FileText, Trash2, Copy, Users, MessageSquare,
  Settings2, Loader2, ChevronDown, ChevronUp, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { getTemplates, createTemplate, deleteTemplate, getAgents, createConversation } from "@/lib/api";
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
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import type { Template, AgentWithStatus } from "@/lib/types";
import { toast } from "sonner";

export default function TemplatesPage() {
  const router = useRouter();
  const agents = useStore((s) => s.agents);
  const setAgents = useStore((s) => s.setAgents);
  const [templates, setTemplatesState] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [t, a] = await Promise.all([getTemplates(), getAgents()]);
      setTemplatesState(t as Template[]);
      setAgents(a);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTemplate(id);
      setTemplatesState((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete template");
    }
  }

  async function handleUseTemplate(template: Template) {
    try {
      const { id } = await createConversation({
        name: template.name,
        type: "group",
        response_mode: template.response_mode,
      });
      router.push(`/chat/${id}`);
      toast.success("Conversation created from template");
    } catch {
      toast.error("Failed to create conversation");
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reusable conversation configurations for common workflows
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" />
            New Template
          </DialogTrigger>
          <CreateTemplateDialog
            agents={agents}
            onCreated={(t) => {
              setTemplatesState((prev) => [t, ...prev]);
              setCreateOpen(false);
            }}
          />
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{templates.length}</div>
              <div className="text-xs text-muted-foreground">Templates</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-violet-500" />
            <div>
              <div className="text-2xl font-bold">
                {templates.filter((t) => t.response_mode === "discussion").length}
              </div>
              <div className="text-xs text-muted-foreground">Discussion</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Settings2 className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-2xl font-bold">
                {templates.filter((t) => t.stop_on_completion).length}
              </div>
              <div className="text-xs text-muted-foreground">Auto-stop</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No templates yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a template to save conversation configurations for reuse
            </p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => {
            const isExpanded = expandedId === template.id;
            return (
              <Card key={template.id} className="overflow-hidden">
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : template.id)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10">
                    <FileText className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{template.name}</span>
                      <Badge variant="outline" className="text-[0.625rem]">
                        {template.response_mode}
                      </Badge>
                      {template.stop_on_completion && (
                        <Badge variant="outline" className="text-[0.625rem] border-amber-500/30 text-amber-600">
                          auto-stop
                        </Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); handleUseTemplate(template); }}
                      title="Use template"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeletingTemplate(template); }}
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
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Response Mode:</span>{" "}
                        <span className="font-medium">{template.response_mode}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max Responses/Turn:</span>{" "}
                        <span className="font-medium">
                          {template.max_responses_per_turn === 0 ? "Unlimited" : template.max_responses_per_turn}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Stop on Completion:</span>{" "}
                        <span className="font-medium">{template.stop_on_completion ? "Yes" : "No"}</span>
                      </div>
                    </div>
                    {template.system_prompt && (
                      <div>
                        <span className="text-xs text-muted-foreground">System Prompt:</span>
                        <pre className="mt-1 text-xs bg-background rounded-md p-3 whitespace-pre-wrap border border-border">
                          {template.system_prompt}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deletingTemplate} onOpenChange={(open) => { if (!open) setDeletingTemplate(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingTemplate?.name}&quot;? This will permanently remove the template configuration. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deletingTemplate) {
                  handleDelete(deletingTemplate.id);
                  setDeletingTemplate(null);
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

function CreateTemplateDialog({
  agents,
  onCreated,
}: {
  agents: AgentWithStatus[];
  onCreated: (template: Template) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [responseMode, setResponseMode] = useState("discussion");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [maxResponses, setMaxResponses] = useState(0);
  const [stopOnCompletion, setStopOnCompletion] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [agentRoles, setAgentRoles] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function toggleAgent(agentId: string) {
    setSelectedAgents((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId],
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }
    setSaving(true);
    try {
      const result = await createTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        response_mode: responseMode,
        system_prompt: systemPrompt.trim() || undefined,
        max_responses_per_turn: maxResponses,
        stop_on_completion: stopOnCompletion,
        agent_ids: selectedAgents.length > 0 ? selectedAgents : undefined,
        agent_roles: selectedAgents.map((id) => agentRoles[id] || "contributor"),
      });
      onCreated({
        id: result.id,
        name: name.trim(),
        description: description.trim() || null,
        response_mode: responseMode as Template["response_mode"],
        system_prompt: systemPrompt.trim() || null,
        max_responses_per_turn: maxResponses,
        stop_on_completion: stopOnCompletion,
        created_at: new Date().toISOString(),
      });
      toast.success("Template created");
    } catch {
      toast.error("Failed to create template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create Template</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input
            placeholder="e.g. Code Review Pipeline"
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
          <Label>Response Mode</Label>
          <Select value={responseMode} onValueChange={(v) => v && setResponseMode(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="discussion">Discussion</SelectItem>
              <SelectItem value="parallel">Parallel</SelectItem>
              <SelectItem value="targeted">Targeted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>System Prompt</Label>
          <Textarea
            placeholder="Optional system prompt..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Max Responses/Turn</Label>
            <Input
              type="number"
              min={0}
              value={maxResponses}
              onChange={(e) => setMaxResponses(parseInt(e.target.value) || 0)}
            />
            <p className="text-[0.625rem] text-muted-foreground mt-0.5">0 = unlimited</p>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch
              checked={stopOnCompletion}
              onCheckedChange={setStopOnCompletion}
            />
            <Label className="text-sm">Stop on completion</Label>
          </div>
        </div>

        <Separator />

        <div>
          <Label className="mb-2 block">Agents</Label>
          <div className="space-y-2">
            {agents.filter((a) => a.is_active).map((agent) => {
              const isSelected = selectedAgents.includes(agent.id);
              return (
                <div
                  key={agent.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer transition-colors",
                    isSelected ? "bg-accent border-primary/30" : "hover:bg-accent/30",
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
                    <Select
                      value={agentRoles[agent.id] || "contributor"}
                      onValueChange={(v) => v && setAgentRoles((prev) => ({ ...prev, [agent.id]: v }))}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leader">Leader</SelectItem>
                        <SelectItem value="executor">Executor</SelectItem>
                        <SelectItem value="reviewer">Reviewer</SelectItem>
                        <SelectItem value="observer">Observer</SelectItem>
                        <SelectItem value="contributor">Contributor</SelectItem>
                      </SelectContent>
                    </Select>
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
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Create Template
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
