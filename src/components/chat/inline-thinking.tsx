"use client";

import { useState, useMemo } from "react";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface InlineThinkingProps {
  thinkingContent: string;
  isComplete: boolean;
  isStreaming: boolean;
}

export function InlineThinking({
  thinkingContent,
  isComplete,
  isStreaming,
}: InlineThinkingProps) {
  const [expanded, setExpanded] = useState(false);

  const thinkingDuration = useMemo(() => {
    if (!isComplete) return null;
    // Estimate duration from content length: roughly 1s per 200 chars of thinking
    const chars = thinkingContent.length;
    const seconds = Math.max(1, Math.round(chars / 200));
    return seconds;
  }, [isComplete, thinkingContent]);

  if (!thinkingContent && !isStreaming) return null;

  return (
    <div className="w-full animate-fade-in">
      {/* Pill trigger */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 rounded-2xl px-4 py-2 text-xs transition-all duration-300",
          "glass-bubble border border-border/20 hover:border-border/40",
          !isComplete && isStreaming && "shadow-[0_0_12px_rgba(59,130,246,0.3),0_0_24px_rgba(59,130,246,0.15)] animate-pulse",
          isComplete && "hover:bg-white/5",
        )}
      >
        <Brain
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            isComplete ? "text-violet-400" : "text-blue-400",
          )}
        />

        {isComplete ? (
          <span className="text-muted-foreground/80">
            Thought for {thinkingDuration}s
          </span>
        ) : (
          <span className="text-muted-foreground/80 flex items-center gap-1">
            Thinking
            <span className="inline-flex gap-[2px] ml-0.5">
              <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          </span>
        )}

        {expanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground/50 ml-auto" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 ml-auto" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div
          className={cn(
            "mt-2 rounded-2xl border border-border/20 glass-bubble px-5 py-4",
            "animate-fade-in",
          )}
          style={{ animationDuration: "200ms" }}
        >
          <div className="prose prose-sm max-w-none dark:prose-invert text-muted-foreground/80 text-xs leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {thinkingContent}
            </ReactMarkdown>
            {isStreaming && !isComplete && (
              <span className="inline-block w-1.5 h-4 ml-0.5 rounded-sm bg-blue-400 animate-pulse" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
