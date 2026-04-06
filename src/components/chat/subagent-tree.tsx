"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle, Network, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

export function SubagentTree() {
  const { subagents, clearSubagents } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (subagents.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  function statusIcon(status: string) {
    switch (status) {
      case "running":
        return <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />;
      case "completed":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "failed":
        return <XCircle className="h-3 w-3 text-red-500" />;
    }
  }

  function statusBadge(status: string) {
    switch (status) {
      case "running":
        return <Badge variant="outline" className="text-[10px]">Running</Badge>;
      case "completed":
        return <Badge variant="secondary" className="text-[10px]">Done</Badge>;
      case "failed":
        return <Badge variant="destructive" className="text-[10px]">Failed</Badge>;
    }
  }

  return (
    <div
      className={cn(
        "border-l border-border bg-card/50 backdrop-blur-sm transition-all",
        collapsed ? "w-10" : "w-80",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Subagents</span>
            <Badge variant="outline" className="text-[10px]">
              {subagents.length}
            </Badge>
          </div>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => clearSubagents()}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {!collapsed && (
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="p-2 space-y-1">
            {subagents.map((sa) => (
              <div key={sa.id} className="rounded-md border border-border bg-muted/30">
                <button
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent/50 rounded-md"
                  onClick={() => toggleExpand(sa.id)}
                >
                  {expanded.has(sa.id) ? (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  )}
                  {statusIcon(sa.status)}
                  <span className="flex-1 truncate font-medium">{sa.goal}</span>
                  {statusBadge(sa.status)}
                </button>

                {expanded.has(sa.id) && (
                  <div className="px-6 pb-2 text-[11px] text-muted-foreground space-y-1">
                    <div>
                      <span className="font-medium">ID:</span> {sa.id}
                    </div>
                    <div>
                      <span className="font-medium">Parent:</span> {sa.parent_agent_id}
                    </div>
                    {sa.result && (
                      <div>
                        <span className="font-medium">Result:</span> {sa.result}
                      </div>
                    )}
                    {sa.error && (
                      <div className="text-red-500">
                        <span className="font-medium">Error:</span> {sa.error}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground/60">
                      Spawned: {new Date(sa.spawned_at).toLocaleTimeString()}
                    </div>
                    {sa.completed_at && (
                      <div className="text-[10px] text-muted-foreground/60">
                        Completed: {new Date(sa.completed_at).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
