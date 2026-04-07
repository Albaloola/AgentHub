"use client";

import { useState, useEffect, useMemo } from "react";
import { MessageSquare, Sparkles, Zap, Brain, PenTool, Code2, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTION_POOLS = [
  [
    { icon: PenTool, text: "Write a blog post about AI agents", prompt: "Write a blog post about AI agents and their impact on productivity" },
    { icon: Code2, text: "Explain how SSE streaming works", prompt: "Explain how Server-Sent Events streaming works in web applications" },
    { icon: Brain, text: "Compare different LLM architectures", prompt: "Compare different LLM architectures and their trade-offs" },
    { icon: Lightbulb, text: "Brainstorm startup ideas", prompt: "Brainstorm 5 innovative startup ideas in the AI space" },
  ],
  [
    { icon: Zap, text: "Create a Python script for data analysis", prompt: "Create a Python script that analyzes CSV data and generates visualizations" },
    { icon: Sparkles, text: "Write a creative short story", prompt: "Write a creative short story about a robot learning to paint" },
    { icon: Code2, text: "Build a REST API with Express", prompt: "Build a REST API with Express.js that handles user authentication" },
    { icon: Brain, text: "Summarize the latest AI research", prompt: "Summarize the key findings from recent AI research papers" },
  ],
  [
    { icon: PenTool, text: "Draft an email to my team", prompt: "Draft a professional email to my team about our quarterly goals" },
    { icon: Lightbulb, text: "Explain quantum computing simply", prompt: "Explain quantum computing in simple terms for a non-technical audience" },
    { icon: Zap, text: "Generate SQL queries for analytics", prompt: "Generate SQL queries for common analytics patterns like cohort analysis" },
    { icon: Code2, text: "Debug this TypeScript error", prompt: "Help me debug a TypeScript type error in my React application" },
  ],
];

export function EmptyChatState({
  agentName,
  onSuggestionClick,
}: {
  agentName?: string;
  onSuggestionClick: (prompt: string) => void;
}) {
  const [poolIndex, setPoolIndex] = useState(0);
  const [fade, setFade] = useState(false);

  const suggestions = useMemo(() => SUGGESTION_POOLS[poolIndex % SUGGESTION_POOLS.length], [poolIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setPoolIndex((prev) => (prev + 1) % SUGGESTION_POOLS.length);
        setFade(false);
      }, 500);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-8">
        <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-blue-500/10 to-violet-600/10 border border-white/[0.06] flex items-center justify-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-blue-500/5 to-violet-600/5 blur-xl animate-[luminance-pulse_4s_ease-in-out_infinite]" />
      </div>

      <h2 className="text-3xl font-semibold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent mb-3">
        Ask anything
      </h2>
      <p className="text-base text-muted-foreground/50 max-w-md mb-10">
        {agentName ? `Start a conversation with ${agentName}` : "Start a conversation and watch the stars align"}
      </p>

      <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
        {suggestions.map((s, i) => {
          const Icon = s.icon;
          return (
            <button
              key={s.text + poolIndex}
              onClick={() => onSuggestionClick(s.prompt)}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-[0_0_20px_oklch(0.55_0.24_264/0.06)] group",
                fade ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
              )}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" />
              <span className="text-sm text-muted-foreground/60 group-hover:text-muted-foreground/90 transition-colors leading-snug">
                {s.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
