"use client";

import { useEffect, useState } from "react";
import {
  Plus, Trash2, Loader2, Brain, Search, Tag,
  Eye, Pencil, Database, Hash,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import {
  getSharedMemory, createMemoryEntry, updateMemoryEntry,
  deleteMemoryEntry, getAgents,
} from "@/lib/api";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import type { SharedMemoryEntry, AgentWithStatus } from "@/lib/types";
import { toast } from "sonner";

const CATEGORIES = ["general", "project", "credentials", "preferences", "custom"];

function getCategoryColor(category: string): string {
  switch (category) {
    case "general": return "border-[var(--accent-blue)]/30 text-[var(--accent-blue)]";
    case "project": return "border-[var(--accent-violet)]/30 text-[var(--accent-violet)]";
    case "credentials": return "border-[var(--accent-rose)]/30 text-[var(--accent-rose)]";
    case "preferences": return "border-[var(--accent-amber)]/30 text-[var(--accent-amber)]";
    case "custom": return "border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)]";
    default: return "";
  }
}

function isExpired(entry: SharedMemoryEntry): boolean {
  if (!entry.expires_at) return false;
  return new Date(entry.expires_at) < new Date();
}

export default function MemoryPage() {
  const { agents, setAgents, sharedMemory, setSharedMemory } = useStore(useShallow((s) => ({ agents: s.agents, setAgents: s.setAgents, sharedMemory: s.sharedMemory, setSharedMemory: s.setSharedMemory })));
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<SharedMemoryEntry | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [entries, a] = await Promise.all([getSharedMemory(), getAgents()]);
      setSharedMemory(entries);
      setAgents(a);
    } catch {
      toast.error("Failed to load memory entries");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMemoryEntry(id);
      setSharedMemory(sharedMemory.filter((e) => e.id !== id));
      toast.success("Entry deleted");
    } catch {
      toast.error("Failed to delete entry");
    }
  }

  function getAgentName(id: string | null): string | null {
    if (!id) return null;
    return agents.find((a) => a.id === id)?.name ?? "Unknown Agent";
  }

  const filtered = sharedMemory.filter((entry) => {
    if (filterCategory !== "all" && entry.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        entry.key.toLowerCase().includes(q) ||
        entry.value.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const uniqueCategories = new Set(sharedMemory.map((e) => e.category));
  const totalAccesses = sharedMemory.reduce((sum, e) => sum + e.access_count, 0);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shared Memory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Key-value store shared across all agents
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" />
            New Entry
          </DialogTrigger>
          <CreateEntryDialog
            agents={agents}
            onCreated={(entry) => {
              setSharedMemory([entry, ...sharedMemory]);
              setCreateOpen(false);
            }}
          />
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Database className="h-5 w-5 text-[var(--accent-blue)]" />
            <div>
              <div className="text-2xl font-bold">{sharedMemory.length}</div>
              <div className="text-xs text-muted-foreground">Total Entries</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Tag className="h-5 w-5 text-[var(--accent-violet)]" />
            <div>
              <div className="text-2xl font-bold">{uniqueCategories.size}</div>
              <div className="text-xs text-muted-foreground">Categories</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Eye className="h-5 w-5 text-[var(--accent-amber)]" />
            <div>
              <div className="text-2xl font-bold">{totalAccesses}</div>
              <div className="text-xs text-muted-foreground">Total Accesses</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={filterCategory}
          onValueChange={(v) => v && setFilterCategory(v)}
        >
          <SelectTrigger className="w-[10rem]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entry List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">
              {sharedMemory.length === 0
                ? "No memory entries yet"
                : "No matching entries"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {sharedMemory.length === 0
                ? "Create a shared memory entry for agents to reference"
                : "Try adjusting your search or filter"}
            </p>
            {sharedMemory.length === 0 && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Entry
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((entry) => {
            const expired = isExpired(entry);
            const agentName = getAgentName(entry.source_agent_id);
            return (
              <Card
                key={entry.id}
                className={cn("overflow-hidden", expired && "opacity-50")}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span
                          className={cn(
                            "font-medium text-sm truncate",
                            expired && "line-through",
                          )}
                        >
                          {entry.key}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "text-sm text-muted-foreground line-clamp-2",
                          expired && "line-through",
                        )}
                      >
                        {entry.value}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditEntry(entry)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn("text-[0.625rem]", getCategoryColor(entry.category))}
                    >
                      {entry.category}
                    </Badge>
                    {expired && (
                      <Badge variant="outline" className="text-[0.625rem] border-[var(--status-danger)]/30 text-[var(--status-danger)]">
                        expired
                      </Badge>
                    )}
                    {agentName && (
                      <div className="flex items-center gap-1 text-[0.625rem] text-muted-foreground">
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-full text-[0.4375rem] font-medium text-white",
                            getAvatarColor(entry.source_agent_id!),
                          )}
                        >
                          {getInitials(agentName)}
                        </div>
                        {agentName}
                      </div>
                    )}
                    <span className="text-[0.625rem] text-muted-foreground ml-auto">
                      {entry.access_count} accesses
                    </span>
                  </div>

                  {/* Confidence bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[0.625rem] text-muted-foreground">Confidence</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          entry.confidence >= 0.7
                            ? "bg-[var(--status-online)]"
                            : entry.confidence >= 0.4
                              ? "bg-[var(--status-warning)]"
                              : "bg-[var(--status-danger)]",
                        )}
                        style={{ width: `${Math.round(entry.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-[0.625rem] text-muted-foreground w-8 text-right">
                      {Math.round(entry.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={editEntry !== null}
        onOpenChange={(open) => { if (!open) setEditEntry(null); }}
      >
        {editEntry && (
          <EditEntryDialog
            entry={editEntry}
            onUpdated={(updated) => {
              setSharedMemory(
                sharedMemory.map((e) =>
                  e.id === updated.id ? updated : e,
                ),
              );
              setEditEntry(null);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function CreateEntryDialog({
  agents,
  onCreated,
}: {
  agents: AgentWithStatus[];
  onCreated: (entry: SharedMemoryEntry) => void;
}) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("general");
  const [sourceAgent, setSourceAgent] = useState<string>("none");
  const [confidence, setConfidence] = useState(0.8);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!key.trim()) {
      toast.error("Key is required");
      return;
    }
    if (!value.trim()) {
      toast.error("Value is required");
      return;
    }
    setSaving(true);
    try {
      const result = await createMemoryEntry({
        key: key.trim(),
        value: value.trim(),
        category,
        source_agent_id: sourceAgent !== "none" ? sourceAgent : undefined,
        confidence,
      });
      onCreated({
        id: result.id,
        key: key.trim(),
        value: value.trim(),
        category,
        source_agent_id: sourceAgent !== "none" ? sourceAgent : null,
        confidence,
        access_count: 0,
        last_accessed: null,
        expires_at: null,
        created_by: null,
        created_at: new Date().toISOString(),
      });
      toast.success("Memory entry created");
    } catch {
      toast.error("Failed to create entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create Memory Entry</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Key</Label>
          <Input
            placeholder="e.g. api_base_url"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>

        <div>
          <Label>Value</Label>
          <Textarea
            placeholder="Entry value..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
          />
        </div>

        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => v && setCategory(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Source Agent (optional)</Label>
          <Select value={sourceAgent} onValueChange={(v) => v && setSourceAgent(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No agent</SelectItem>
              {agents.filter((a) => a.is_active).map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Confidence: {confidence.toFixed(1)}</Label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={confidence}
            onChange={(e) => setConfidence(parseFloat(e.target.value))}
            className="w-full mt-1 accent-primary"
          />
          <div className="flex justify-between text-[0.625rem] text-muted-foreground mt-0.5">
            <span>0.0</span>
            <span>0.5</span>
            <span>1.0</span>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={handleSave}
          disabled={saving || !key.trim() || !value.trim()}
        >
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Create Entry
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EditEntryDialog({
  entry,
  onUpdated,
}: {
  entry: SharedMemoryEntry;
  onUpdated: (entry: SharedMemoryEntry) => void;
}) {
  const [value, setValue] = useState(entry.value);
  const [category, setCategory] = useState(entry.category);
  const [confidence, setConfidence] = useState(entry.confidence);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateMemoryEntry(entry.id, {
        value: value.trim(),
        category,
        confidence,
      });
      onUpdated({
        ...entry,
        value: value.trim(),
        category,
        confidence,
      });
      toast.success("Entry updated");
    } catch {
      toast.error("Failed to update entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit: {entry.key}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Value</Label>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
          />
        </div>

        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => v && setCategory(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Confidence: {confidence.toFixed(1)}</Label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={confidence}
            onChange={(e) => setConfidence(parseFloat(e.target.value))}
            className="w-full mt-1 accent-primary"
          />
          <div className="flex justify-between text-[0.625rem] text-muted-foreground mt-0.5">
            <span>0.0</span>
            <span>0.5</span>
            <span>1.0</span>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave} disabled={saving || !value.trim()}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
