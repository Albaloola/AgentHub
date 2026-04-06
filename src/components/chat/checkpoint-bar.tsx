"use client";

import { useState } from "react";
import {
  Save, RotateCcw, GitFork, Trash2, ChevronDown, ChevronUp,
  Loader2, Clock, Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Checkpoint } from "@/lib/types";
import {
  createCheckpoint, revertCheckpoint, forkCheckpoint, deleteCheckpoint,
} from "@/lib/api";
import { toast } from "sonner";

export function CheckpointBar({
  conversationId,
  checkpoints,
  onUpdate,
}: {
  conversationId: string;
  checkpoints: Checkpoint[];
  onUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) {
      toast.error("Name required");
      return;
    }
    setSaving(true);
    try {
      await createCheckpoint(conversationId, newName.trim());
      setNewName("");
      setCreating(false);
      onUpdate();
      toast.success("Checkpoint saved");
    } catch {
      toast.error("Failed to create checkpoint");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevert(cpId: string) {
    try {
      await revertCheckpoint(conversationId, cpId);
      onUpdate();
      toast.success("Reverted to checkpoint");
    } catch {
      toast.error("Failed to revert");
    }
  }

  async function handleFork(cpId: string) {
    try {
      const result = await forkCheckpoint(conversationId, cpId);
      toast.success("Forked conversation");
      window.location.href = `/chat/${result.id}`;
    } catch {
      toast.error("Failed to fork");
    }
  }

  async function handleDelete(cpId: string) {
    try {
      await deleteCheckpoint(conversationId, cpId);
      onUpdate();
      toast.success("Checkpoint deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  if (checkpoints.length === 0 && !creating) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-muted/30">
        <Bookmark className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">No checkpoints</span>
        <Button variant="ghost" size="sm" className="h-6 text-xs ml-auto" onClick={() => setCreating(true)}>
          <Save className="h-3 w-3 mr-1" />
          Save Checkpoint
        </Button>
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-muted/30">
      <div className="flex items-center gap-2 px-4 py-1.5">
        <Bookmark className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-medium">{checkpoints.length} checkpoint{checkpoints.length !== 1 ? "s" : ""}</span>

        {/* Mini timeline dots */}
        <div className="flex items-center gap-1 mx-2">
          {checkpoints.slice(0, 8).map((cp, i) => (
            <div
              key={cp.id}
              className="h-2 w-2 rounded-full bg-blue-500/60 hover:bg-blue-500 transition-colors cursor-pointer"
              title={cp.name ?? `Checkpoint ${i + 1}`}
              onClick={() => setExpanded(!expanded)}
            />
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {creating ? (
            <div className="flex items-center gap-1">
              <Input
                className="h-6 w-36 text-xs"
                placeholder="Checkpoint name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setCreating(true)}>
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-2 space-y-1">
          {checkpoints.map((cp) => (
            <div key={cp.id} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5">
              <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium">{cp.name ?? "Unnamed"}</span>
                <span className="text-[10px] text-muted-foreground ml-2">
                  {cp.message_count} msgs &middot; {new Date(cp.created_at + "Z").toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRevert(cp.id)} title="Revert">
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleFork(cp.id)} title="Fork">
                  <GitFork className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(cp.id)} title="Delete">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
