"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Command, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCapabilities } from "@/lib/api";

// Built-in commands that always work
const BUILTIN_COMMANDS = [
  { name: "/reset", description: "Clear conversation context" },
  { name: "/compact", description: "Compress old messages to save tokens" },
  { name: "/export", description: "Export conversation as markdown" },
  { name: "/branch", description: "Fork conversation from this point" },
  { name: "/help", description: "Show available commands" },
  { name: "/stop", description: "Stop the current generation" },
  { name: "/clear", description: "Clear chat history" },
];

interface CommandsMenuProps {
  onSelect: (command: string) => void;
  triggerValue: string;
  disabled?: boolean;
}

export function CommandsMenu({ onSelect, triggerValue, disabled }: CommandsMenuProps) {
  const [open, setOpen] = useState(false);
  const [commands, setCommands] = useState<{ name: string; description: string }[]>(BUILTIN_COMMANDS);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  // Load agent-specific commands once
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadCommands();
  }, []);

  useEffect(() => {
    if (triggerValue.startsWith("/")) {
      setOpen(true);
      setFilter(triggerValue.slice(1));
      setSelectedIndex(0);
    } else {
      setOpen(false);
    }
  }, [triggerValue]);

  async function loadCommands() {
    setLoading(true);
    try {
      const caps = await getCapabilities();
      const agentCommands = caps.flatMap((c) => c.commands ?? []).map((cmd) => ({
        name: `/${cmd.name}`,
        description: cmd.description,
      }));
      const unique = new Map([...BUILTIN_COMMANDS, ...agentCommands].map((c) => [c.name, c]));
      setCommands([...unique.values()]);
    } catch {
      // Keep built-in commands
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter
    ? commands.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()) || c.description.toLowerCase().includes(filter.toLowerCase()))
    : commands;

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      onSelect(filtered[selectedIndex].name + " ");
      setOpen(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab" && filtered.length > 0) {
      e.preventDefault();
      onSelect(filtered[selectedIndex].name + " ");
      setOpen(false);
    }
  }, [open, filtered, selectedIndex, onSelect]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-cmd-item]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open || disabled) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-50 animate-fade-in">
      <div className="mx-4 rounded-xl border border-foreground/[0.12] glass-strong overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.3)]">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-foreground/[0.06]">
          <Command className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Commands</span>
          <span className="text-[0.625rem] text-muted-foreground ml-auto">
            <kbd className="px-1 py-0.5 rounded bg-foreground/[0.06] text-[0.5625rem]">&uarr;&darr;</kbd> navigate
            <kbd className="px-1 py-0.5 rounded bg-foreground/[0.06] text-[0.5625rem] ml-1">Enter</kbd> select
            <kbd className="px-1 py-0.5 rounded bg-foreground/[0.06] text-[0.5625rem] ml-1">Esc</kbd> close
          </span>
        </div>

        {/* Command list */}
        <div ref={listRef} className="max-h-64 overflow-y-auto scrollbar-hidden py-1">
          {loading && commands.length === 0 ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No matching commands
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.name}
                data-cmd-item
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all duration-150",
                  i === selectedIndex
                    ? "bg-foreground/[0.06] text-foreground"
                    : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground",
                )}
                onClick={() => {
                  onSelect(cmd.name + " ");
                  setOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="font-mono text-sm font-medium text-[var(--theme-accent)] shrink-0 w-24">{cmd.name}</span>
                <span className="text-sm truncate">{cmd.description}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
