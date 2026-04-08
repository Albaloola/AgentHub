"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Bot, MessageSquare, Settings, Activity, X, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getConversations, getAgents } from "@/lib/api";
import type { ConversationWithDetails, AgentWithStatus } from "@/lib/types";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const loadCommands = useCallback(async () => {
    try {
      const [convs, agents] = await Promise.all([getConversations(), getAgents()]);

      const items: CommandItem[] = [
        {
          id: "nav-dashboard",
          label: "Go to Dashboard",
          description: "View all agents and activity",
          icon: <Activity className="h-4 w-4" />,
          action: () => router.push("/"),
          keywords: ["dashboard", "home", "activity"],
        },
        {
          id: "nav-agents",
          label: "Manage Agents",
          description: "Add, edit, or remove agents",
          icon: <Bot className="h-4 w-4" />,
          action: () => router.push("/agents"),
          keywords: ["agents", "manage", "add", "bot"],
        },
        {
          id: "nav-groups",
          label: "Group Chats",
          description: "Create or manage group conversations",
          icon: <MessageSquare className="h-4 w-4" />,
          action: () => router.push("/groups"),
          keywords: ["group", "multi", "team"],
        },
        {
          id: "nav-settings",
          label: "Settings",
          description: "Configure AgentHub",
          icon: <Settings className="h-4 w-4" />,
          action: () => router.push("/settings"),
          keywords: ["settings", "config", "preferences"],
        },
        ...convs.map((conv) => ({
          id: `conv-${conv.id}`,
          label: conv.name,
          description: `Conversation${conv.type === "group" ? " (Group)" : ""}`,
          icon: <MessageSquare className="h-4 w-4" />,
          action: () => router.push(`/chat/${conv.id}`),
          keywords: ["chat", "conversation", "message", ...conv.agents.map((a) => a.name)],
        })),
        ...agents.map((agent) => ({
          id: `agent-${agent.id}`,
          label: agent.name,
          description: `${agent.gateway_type} agent`,
          icon: <Bot className="h-4 w-4" />,
          action: () => router.push(`/agents/${agent.id}`),
          keywords: ["agent", "bot", "gateway", agent.gateway_type],
        })),
      ];

      setCommands(items);
    } catch {
      // Silently fail
    }
  }, [router]);

  useEffect(() => {
    if (open) {
      loadCommands();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  const filtered = query
    ? commands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.description.toLowerCase().includes(query.toLowerCase()) ||
          cmd.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase())),
      )
    : commands;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].action();
        onOpenChange(false);
      } else if (e.key === "Escape") {
        onOpenChange(false);
      }
    },
    [filtered, selectedIndex, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 top-[20%] -translate-y-0">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          {query && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setQuery("")}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          <div className="p-2">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No results for "{query}"
              </div>
            ) : (
              filtered.map((cmd, i) => (
                <button
                  key={cmd.id}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                    i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                  )}
                  onClick={() => { cmd.action(); onOpenChange(false); }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <span className="text-muted-foreground">{cmd.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{cmd.label}</div>
                    <div className="text-xs text-muted-foreground">{cmd.description}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border px-3 py-2 flex items-center gap-3 text-[0.625rem] text-muted-foreground">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
