"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Terminal,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ToolCall } from "@/lib/types";

interface TerminalViewerProps {
  toolCalls: ToolCall[];
  isStreaming?: boolean;
}

export function TerminalViewer({ toolCalls, isStreaming }: TerminalViewerProps) {
  const [expandedCalls, setExpandedCalls] = useState<Set<string>>(new Set());

  if (toolCalls.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpandedCalls((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-border/20 glass animate-fade-in">
      {/* macOS terminal header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/20 bg-black/30">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70 hover:bg-red-500 transition-colors" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70 hover:bg-yellow-500 transition-colors" />
          <div className="w-3 h-3 rounded-full bg-green-500/70 hover:bg-green-500 transition-colors" />
        </div>
        <div className="flex items-center gap-2 ml-2">
          <Terminal className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-[0.6875rem] text-muted-foreground/50 font-mono">
            agent-tools
          </span>
        </div>
        <span className="text-[0.625rem] text-muted-foreground/30 ml-auto tabular-nums">
          {toolCalls.length} call{toolCalls.length !== 1 && "s"}
        </span>
      </div>

      {/* Terminal body */}
      <div className="bg-black/40 p-3 space-y-1 font-mono text-xs">
        {toolCalls.map((tc) => {
          const isExpanded = expandedCalls.has(tc.id);
          const inputPreview = getInputPreview(tc.input);

          return (
            <div key={tc.id}>
              {/* Command line */}
              <button
                className={cn(
                  "flex items-start gap-2 w-full text-left rounded-lg px-2 py-1.5 transition-colors",
                  "hover:bg-foreground/5",
                )}
                onClick={() => toggleExpand(tc.id)}
                aria-label={`${isExpanded ? "Collapse" : "Expand"} tool call: ${tc.tool_name}`}
                aria-expanded={isExpanded}
              >
                {/* Status indicator */}
                <div className="shrink-0 mt-0.5">
                  {tc.status === "pending" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-400" />
                  ) : tc.status === "success" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-400" />
                  )}
                </div>

                {/* Command */}
                <div className="flex-1 min-w-0">
                  <span className="text-emerald-400/80 select-none">$ </span>
                  <span className="text-cyan-300 font-semibold">{tc.tool_name}</span>
                  {inputPreview && (
                    <span className="text-muted-foreground/60 ml-2 truncate inline-block max-w-[60%] align-bottom">
                      {inputPreview}
                    </span>
                  )}
                </div>

                {/* Expand indicator */}
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-0.5" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-0.5" />
                )}
              </button>

              {/* Expanded input/output */}
              {isExpanded && (
                <div
                  className="ml-7 mt-1 mb-2 space-y-2 animate-fade-in"
                  style={{ animationDuration: "150ms" }}
                >
                  {/* Input */}
                  <TerminalBlock
                    label="input"
                    content={formatJSON(tc.input)}
                    labelColor="text-blue-400/60"
                  />

                  {/* Output */}
                  {tc.output && tc.output !== "{}" && (
                    <TerminalBlock
                      label={tc.status === "error" ? "stderr" : "output"}
                      content={formatJSON(tc.output)}
                      labelColor={tc.status === "error" ? "text-red-400/60" : "text-emerald-400/60"}
                    />
                  )}

                  {/* Timestamp */}
                  <div className="text-[0.625rem] text-muted-foreground/30 pl-1">
                    {new Date(tc.timestamp + "Z").toLocaleTimeString()}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Streaming cursor */}
        {isStreaming && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-400" />
            <span className="text-emerald-400/80 select-none">$ </span>
            <span className="w-2 h-4 bg-emerald-400/60 animate-pulse rounded-sm" />
          </div>
        )}
      </div>
    </div>
  );
}

function TerminalBlock({
  label,
  content,
  labelColor,
}: {
  label: string;
  content: string;
  labelColor: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border/10 bg-black/30 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 border-b border-border/10">
        <span className={cn("text-[0.625rem] font-sans", labelColor)}>{label}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded"
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <Check className="h-2.5 w-2.5 text-emerald-400" />
          ) : (
            <Copy className="h-2.5 w-2.5 text-muted-foreground/40" />
          )}
        </Button>
      </div>
      <pre className="px-3 py-2 text-[0.6875rem] text-foreground/70 whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
        {content}
      </pre>
    </div>
  );
}

function getInputPreview(input: string): string {
  try {
    const parsed = JSON.parse(input);
    // Try to find a meaningful preview from common field names
    const previewKeys = ["command", "query", "path", "url", "code", "content", "message", "name", "file"];
    for (const key of previewKeys) {
      if (typeof parsed[key] === "string" && parsed[key].length > 0) {
        const val = parsed[key];
        return val.length > 60 ? val.slice(0, 57) + "..." : val;
      }
    }
    // Fall back to first string value
    for (const val of Object.values(parsed)) {
      if (typeof val === "string" && val.length > 0) {
        return val.length > 60 ? val.slice(0, 57) + "..." : val;
      }
    }
    return "";
  } catch {
    return input.length > 60 ? input.slice(0, 57) + "..." : input;
  }
}

function formatJSON(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}
