"use client";

import { useState } from "react";
import { Brain, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import Markdown from "react-markdown";

export function ThinkingPanel() {
  const { thinkingContent, thinkingComplete, setThinkingContent } = useStore();
  const [collapsed, setCollapsed] = useState(false);

  if (!thinkingContent && !thinkingComplete) return null;

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
            <Brain className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Thinking</span>
            {thinkingComplete && (
              <Badge variant="secondary" className="text-[10px]">
                Done
              </Badge>
            )}
            {!thinkingComplete && (
              <Badge variant="outline" className="text-[10px] animate-pulse">
                Thinking...
              </Badge>
            )}
          </div>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setThinkingContent("", true)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {!collapsed && (
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="p-3 text-xs text-muted-foreground leading-relaxed">
            <Markdown>{thinkingContent}</Markdown>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
