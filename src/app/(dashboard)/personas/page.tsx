"use client";

import { useEffect, useState } from "react";
import {
  Plus, Trash2, Loader2, User, Sparkles, Tag, BarChart3,
  Brain, Code2, Shield, FlaskConical, Palette, Bug, Database,
  Briefcase, Wrench, Play,
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
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import {
  getPersonas, createPersona, deletePersona, applyPersona, getAgents,
} from "@/lib/api";
import type { Persona, AgentWithStatus } from "@/lib/types";
import { PERSONA_CATEGORIES } from "@/lib/types";
import { toast } from "sonner";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  general: <User className="h-5 w-5" />,
  engineering: <Code2 className="h-5 w-5" />,
  devops: <Wrench className="h-5 w-5" />,
  research: <FlaskConical className="h-5 w-5" />,
  creative: <Palette className="h-5 w-5" />,
  qa: <Bug className="h-5 w-5" />,
  security: <Shield className="h-5 w-5" />,
  data: <Database className="h-5 w-5" />,
  management: <Briefcase className="h-5 w-5" />,
};

export default function PersonasPage() {
  const agents = useStore((s) => s.agents);
  const setAgents = useStore((s) => s.setAgents);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState<string | null>(null);
  const [applyAgentId, setApplyAgentId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([getPersonas(), getAgents()]);
      setPersonas(p);
      setAgents(a);
    } catch {
      toast.error("Failed to load personas");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePersona(id);
      setPersonas((prev) => prev.filter((p) => p.id !== id));
      toast.success("Persona deleted");
    } catch {
      toast.error("Failed to delete persona");
    }
  }

  async function handleApply(personaId: string) {
    if (!applyAgentId) {
      toast.error("Select an agent first");
      return;
    }
    try {
      await applyPersona(applyAgentId, personaId);
      toast.success("Persona applied to agent");
      setApplyOpen(null);
      setApplyAgentId(null);
    } catch {
      toast.error("Failed to apply persona");
    }
  }

  const builtinPersonas = personas.filter((p) => p.is_builtin);
  const customPersonas = personas.filter((p) => !p.is_builtin);
  const uniqueCategories = new Set(personas.map((p) => p.category));
  const totalApplications = personas.reduce((sum, p) => sum + p.usage_count, 0);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Personas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Predefined agent personalities and behavior configurations
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" />
            New Persona
          </DialogTrigger>
          <CreatePersonaDialog
            onCreated={(p) => {
              setPersonas((prev) => [p, ...prev]);
              setCreateOpen(false);
            }}
          />
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Sparkles className="h-5 w-5 text-[var(--accent-violet)]" />
            <div>
              <div className="text-2xl font-bold">{personas.length}</div>
              <div className="text-xs text-muted-foreground">Total Personas</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Tag className="h-5 w-5 text-[var(--accent-blue)]" />
            <div>
              <div className="text-2xl font-bold">{uniqueCategories.size}</div>
              <div className="text-xs text-muted-foreground">Categories</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <BarChart3 className="h-5 w-5 text-[var(--accent-emerald)]" />
            <div>
              <div className="text-2xl font-bold">{totalApplications}</div>
              <div className="text-xs text-muted-foreground">Total Applications</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : personas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No personas yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a persona to define reusable agent behavior configurations
            </p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Persona
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Built-in Personas */}
          {builtinPersonas.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Built-in Personas
              </h2>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {builtinPersonas.map((persona) => (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    agents={agents}
                    applyOpen={applyOpen}
                    setApplyOpen={setApplyOpen}
                    applyAgentId={applyAgentId}
                    setApplyAgentId={setApplyAgentId}
                    onApply={handleApply}
                  />
                ))}
              </div>
            </div>
          )}

          {builtinPersonas.length > 0 && customPersonas.length > 0 && (
            <Separator />
          )}

          {/* Custom Personas */}
          {customPersonas.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Custom Personas
              </h2>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {customPersonas.map((persona) => (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    agents={agents}
                    applyOpen={applyOpen}
                    setApplyOpen={setApplyOpen}
                    applyAgentId={applyAgentId}
                    setApplyAgentId={setApplyAgentId}
                    onApply={handleApply}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PersonaCard({
  persona,
  agents,
  applyOpen,
  setApplyOpen,
  applyAgentId,
  setApplyAgentId,
  onApply,
  onDelete,
}: {
  persona: Persona;
  agents: AgentWithStatus[];
  applyOpen: string | null;
  setApplyOpen: (id: string | null) => void;
  applyAgentId: string | null;
  setApplyAgentId: (id: string | null) => void;
  onApply: (personaId: string) => void;
  onDelete?: (id: string) => void;
}) {
  const isApplyOpen = applyOpen === persona.id;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-violet)]/10 text-[var(--accent-violet)]">
            {CATEGORY_ICONS[persona.category] || <User className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{persona.name}</span>
              {persona.is_builtin && (
                <Badge variant="outline" className="text-[0.625rem] shrink-0">built-in</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className="text-[0.625rem]">{persona.category}</Badge>
              <Badge
                variant="outline"
                className="text-[0.625rem] border-[var(--accent-blue)]/30 text-[var(--accent-blue)]"
              >
                {persona.behavior_mode}
              </Badge>
            </div>
          </div>
        </div>

        {persona.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {persona.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{persona.usage_count} applications</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Dialog
            open={isApplyOpen}
            onOpenChange={(open) => {
              setApplyOpen(open ? persona.id : null);
              if (!open) setApplyAgentId(null);
            }}
          >
            <DialogTrigger render={<Button variant="outline" size="sm" className="flex-1" />}>
              <Play className="h-3.5 w-3.5 mr-1" />
              Apply to Agent
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Apply &ldquo;{persona.name}&rdquo;</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Select Agent</Label>
                  <Select
                    value={applyAgentId ?? ""}
                    onValueChange={(v) => v && setApplyAgentId(v)}
                    items={Object.fromEntries(agents.filter((a) => a.is_active).map((a) => [a.id, a.name]))}
                  >
                    <SelectTrigger><SelectValue placeholder="Choose an agent..." /></SelectTrigger>
                    <SelectContent>
                      {agents.filter((a) => a.is_active).map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => onApply(persona.id)}
                  disabled={!applyAgentId}
                >
                  Apply Persona
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(persona.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CreatePersonaDialog({
  onCreated,
}: {
  onCreated: (persona: Persona) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [behaviorMode, setBehaviorMode] = useState("default");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Persona name is required");
      return;
    }
    if (!systemPrompt.trim()) {
      toast.error("System prompt is required");
      return;
    }
    setSaving(true);
    try {
      const result = await createPersona({
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        system_prompt: systemPrompt.trim(),
        behavior_mode: behaviorMode,
      });
      onCreated({
        id: result.id,
        name: name.trim(),
        category,
        description: description.trim() || null,
        system_prompt: systemPrompt.trim(),
        behavior_mode: behaviorMode,
        capability_weights: "{}",
        icon: "",
        is_builtin: false,
        usage_count: 0,
        created_at: new Date().toISOString(),
      });
      toast.success("Persona created");
    } catch {
      toast.error("Failed to create persona");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create Persona</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input
            placeholder="e.g. Senior Backend Engineer"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => v && setCategory(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERSONA_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Description</Label>
          <Input
            placeholder="Brief description of this persona..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <Label>System Prompt</Label>
          <Textarea
            placeholder="You are a senior backend engineer specializing in..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
          />
        </div>

        <div>
          <Label>Behavior Mode</Label>
          <Select value={behaviorMode} onValueChange={(v) => v && setBehaviorMode(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
              <SelectItem value="concise">Concise</SelectItem>
              <SelectItem value="teaching">Teaching</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave} disabled={saving || !name.trim() || !systemPrompt.trim()}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Create Persona
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
