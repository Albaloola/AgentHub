"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Code2, Lightbulb, Search, FileText, Rocket, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { LivingAvatar } from "@/components/ui/living-avatar";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

const ALL_SUGGESTIONS = [
  // Set 0
  { tag: "Code Help", tagColor: "var(--accent-emerald)", desc: "Help me write or debug code", prompt: "Help me write clean, well-documented code", icon: Code2 },
  { tag: "Suggestions", tagColor: "var(--accent-amber)", desc: "Help with me ideas", prompt: "Help me brainstorm creative ideas", icon: Lightbulb },
  { tag: "Research", tagColor: "var(--accent-cyan)", desc: "Help me research a topic", prompt: "Help me research and summarize a topic", icon: Search },
  // Set 1
  { tag: "Writing", tagColor: "var(--accent-violet)", desc: "Help me draft content", prompt: "Help me write a professional document", icon: FileText },
  { tag: "Planning", tagColor: "var(--accent-rose)", desc: "Help me plan a project", prompt: "Help me create a detailed project plan", icon: Rocket },
  { tag: "Creative", tagColor: "var(--accent-amber)", desc: "Think outside the box", prompt: "Help me come up with creative solutions", icon: Sparkles },
  // Set 2
  { tag: "Debug", tagColor: "var(--destructive)", desc: "Fix errors in my code", prompt: "Help me debug an error I'm encountering", icon: Code2 },
  { tag: "Explain", tagColor: "var(--accent-emerald)", desc: "Break down a concept", prompt: "Explain a complex topic in simple terms", icon: Lightbulb },
  { tag: "Automate", tagColor: "var(--accent-violet)", desc: "Streamline a workflow", prompt: "Help me automate a repetitive task", icon: Rocket },
  // Set 3
  { tag: "Review", tagColor: "var(--accent-blue)", desc: "Review my work", prompt: "Review my code or document for improvements", icon: Search },
  { tag: "Compare", tagColor: "var(--accent-amber)", desc: "Weigh my options", prompt: "Help me compare different approaches or tools", icon: Lightbulb },
  { tag: "Summarize", tagColor: "var(--accent-emerald)", desc: "Condense information", prompt: "Summarize a long document or article for me", icon: FileText },
  // Set 4
  { tag: "Deploy", tagColor: "var(--accent-cyan)", desc: "Ship to production", prompt: "Help me deploy my application to production", icon: Rocket },
  { tag: "Design", tagColor: "var(--accent-rose)", desc: "Architect a system", prompt: "Help me design the architecture for a system", icon: Sparkles },
  { tag: "Learn", tagColor: "var(--accent-violet)", desc: "Teach me something", prompt: "Teach me about a technology I want to learn", icon: Lightbulb },
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
      "flex flex-col items-center justify-center text-center px-4 w-full",
      mounted ? "opacity-100" : "opacity-0",
    )}
    style={{ transition: "opacity 0.7s ease-out" }}
    >
      {/* Planet avatar with balanced orbital rings — fully fluid via --sz custom property */}
      <div
        className="relative mb-[clamp(1.5rem,3vw,2.5rem)]"
        style={{
          /* single source of truth — everything else derives from this */
          "--sz": "clamp(140px, 14vw, 220px)",
          width: "var(--sz)",
          height: "var(--sz)",
          transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease-out",
          transform: mounted ? "translateY(0)" : "translateY(40px)",
          opacity: mounted ? 1 : 0,
        } as React.CSSProperties}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 rounded-full blur-3xl animate-[luminance-pulse_4s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--theme-accent) 16%, transparent) 0%, color-mix(in srgb, var(--accent-violet) 10%, transparent) 45%, color-mix(in srgb, var(--accent-cyan) 6%, transparent) 70%, transparent 100%)",
          }}
        />

        {/* Outer ring — 90% of container */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="rounded-full border border-foreground/[0.06]"
            style={{ width: "90%", height: "90%", animation: "spin 50s linear infinite", position: "relative" }}
          >
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
              <div
                key={deg}
                className="absolute rounded-full"
                style={{
                  width: "clamp(3px, 0.35vw, 6px)",
                  height: "clamp(3px, 0.35vw, 6px)",
                  top: "50%", left: "50%",
                  transform: `rotate(${deg}deg) translateX(calc(var(--sz) * 0.45)) translate(-50%, -50%)`,
                  background: "#fff",
                  boxShadow: "0 0 8px 3px rgba(255,255,255,0.8), 0 0 20px 4px rgba(255,255,255,0.4)",
                  animation: `star-flicker ${1.5 + (i % 3) * 0.6}s ease-in-out infinite`,
                  animationDelay: `${i * 0.35}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Inner ring — 70% of container */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="rounded-full border border-foreground/[0.04]"
            style={{ width: "70%", height: "70%", animation: "spin 35s linear infinite reverse", position: "relative" }}
          >
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <div
                key={deg}
                className="absolute rounded-full"
                style={{
                  width: "clamp(4px, 0.4vw, 7px)",
                  height: "clamp(4px, 0.4vw, 7px)",
                  top: "50%", left: "50%",
                  transform: `rotate(${deg}deg) translateX(calc(var(--sz) * 0.35)) translate(-50%, -50%)`,
                  background: i % 2 === 0 ? "var(--accent-blue, #5b6bff)" : "var(--accent-violet, #7c56ff)",
                  boxShadow: i % 2 === 0
                    ? "0 0 10px 3px var(--accent-blue, #5b6bff), 0 0 25px 5px color-mix(in srgb, var(--accent-blue, #5b6bff) 60%, transparent)"
                    : "0 0 10px 3px var(--accent-violet, #7c56ff), 0 0 25px 5px color-mix(in srgb, var(--accent-violet, #7c56ff) 60%, transparent)",
                  animation: `star-flicker ${1.2 + (i % 4) * 0.5}s ease-in-out infinite`,
                  animationDelay: `${i * 0.25}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Planet body — 48% of container */}
        <div className="absolute inset-0 flex items-center justify-center">
          {agentId ? (
            <div
              className={cn(
                "relative flex items-center justify-center rounded-full font-bold text-white",
                getAvatarColor(agentId),
              )}
              style={{
                width: "48%",
                height: "48%",
                fontSize: "clamp(1.1rem, 1.6vw, 1.75rem)",
                boxShadow: "0 0 25px color-mix(in srgb, var(--accent-blue) 12%, transparent), 0 0 50px color-mix(in srgb, var(--accent-violet) 6%, transparent), inset 0 -6px 16px rgba(0,0,0,0.3)",
              }}
            >
              {getInitials(agentName || "?")}
              <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[42%] h-[22%] bg-gradient-to-b from-foreground/15 to-transparent rounded-full blur-sm" />
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-full border border-[var(--theme-accent-border)]" style={{ width: "48%", height: "48%", background: "var(--theme-brand-gradient)", opacity: 0.18 }}>
              <Sparkles style={{ width: "42%", height: "42%" }} className="text-muted-foreground/30" />
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

      {/*
        Suggestion cards — the outer wrapper sets ONE fluid font-size.
        Everything inside uses em so it scales as a single unit.
      */}
      {/*
        Suggestion cards — one fluid font-size drives all sizing via em.
        Container uses 70vw so cards are always wide enough for 2-word tags.
      */}
      <div
        className="relative w-[70vw] max-w-[960px] min-w-[320px]"
        style={{
          fontSize: "clamp(0.8rem, 1.05vw, 1rem)",
          minHeight: "10em",
        }}
      >
        {Array.from({ length: TOTAL_SETS }).map((_, setIdx) => {
          const cards = ALL_SUGGESTIONS.slice(setIdx * 3, setIdx * 3 + 3);
          const isVisible = activeSet === setIdx && !transitioning;
          return (
            <div
              key={setIdx}
              className={cn(
                "absolute inset-0 grid grid-cols-3 transition-all duration-500",
                isVisible
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-4 pointer-events-none",
              )}
              style={{ gap: "0.8em" }}
            >
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.tag}
                    onClick={() => onSuggestionClick(card.prompt)}
                    className="selection-card group flex flex-col items-start rounded-[1em] text-left transition-all duration-300 overflow-visible"
                    style={{ padding: "1.2em", gap: "0.6em" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 0 12px color-mix(in srgb, ${card.tagColor} 25%, transparent), 0 0 30px color-mix(in srgb, ${card.tagColor} 8%, transparent)`;
                      e.currentTarget.style.borderColor = `color-mix(in srgb, ${card.tagColor} 25%, transparent)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = "var(--panel-border)";
                    }}
                  >
                    <span
                      className="inline-flex items-center font-semibold border shrink-0"
                      style={{
                        fontSize: "1em",
                        padding: "0.3em 0.65em",
                        borderRadius: "0.5em",
                        gap: "0.4em",
                        color: card.tagColor,
                        borderColor: `color-mix(in srgb, ${card.tagColor} 25%, transparent)`,
                        background: `color-mix(in srgb, ${card.tagColor} 6%, transparent)`,
                      }}
                    >
                      <Icon style={{ width: "1.15em", height: "1.15em", flexShrink: 0 }} />
                      {card.tag}
                    </span>
                    <p
                      className="text-muted-foreground/60 group-hover:text-muted-foreground/80 transition-colors"
                      style={{ fontSize: "0.9em", lineHeight: 1.5 }}
                    >
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
              activeSet === i ? "h-2 w-5 bg-[var(--theme-accent-line)]" : "h-2 w-2 bg-foreground/15 hover:bg-foreground/30",
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
