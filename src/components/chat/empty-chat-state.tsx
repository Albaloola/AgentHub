"use client";

import { useState, useEffect, useMemo } from "react";
import { Sparkles, Code2, Lightbulb, FileText, Rocket, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTION_CARDS = [
  {
    tag: "Code Help",
    tagColor: "#10b981",
    description: "Help me write or debug code",
    prompt: "Help me write clean, well-documented code for a task I describe",
    icon: Code2,
  },
  {
    tag: "Suggestions",
    tagColor: "#f59e0b",
    description: "Help with me ideas",
    prompt: "Help me brainstorm creative ideas and suggestions for my project",
    icon: Lightbulb,
  },
  {
    tag: "Research",
    tagColor: "#06b6d4",
    description: "Help me research a topic",
    prompt: "Help me research and summarize information about a topic",
    icon: Search,
  },
];

export function EmptyChatState({
  agentName,
  onSuggestionClick,
}: {
  agentName?: string;
  onSuggestionClick: (prompt: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const firstName = agentName?.split(" ")[0]?.split("(")[0]?.trim() || "there";

  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[60vh] text-center px-4 transition-opacity duration-700",
      mounted ? "opacity-100" : "opacity-0",
    )}>
      {/* Glowing orb - aurora/nebula sphere effect */}
      <div className="relative mb-8 w-48 h-48">
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-cyan-500/15 via-blue-500/10 to-transparent blur-3xl animate-[luminance-pulse_4s_ease-in-out_infinite]" />
        {/* Sphere body */}
        <div className="absolute inset-6 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-600/15 to-violet-600/10 rounded-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-cyan-400/10 to-white/5 rounded-full" />
          {/* Inner light refraction */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-8 bg-gradient-to-b from-white/10 to-transparent rounded-full blur-md" />
          {/* Grid lines on sphere */}
          <div className="absolute inset-0 rounded-full opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)
              `,
              backgroundSize: "24px 24px",
              mask: "radial-gradient(circle, black 60%, transparent 70%)",
              WebkitMask: "radial-gradient(circle, black 60%, transparent 70%)",
            }}
          />
        </div>
        {/* Ambient scatter */}
        <div className="absolute -inset-8 rounded-full bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent blur-2xl" />
      </div>

      {/* Greeting */}
      <h1 className="text-4xl font-light text-foreground/90 mb-1 tracking-tight">
        Hey! {firstName}
      </h1>
      <h2 className="text-4xl font-light text-foreground/50 mb-10 tracking-tight">
        What can I help with?
      </h2>

      {/* Suggestion cards */}
      <div className="flex gap-4 max-w-2xl w-full">
        {SUGGESTION_CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <button
              key={card.tag}
              onClick={() => onSuggestionClick(card.prompt)}
              className={cn(
                "flex-1 flex flex-col items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left",
                "transition-all duration-300 hover:bg-white/[0.05] group",
              )}
              style={{
                animationDelay: `${i * 100}ms`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 12px ${card.tagColor}40, 0 0 30px ${card.tagColor}15`;
                e.currentTarget.style.borderColor = `${card.tagColor}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              }}
            >
              {/* Colored tag */}
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border"
                style={{
                  color: card.tagColor,
                  borderColor: `${card.tagColor}40`,
                  background: `${card.tagColor}10`,
                }}
              >
                <Icon className="h-3 w-3" />
                {card.tag}
              </span>
              {/* Description */}
              <p className="text-sm text-muted-foreground/60 group-hover:text-muted-foreground/80 transition-colors leading-relaxed">
                {card.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
