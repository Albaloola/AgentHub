"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Code2, Lightbulb, Search, FileText, Rocket, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { LivingAvatar } from "@/components/ui/living-avatar";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

const ALL_SUGGESTIONS = [
  // Set 0
  { tag: "Code Help", tagColor: "#10b981", desc: "Help me write or debug code", prompt: "Help me write clean, well-documented code", icon: Code2 },
  { tag: "Suggestions", tagColor: "#f59e0b", desc: "Help with me ideas", prompt: "Help me brainstorm creative ideas", icon: Lightbulb },
  { tag: "Research", tagColor: "#06b6d4", desc: "Help me research a topic", prompt: "Help me research and summarize a topic", icon: Search },
  // Set 1
  { tag: "Writing", tagColor: "#8b5cf6", desc: "Help me draft content", prompt: "Help me write a professional document", icon: FileText },
  { tag: "Planning", tagColor: "#ec4899", desc: "Help me plan a project", prompt: "Help me create a detailed project plan", icon: Rocket },
  { tag: "Creative", tagColor: "#f97316", desc: "Think outside the box", prompt: "Help me come up with creative solutions", icon: Sparkles },
  // Set 2
  { tag: "Debug", tagColor: "#ef4444", desc: "Fix errors in my code", prompt: "Help me debug an error I'm encountering", icon: Code2 },
  { tag: "Explain", tagColor: "#14b8a6", desc: "Break down a concept", prompt: "Explain a complex topic in simple terms", icon: Lightbulb },
  { tag: "Automate", tagColor: "#a855f7", desc: "Streamline a workflow", prompt: "Help me automate a repetitive task", icon: Rocket },
  // Set 3
  { tag: "Review", tagColor: "#3b82f6", desc: "Review my work", prompt: "Review my code or document for improvements", icon: Search },
  { tag: "Compare", tagColor: "#f59e0b", desc: "Weigh my options", prompt: "Help me compare different approaches or tools", icon: Lightbulb },
  { tag: "Summarize", tagColor: "#10b981", desc: "Condense information", prompt: "Summarize a long document or article for me", icon: FileText },
  // Set 4
  { tag: "Deploy", tagColor: "#06b6d4", desc: "Ship to production", prompt: "Help me deploy my application to production", icon: Rocket },
  { tag: "Design", tagColor: "#ec4899", desc: "Architect a system", prompt: "Help me design the architecture for a system", icon: Sparkles },
  { tag: "Learn", tagColor: "#8b5cf6", desc: "Teach me something", prompt: "Teach me about a technology I want to learn", icon: Lightbulb },
];

const TOTAL_SETS = 5;

// Default greetings - sassy, funny, varied. Agents can update these.
const GREETINGS = [
  { line1: "Hey! I'm {name}", line2: "What can I help with?" },
  { line1: "Hey! I'm {name}", line2: "Let's get something done." },
  { line1: "{name} here!", line2: "What's on your mind?" },
  { line1: "It's {name}.", line2: "Hit me with your best shot." },
  { line1: "Yo! {name} reporting.", line2: "What are we cooking today?" },
  { line1: "{name} at your service.", line2: "Don't be shy, ask away." },
  { line1: "Hey! I'm {name}", line2: "I was just thinking about you." },
  { line1: "{name} online.", line2: "Ready when you are, boss." },
  { line1: "Oh hey, it's you!", line2: "I'm {name}. What's up?" },
  { line1: "Welcome back!", line2: "{name} missed you. Not really. Maybe." },
  { line1: "{name} here.", line2: "Let's make something awesome." },
  { line1: "Hey! I'm {name}", line2: "Ask me literally anything." },
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
  const [greetingIdx, setGreetingIdx] = useState(() => Math.floor(Math.random() * GREETINGS.length));
  const [greetingFade, setGreetingFade] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Rotate greeting every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setGreetingFade(true);
      setTimeout(() => {
        setGreetingIdx((prev) => (prev + 1) % GREETINGS.length);
        setGreetingFade(false);
      }, 400);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Auto-rotate suggestions with resettable timer
  const autoRotateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defaultDelay = 6000;
  const userInteractDelay = 10000;

  const startAutoRotate = useCallback((delay: number) => {
    if (autoRotateRef.current) clearTimeout(autoRotateRef.current);
    autoRotateRef.current = setTimeout(() => {
      setTransitioning(true);
      setTimeout(() => {
        setActiveSet((prev) => (prev + 1) % TOTAL_SETS);
        setTransitioning(false);
        startAutoRotate(defaultDelay);
      }, 400);
    }, delay);
  }, []);

  useEffect(() => {
    startAutoRotate(defaultDelay);
    return () => { if (autoRotateRef.current) clearTimeout(autoRotateRef.current); };
  }, [startAutoRotate]);

  const firstName = agentName?.split("(")[0]?.trim() || "there";

  function switchSet(idx: number) {
    if (idx === activeSet) return;
    setTransitioning(true);
    setTimeout(() => {
      setActiveSet(idx);
      setTransitioning(false);
    }, 300);
    // Reset timer to longer delay after user interaction
    startAutoRotate(userInteractDelay);
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[65vh] text-center px-4",
      mounted ? "opacity-100" : "opacity-0",
    )}
    style={{ transition: "opacity 0.7s ease-out" }}
    >
      {/* Planet avatar with balanced orbital rings - smooth slide-up entrance */}
      <div
        className="relative mb-10"
        style={{
          width: 200,
          height: 200,
          transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease-out",
          transform: mounted ? "translateY(0)" : "translateY(40px)",
          opacity: mounted ? 1 : 0,
        }}
      >
        {/* Ambient glow behind everything */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-blue-500/12 via-violet-500/8 to-cyan-500/4 blur-3xl animate-[luminance-pulse_4s_ease-in-out_infinite]" />

        {/* Outer ring - spins clockwise, centered */}
        <div
          className="absolute rounded-full border border-foreground/[0.06]"
          style={{
            top: "50%", left: "50%",
            width: 180, height: 180,
            marginTop: -90, marginLeft: -90,
            animation: "spin 50s linear infinite",
          }}
        >
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
            <div
              key={deg}
              className="absolute rounded-full bg-white"
              style={{
                width: i % 2 === 0 ? 3 : 2,
                height: i % 2 === 0 ? 3 : 2,
                top: "50%", left: "50%",
                transform: `rotate(${deg}deg) translateX(90px) translateY(-50%)`,
                animation: `luminance-pulse ${2 + (i % 3)}s ease-in-out infinite`,
                animationDelay: `${i * 0.4}s`,
                opacity: 0.6,
              }}
            />
          ))}
        </div>

        {/* Inner ring - spins counter-clockwise, smaller */}
        <div
          className="absolute rounded-full border border-foreground/[0.04]"
          style={{
            top: "50%", left: "50%",
            width: 140, height: 140,
            marginTop: -70, marginLeft: -70,
            animation: "spin 35s linear infinite reverse",
          }}
        >
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <div
              key={deg}
              className="absolute rounded-full"
              style={{
                width: 4,
                height: 4,
                top: "50%", left: "50%",
                transform: `rotate(${deg}deg) translateX(70px) translateY(-50%)`,
                background: i % 2 === 0 ? "rgba(96,165,250,0.7)" : "rgba(139,92,246,0.6)",
                boxShadow: i % 2 === 0
                  ? "0 0 6px rgba(96,165,250,0.5), 0 0 12px rgba(96,165,250,0.2)"
                  : "0 0 6px rgba(139,92,246,0.5), 0 0 12px rgba(139,92,246,0.2)",
                animation: `luminance-pulse ${1.5 + (i % 4) * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>

        {/* Planet body (agent avatar) - centered in 200x200 */}
        <div className="absolute" style={{ top: "50%", left: "50%", marginTop: -48, marginLeft: -48 }}>
          {agentId ? (
            <div
              className={cn(
                "relative flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white",
                getAvatarColor(agentId),
              )}
              style={{
                boxShadow: "0 0 25px rgba(59,130,246,0.12), 0 0 50px rgba(139,92,246,0.06), inset 0 -6px 16px rgba(0,0,0,0.3)",
              }}
            >
              {getInitials(agentName || "?")}
              {/* Surface sheen */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-5 bg-gradient-to-b from-foreground/15 to-transparent rounded-full blur-sm" />
            </div>
          ) : (
            <div className="flex h-24 w-24 rounded-full bg-gradient-to-br from-blue-500/20 via-violet-500/15 to-cyan-500/10 items-center justify-center">
              <Sparkles className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
        </div>
      </div>

      {/* Rotating greeting */}
      <div className={cn(
        "transition-all duration-400 mb-10",
        greetingFade ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0",
      )}>
        <h1 className="text-fluid-3xl font-bold text-foreground/90 mb-1 tracking-tight">
          {GREETINGS[greetingIdx].line1.replace("{name}", firstName)}
        </h1>
        <h2 className="text-fluid-3xl font-light text-foreground/40 tracking-tight">
          {GREETINGS[greetingIdx].line2.replace("{name}", firstName)}
        </h2>
      </div>

      {/* Rotating suggestion cards - fluid width, scales with viewport */}
      <div className="relative w-full" style={{ maxWidth: "clamp(500px, 60vw, 1000px)", minHeight: 140 }}>
        {Array.from({ length: TOTAL_SETS }).map((_, setIdx) => {
          const cards = ALL_SUGGESTIONS.slice(setIdx * 3, setIdx * 3 + 3);
          const isVisible = activeSet === setIdx && !transitioning;
          return (
            <div
              key={setIdx}
              className={cn(
                "absolute inset-0 grid grid-cols-3 gap-5 items-stretch transition-all duration-500",
                isVisible
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-4 pointer-events-none",
              )}
            >
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.tag}
                    onClick={() => onSuggestionClick(card.prompt)}
                    className="flex flex-col items-start gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-6 text-left transition-all duration-300 hover:bg-foreground/[0.05] group"
                    style={{ minHeight: "clamp(100px, 10vw, 140px)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 0 12px ${card.tagColor}40, 0 0 30px ${card.tagColor}15`;
                      e.currentTarget.style.borderColor = `${card.tagColor}40`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = "oklch(from var(--foreground) l c h / 0.06)";
                    }}
                  >
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium border shrink-0"
                      style={{ color: card.tagColor, borderColor: `${card.tagColor}40`, background: `${card.tagColor}10` }}
                    >
                      <Icon className="h-4 w-4" />
                      {card.tag}
                    </span>
                    <p className="text-sm text-muted-foreground/60 group-hover:text-muted-foreground/80 transition-colors leading-relaxed line-clamp-3 overflow-hidden">
                      {card.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Navigation: prev arrow + dots + next arrow */}
      <div className="flex items-center gap-2 mt-6 mb-8">
        <button
          onClick={() => switchSet((activeSet - 1 + TOTAL_SETS) % TOTAL_SETS)}
          className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground/40 hover:text-foreground hover:bg-foreground/[0.08] transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: TOTAL_SETS }).map((_, i) => (
          <button
            key={i}
            onClick={() => switchSet(i)}
            className={cn(
              "rounded-full transition-all duration-300 cursor-pointer",
              activeSet === i ? "w-5 h-2 bg-blue-400/60" : "w-2 h-2 bg-foreground/15 hover:bg-foreground/30",
            )}
          />
        ))}
        <button
          onClick={() => switchSet((activeSet + 1) % TOTAL_SETS)}
          className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground/40 hover:text-foreground hover:bg-foreground/[0.08] transition-all"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
