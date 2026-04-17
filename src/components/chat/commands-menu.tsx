"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Command, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCapabilities } from "@/lib/api";
import type { AgentCapabilities } from "@/lib/frontend/api/meta";
import type { ChatChannelContext } from "./chat-channel-context";

type CommandSource = "core" | "template" | "agent";

interface CommandItem {
  name: string;
  description: string;
  source: CommandSource;
  scopeLabel?: string;
  insertText?: string;
}

const BUILTIN_COMMANDS: CommandItem[] = [
  { name: "/reset", description: "Clear conversation context", source: "core" },
  { name: "/compact", description: "Compress old messages to save tokens", source: "core" },
  { name: "/export", description: "Export conversation as markdown", source: "core" },
  { name: "/branch", description: "Fork conversation from this point", source: "core" },
  { name: "/help", description: "Show available commands", source: "core" },
  { name: "/stop", description: "Stop the current generation", source: "core" },
  { name: "/clear", description: "Clear chat history", source: "core" },
];

interface CommandsMenuProps {
  onSelect: (command: string) => void;
  triggerValue: string;
  disabled?: boolean;
  channelContext?: ChatChannelContext | null;
}

function getSourceBadge(source: CommandSource) {
  switch (source) {
    case "template":
      return "Template";
    case "agent":
      return "Agent";
    default:
      return "Core";
  }
}

function getScopedAgentCommands(
  capabilities: AgentCapabilities[],
  channelContext: ChatChannelContext | null | undefined,
): CommandItem[] {
  const relevantCapabilities = channelContext?.agentIds.length
    ? capabilities.filter((capability) => channelContext.agentIds.includes(capability.agent_id))
    : capabilities;

  const mergedCommands = new Map<
    string,
    {
      name: string;
      description: string;
      source: CommandSource;
      sourceAgents: string[];
    }
  >();

  for (const capability of relevantCapabilities) {
    for (const command of capability.commands ?? []) {
      const normalizedName = `/${command.name}`;
      const existing = mergedCommands.get(normalizedName);

      if (existing) {
        existing.sourceAgents.push(capability.agent_name);
        if (existing.description !== command.description) {
          existing.description = `${existing.description} / ${command.description}`;
        }
        continue;
      }

      mergedCommands.set(normalizedName, {
        name: normalizedName,
        description: command.description,
        source: "agent",
        sourceAgents: [capability.agent_name],
      });
    }
  }

  return Array.from(mergedCommands.values())
    .map((command) => ({
      name: command.name,
      description: command.description,
      source: command.source,
      scopeLabel:
        command.sourceAgents.length === 1
          ? command.sourceAgents[0]
          : `${command.sourceAgents.slice(0, 2).join(", ")}${command.sourceAgents.length > 2 ? ` +${command.sourceAgents.length - 2}` : ""}`,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function CommandsMenu({
  onSelect,
  triggerValue,
  disabled,
  channelContext,
}: CommandsMenuProps) {
  const [open, setOpen] = useState(false);
  const [capabilities, setCapabilities] = useState<AgentCapabilities[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const deferredFilter = useDeferredValue(filter);

  useEffect(() => {
    if (!triggerValue.startsWith("/")) {
      setOpen(false);
      setFilter("");
      setSelectedIndex(0);
      return;
    }

    setOpen(true);
    setFilter(triggerValue.slice(1));
    setSelectedIndex(0);
  }, [triggerValue]);

  useEffect(() => {
    loadedRef.current = false;
    setCapabilities([]);
  }, [channelContext?.channelId]);

  useEffect(() => {
    if (!open || loadedRef.current) {
      return;
    }

    loadedRef.current = true;
    let cancelled = false;

    async function loadCommands() {
      setLoading(true);
      try {
        const nextCapabilities = await getCapabilities(channelContext?.channelId ?? undefined);
        if (!cancelled) {
          setCapabilities(nextCapabilities);
        }
      } catch {
        // Keep built-ins and local channel templates if capability discovery fails.
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCommands();

    return () => {
      cancelled = true;
    };
  }, [channelContext?.channelId, open]);

  const commands = useMemo(() => {
    const templateCommands: CommandItem[] = (channelContext?.suggestedCommands ?? []).map((command) => ({
      ...command,
      source: "template",
    }));
    const agentCommands = getScopedAgentCommands(capabilities, channelContext);

    return [...templateCommands, ...agentCommands, ...BUILTIN_COMMANDS];
  }, [capabilities, channelContext]);

  const filteredCommands = useMemo(() => {
    const normalizedFilter = deferredFilter.trim().toLowerCase();
    if (!normalizedFilter) {
      return commands;
    }

    return commands.filter((command) =>
      command.name.toLowerCase().includes(normalizedFilter) ||
      command.description.toLowerCase().includes(normalizedFilter) ||
      command.scopeLabel?.toLowerCase().includes(normalizedFilter),
    );
  }, [commands, deferredFilter]);

  useEffect(() => {
    if (selectedIndex < filteredCommands.length) {
      return;
    }
    setSelectedIndex(filteredCommands.length > 0 ? filteredCommands.length - 1 : 0);
  }, [filteredCommands.length, selectedIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (filteredCommands.length === 0) {
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
        }
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((previous) => Math.min(previous + 1, filteredCommands.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((previous) => Math.max(previous - 1, 0));
      } else if ((event.key === "Enter" || event.key === "Tab") && filteredCommands.length > 0) {
        event.preventDefault();
        const command = filteredCommands[selectedIndex];
        onSelect(command.insertText ?? `${command.name} `);
        setOpen(false);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filteredCommands, onSelect, open, selectedIndex]);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }

    const items = listRef.current.querySelectorAll<HTMLElement>("[data-cmd-item]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open || disabled) {
    return null;
  }

  return (
    <div className="absolute inset-x-0 bottom-full z-50 mb-3 animate-fade-in">
      <div className="mx-2 overflow-hidden rounded-[var(--workspace-radius-lg)] border border-[var(--panel-border)] glass-strong shadow-[var(--panel-shadow-dramatic)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-foreground/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <Command className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-[var(--tracking-eyebrow)] text-muted-foreground">
              Commands
            </span>
          </div>
          {channelContext && (
            <span className="rounded-full border border-foreground/[0.08] bg-foreground/[0.04] px-2 py-1 text-[var(--text-label)] text-foreground/80">
              {channelContext.label}
            </span>
          )}
          <span className="ml-auto text-[var(--text-label)] text-muted-foreground">
            <kbd className="rounded bg-foreground/[0.06] px-1 py-0.5">↑↓</kbd>{" "}
            move
            {" · "}
            <kbd className="rounded bg-foreground/[0.06] px-1 py-0.5">Enter</kbd>{" "}
            choose
            {" · "}
            <kbd className="rounded bg-foreground/[0.06] px-1 py-0.5">Esc</kbd>{" "}
            close
          </span>
        </div>

        <div
          ref={listRef}
          role="listbox"
          aria-label="Available commands"
          className="max-h-72 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-rounded"
        >
          {loading && commands.length === BUILTIN_COMMANDS.length + (channelContext?.suggestedCommands.length ?? 0) ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCommands.length === 0 ? (
            <div className="py-5 text-center text-sm text-muted-foreground">
              No matching commands for this channel
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <button
                key={`${command.source}:${command.name}:${command.scopeLabel ?? "global"}`}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                data-cmd-item
                className={cn(
                  "grid w-full grid-cols-[minmax(0,auto)_1fr_auto] items-center gap-3 px-4 py-3 text-left transition-colors",
                  index === selectedIndex
                    ? "bg-foreground/[0.06] text-foreground"
                    : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground",
                )}
                onClick={() => {
                  onSelect(command.insertText ?? `${command.name} `);
                  setOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="font-mono text-sm font-medium text-[var(--theme-accent)]">
                  {command.name}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm">{command.description}</p>
                  {command.scopeLabel && (
                    <p className="truncate text-[var(--text-caption)] text-muted-foreground/80">
                      {command.scopeLabel}
                    </p>
                  )}
                </div>
                <span className="rounded-full border border-foreground/[0.08] px-2 py-1 text-[var(--text-label)] uppercase tracking-[var(--tracking-label)] text-muted-foreground">
                  {getSourceBadge(command.source)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
