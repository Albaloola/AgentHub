"use client";

import { useState, useEffect } from "react";
import { Command, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getCapabilities } from "@/lib/api";
import type { AgentCapabilities } from "@/lib/api";

interface CommandsMenuProps {
  onSelect: (command: string) => void;
  triggerValue: string;
  disabled?: boolean;
}

export function CommandsMenu({ onSelect, triggerValue, disabled }: CommandsMenuProps) {
  const [open, setOpen] = useState(false);
  const [commands, setCommands] = useState<AgentCapabilities["commands"]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (open && commands.length === 0) {
      loadCommands();
    }
  }, [open]);

  useEffect(() => {
    if (triggerValue.startsWith("/")) {
      setOpen(true);
      setFilter(triggerValue.slice(1));
    } else {
      setOpen(false);
    }
  }, [triggerValue]);

  async function loadCommands() {
    setLoading(true);
    try {
      const caps = await getCapabilities();
      const allCommands = caps.flatMap((c) => c.commands ?? []);
      const unique = new Map(allCommands.map((cmd) => [cmd.name, cmd]));
      setCommands([...unique.values()]);
    } catch {
      // No commands available
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(command: { name: string }) {
    onSelect(command.name);
    setOpen(false);
    setFilter("");
  }

  const filtered = filter
    ? commands.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
    : commands;

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all duration-200 hover:text-foreground cursor-pointer"
        disabled={disabled}
        onMouseEnter={(e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.boxShadow = "0 0 8px rgba(59,130,246,0.5), 0 0 20px rgba(59,130,246,0.2)"; e.currentTarget.style.background = "rgba(59,130,246,0.1)"; }}
        onMouseLeave={(e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "transparent"; }}
      >
        <Command className="h-3.5 w-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">
            No commands available
          </div>
        ) : (
          <ScrollArea className="max-h-64">
            <div className="p-1">
              {filtered.map((cmd) => (
                <button
                  key={cmd.name}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                  )}
                  onClick={() => handleSelect(cmd)}
                >
                  <span className="font-mono text-xs text-muted-foreground">{cmd.name}</span>
                  <span className="flex-1 truncate text-xs">{cmd.description}</span>
                  {cmd.requiresArgs && (
                    <span className="text-[10px] text-muted-foreground">requires args</span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
