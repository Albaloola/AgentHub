"use client";

import { Wrench, X, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ToolCall } from "@/lib/types";
import { useStore } from "@/lib/store";

export function ToolPanel() {
  const { toolPanelOpen, setToolPanelOpen, messages } = useStore();

  // Collect all tool calls from messages
  const allToolCalls: (ToolCall & { agentName?: string })[] = [];
  for (const msg of messages) {
    for (const tc of msg.tool_calls) {
      allToolCalls.push({ ...tc, agentName: msg.agent?.name });
    }
  }

  if (!toolPanelOpen) return null;

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-card flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          <span className="text-sm font-medium">Tool Calls</span>
          <Badge variant="secondary" className="text-[10px]">
            {allToolCalls.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setToolPanelOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {allToolCalls.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-8">
              No tool calls yet in this conversation.
            </p>
          )}

          {allToolCalls.map((tc) => (
            <ToolCallItem key={tc.id} toolCall={tc} />
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}

function ToolCallItem({
  toolCall,
}: {
  toolCall: ToolCall & { agentName?: string };
}) {
  const [open, setOpen] = useState(false);

  const statusColor =
    toolCall.status === "success"
      ? "border-emerald-500/30"
      : toolCall.status === "error"
        ? "border-red-500/30"
        : "border-yellow-500/30";

  const statusBg =
    toolCall.status === "success"
      ? "bg-emerald-500"
      : toolCall.status === "error"
        ? "bg-red-500"
        : "bg-yellow-500";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          "w-full flex items-start gap-2 rounded-md border p-2 text-xs transition-colors hover:bg-accent/50 text-left",
          statusColor,
        )}
      >
        <div className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", statusBg)} />
        <div className="flex-1 min-w-0">
          <div className="font-mono font-medium truncate">{toolCall.tool_name}</div>
          {toolCall.agentName && (
            <div className="text-[10px] text-muted-foreground">{toolCall.agentName}</div>
          )}
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1 py-0 shrink-0",
            toolCall.status === "success"
              ? "text-emerald-500"
              : toolCall.status === "error"
                ? "text-red-500"
                : "text-yellow-500",
          )}
        >
          {toolCall.status}
        </Badge>
        {open ? <ChevronDown className="h-3 w-3 shrink-0 mt-0.5" /> : <ChevronRight className="h-3 w-3 shrink-0 mt-0.5" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 rounded-md border border-border bg-muted/50 p-2 text-[11px] font-mono space-y-2">
          <div>
            <span className="text-muted-foreground font-sans text-[10px]">Input</span>
            <pre className="mt-0.5 whitespace-pre-wrap break-all">
              {formatJSON(toolCall.input)}
            </pre>
          </div>
          {toolCall.output && toolCall.output !== "{}" && (
            <div>
              <span className="text-muted-foreground font-sans text-[10px]">Output</span>
              <pre className="mt-0.5 whitespace-pre-wrap break-all">
                {formatJSON(toolCall.output)}
              </pre>
            </div>
          )}
          <div className="text-[10px] text-muted-foreground font-sans">
            {new Date(toolCall.timestamp + "Z").toLocaleTimeString()}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function formatJSON(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}
