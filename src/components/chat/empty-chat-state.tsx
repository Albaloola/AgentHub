"use client";

import { useState, useEffect } from "react";
import { Code2, Lightbulb, Search, FileText, Rocket, Sparkles } from "lucide-react";
import { LivingAvatar } from "@/components/ui/living-avatar";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

const ALL_SUGGESTIONS = [
  { tag: "Code Help", tagColor: "#10b981", desc: "Help me write or debug code", prompt: "Help me write clean, well-documented code", icon: Code2 },
  { tag: "Suggestions", tagColor: "#f59e0b", desc: "Help with me ideas", prompt: "Help me brainstorm creative ideas", icon: Lightbulb },
  { tag: "Research", tagColor: "#06b6d4", desc: "Help me research a topic", prompt: "Help me research and summarize a topic", icon: Search },
  { tag: "Writing", tagColor: "#8b5cf6", desc: "Help me draft content", prompt: "Help me write a professional document", icon: FileText },
  { tag: "Planning", tagColor: "#ec4899", desc: "Help me plan a project", prompt: "Help me create a detailed project plan", icon: Rocket },
  { tag: "Creative", tagColor: "#f97316", desc: "Think outside the box", prompt: "Help me come up with creative solutions", icon: Sparkles },
];

export function EmptyChatState({
  agentName,
  agentId,
  onSuggestionClick,
}: {
  agentName?: string;
  agentId?: string;
  onSuggestionClick: (prompt: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [activeSet, setActiveSet] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Rotate suggestions smoothly every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setActiveSet((prev) => (prev + 1) % 2);
        setTransitioning(false);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const firstName = agentName?.split("(")[0]?.trim() || "there";
  const suggestions = ALL_SUGGESTIONS.slice(activeSet * 3, activeSet * 3 + 3);

  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[65vh] text-center px-4 transition-opacity duration-700",
      mounted ? "opacity-100" : "opacity-0",
    )}>
      {/* Planet avatar with star ring (Uranus-style) */}
      <div className="relative mb-10 group">
        {/* Outer star ring */}
        <div className="absolute inset-[-30px] rounded-full border border-white/[0.04] animate-[spin_60s_linear_infinite]">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <div
              key={deg}
              className="absolute h-1 w-1 rounded-full bg-white/40"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${deg}deg) translateX(80px) translateY(-50%)`,
              }}
            />
          ))}
        </div>

        {/* Middle ring (tilted like Uranus) */}
        <div
          className="absolute inset-[-20px] rounded-full border border-white/[0.06] animate-[spin_40s_linear_infinite_reverse]"
          style={{ transform: "rotateX(60deg)" }}
        >
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <div
              key={deg}
              className="absolute h-1.5 w-1.5 rounded-full bg-blue-400/30"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${deg}deg) translateX(65px) translateY(-50%)`,
              }}
            />
          ))}
        </div>

        {/* Ambient glow */}
        <div className="absolute -inset-8 rounded-full bg-gradient-to-b from-blue-500/10 via-violet-500/5 to-transparent blur-2xl animate-[luminance-pulse_4s_ease-in-out_infinite]" />

        {/* Planet body (agent avatar) */}
        <div className="relative">
          {agentId ? (
            <div
              className={cn(
                "flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white shadow-xl",
                getAvatarColor(agentId),
              )}
              style={{
                boxShadow: "0 0 30px rgba(59,130,246,0.15), 0 0 60px rgba(139,92,246,0.08), inset 0 -8px 20px rgba(0,0,0,0.3)",
              }}
            >
              {getInitials(agentName || "?")}
              {/* Surface sheen */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-6 bg-gradient-to-b from-white/15 to-transparent rounded-full blur-sm" />
            </div>
          ) : (
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500/20 via-violet-500/15 to-cyan-500/10 flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
        </div>
      </div>

      {/* Greeting */}
      <h1 className="text-4xl font-light text-foreground/90 mb-1 tracking-tight">
        Hey! {firstName}
      </h1>
      <h2 className="text-4xl font-light text-foreground/40 mb-10 tracking-tight">
        What can I help with?
      </h2>

      {/* Rotating suggestion cards */}
      <div className={cn(
        "flex gap-4 max-w-2xl w-full transition-all duration-400",
        transitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0",
      )}>
        {suggestions.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.tag}
              onClick={() => onSuggestionClick(card.prompt)}
              className="flex-1 flex flex-col items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all duration-300 hover:bg-white/[0.05] group"
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 12px ${card.tagColor}40, 0 0 30px ${card.tagColor}15`;
                e.currentTarget.style.borderColor = `${card.tagColor}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              }}
            >
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border"
                style={{ color: card.tagColor, borderColor: `${card.tagColor}40`, background: `${card.tagColor}10` }}
              >
                <Icon className="h-3 w-3" />
                {card.tag}
              </span>
              <p className="text-sm text-muted-foreground/60 group-hover:text-muted-foreground/80 transition-colors leading-relaxed">
                {card.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Dots indicator for suggestion rotation */}
      <div className="flex gap-1.5 mt-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              activeSet === i ? "w-4 bg-blue-400/60" : "w-1.5 bg-white/10",
            )}
          />
        ))}
      </div>
    </div>
  );
}
