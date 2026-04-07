"use client";

import { useState, useEffect } from "react";
import {
  X, GripVertical, Eye, EyeOff, Plus, Trash2, ChevronUp, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface NavItemConfig {
  href: string;
  label: string;
  visible: boolean;
}

export interface NavGroupConfig {
  id: string;
  label: string;
  items: NavItemConfig[];
  collapsed: boolean;
}

interface NavConfigPanelProps {
  open: boolean;
  onClose: () => void;
  groups: NavGroupConfig[];
  onSave: (groups: NavGroupConfig[]) => void;
}

const STORAGE_KEY = "agenthub-nav-config-v1";

export function loadNavConfig(defaults: NavGroupConfig[]): NavGroupConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return defaults;
}

export function saveNavConfig(groups: NavGroupConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch {}
}

export function NavConfigPanel({ open, onClose, groups: initialGroups, onSave }: NavConfigPanelProps) {
  const [groups, setGroups] = useState<NavGroupConfig[]>(initialGroups);
  const [newGroupName, setNewGroupName] = useState("");
  const [dragItem, setDragItem] = useState<{ groupIdx: number; itemIdx: number } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ groupIdx: number; itemIdx: number } | null>(null);

  useEffect(() => {
    if (open) setGroups(initialGroups);
  }, [open, initialGroups]);

  if (!open) return null;

  function toggleItemVisibility(groupIdx: number, itemIdx: number) {
    setGroups((prev) => {
      const next = prev.map((g, gi) => ({
        ...g,
        items: g.items.map((item, ii) =>
          gi === groupIdx && ii === itemIdx ? { ...item, visible: !item.visible } : item,
        ),
      }));
      return next;
    });
  }

  function moveItem(fromGroup: number, fromIdx: number, toGroup: number, toIdx: number) {
    setGroups((prev) => {
      const next = prev.map((g) => ({ ...g, items: [...g.items] }));
      const [item] = next[fromGroup].items.splice(fromIdx, 1);
      next[toGroup].items.splice(toIdx, 0, item);
      return next;
    });
  }

  function moveItemUp(groupIdx: number, itemIdx: number) {
    if (itemIdx === 0) {
      // Move to previous group
      if (groupIdx === 0) return;
      moveItem(groupIdx, itemIdx, groupIdx - 1, groups[groupIdx - 1].items.length);
    } else {
      moveItem(groupIdx, itemIdx, groupIdx, itemIdx - 1);
    }
  }

  function moveItemDown(groupIdx: number, itemIdx: number) {
    if (itemIdx === groups[groupIdx].items.length - 1) {
      // Move to next group
      if (groupIdx === groups.length - 1) return;
      moveItem(groupIdx, itemIdx, groupIdx + 1, 0);
    } else {
      moveItem(groupIdx, itemIdx, groupIdx, itemIdx + 1);
    }
  }

  function addGroup() {
    if (!newGroupName.trim()) return;
    setGroups((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, label: newGroupName.trim(), items: [], collapsed: false },
    ]);
    setNewGroupName("");
  }

  function removeGroup(idx: number) {
    setGroups((prev) => {
      const next = [...prev];
      // Move items to the first group before removing
      const orphans = next[idx].items;
      next.splice(idx, 1);
      if (next.length > 0 && orphans.length > 0) {
        next[0].items = [...next[0].items, ...orphans];
      }
      return next;
    });
  }

  function renameGroup(idx: number, name: string) {
    setGroups((prev) => prev.map((g, i) => (i === idx ? { ...g, label: name } : g)));
  }

  function handleSave() {
    saveNavConfig(groups);
    onSave(groups);
    onClose();
  }

  function handleDragStart(groupIdx: number, itemIdx: number) {
    setDragItem({ groupIdx, itemIdx });
  }

  function handleDragOver(e: React.DragEvent, groupIdx: number, itemIdx: number) {
    e.preventDefault();
    setDragOverTarget({ groupIdx, itemIdx });
  }

  function handleDrop(groupIdx: number, itemIdx: number) {
    if (dragItem) {
      moveItem(dragItem.groupIdx, dragItem.itemIdx, groupIdx, itemIdx);
    }
    setDragItem(null);
    setDragOverTarget(null);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-[90vw] max-w-lg max-h-[80vh] rounded-2xl border border-foreground/[0.08] glass-strong overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/[0.06]">
          <h2 className="text-base font-semibold">Configure Panel</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" className="rounded-lg" onClick={handleSave}>
              Save
            </Button>
            <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[65vh] p-4 space-y-4">
          {groups.map((group, gi) => (
            <div key={group.id} className="rounded-xl border border-foreground/[0.06] overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-foreground/[0.02]">
                <input
                  className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/40"
                  value={group.label}
                  onChange={(e) => renameGroup(gi, e.target.value)}
                  placeholder="Group name..."
                />
                <span className="text-xs text-muted-foreground/50">{group.items.filter((i) => i.visible).length}/{group.items.length}</span>
                {group.id.startsWith("custom-") && (
                  <button
                    onClick={() => removeGroup(gi)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Items */}
              <div className="divide-y divide-foreground/[0.03]">
                {group.items.map((item, ii) => (
                  <div
                    key={item.href}
                    draggable
                    onDragStart={() => handleDragStart(gi, ii)}
                    onDragOver={(e) => handleDragOver(e, gi, ii)}
                    onDrop={() => handleDrop(gi, ii)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 transition-colors",
                      dragOverTarget?.groupIdx === gi && dragOverTarget?.itemIdx === ii && "bg-blue-500/10",
                      !item.visible && "opacity-40",
                    )}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab shrink-0" />
                    <span className="flex-1 text-sm">{item.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveItemUp(gi, ii)}
                        className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/30 hover:text-foreground hover:bg-foreground/[0.06]"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveItemDown(gi, ii)}
                        className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/30 hover:text-foreground hover:bg-foreground/[0.06]"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleItemVisibility(gi, ii)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-foreground/[0.06]"
                      >
                        {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
                {group.items.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground/40 italic">
                    Drag items here
                  </div>
                )}
                {/* Drop zone at end of group */}
                <div
                  onDragOver={(e) => handleDragOver(e, gi, group.items.length)}
                  onDrop={() => handleDrop(gi, group.items.length)}
                  className={cn(
                    "h-2 transition-colors",
                    dragOverTarget?.groupIdx === gi && dragOverTarget?.itemIdx === group.items.length && "bg-blue-500/20",
                  )}
                />
              </div>
            </div>
          ))}

          {/* Add custom group */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="New group name..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGroup()}
              className="rounded-xl"
            />
            <Button variant="outline" size="sm" className="rounded-xl shrink-0" onClick={addGroup} disabled={!newGroupName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add Group
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
