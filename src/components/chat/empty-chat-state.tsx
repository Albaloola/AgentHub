"use client";

import { useEffect, useMemo, useState } from "react";
import { Code2, FileText, Lightbulb, Rocket, Search, Sparkles } from "lucide-react";
import { cn, getAvatarColor, getInitials } from "@/lib/utils";

const SUGGESTIONS = [
  { label: "Code help", desc: "Write or debug implementation work", prompt: "Help me write clean, well-documented code", icon: Code2, accent: "var(--accent-emerald)" },
  { label: "Research", desc: "Investigate a topic or dependency", prompt: "Help me research and summarize a topic", icon: Search, accent: "var(--accent-cyan)" },
  { label: "Plan", desc: "Break down a project or workflow", prompt: "Help me create a detailed project plan", icon: Rocket, accent: "var(--accent-violet)" },
  { label: "Review", desc: "Critique code or written work", prompt: "Review my work and suggest improvements", icon: Sparkles, accent: "var(--accent-blue)" },
  { label: "Explain", desc: "Clarify a difficult concept", prompt: "Explain a complex topic in simple terms", icon: Lightbulb, accent: "var(--accent-amber)" },
  { label: "Draft", desc: "Write a polished document", prompt: "Help me write a professional document", icon: FileText, accent: "var(--accent-rose)" },
];

const GREETINGS = [
  "Ready to work this channel.",
  "Start with a prompt, file, or question.",
  "Give me a task and I’ll take it from here.",
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
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const syncTheme = () => setIsDarkMode(root.dataset.themeMode !== "light");
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme-mode"] });

    const interval = window.setInterval(() => {
      setGreetingIndex((previous) => (previous + 1) % GREETINGS.length);
    }, 7000);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  const displayName = useMemo(() => agentName?.split("(")[0]?.trim() || "Agent", [agentName]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 py-8 text-center">
      <div className="surface-panel-strong workspace-panel relative w-full overflow-hidden px-6 py-6 md:px-8 md:py-7">
        <div className="workspace-intro__accent" aria-hidden="true" />
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
          <div
            className={cn(
              "relative flex h-18 w-18 items-center justify-center rounded-[var(--workspace-radius-xl)] text-lg font-semibold text-white shadow-[var(--panel-shadow)]",
              agentId ? getAvatarColor(agentId) : "brand-chip",
            )}
          >
            {agentId ? getInitials(displayName) : <Sparkles className="h-7 w-7" />}
            <span
              className="absolute inset-0 rounded-[var(--workspace-radius-xl)]"
              style={{
                boxShadow: isDarkMode
                  ? "0 0 0 1px rgba(255,255,255,0.05), 0 24px 60px rgba(0,0,0,0.35)"
                  : "0 0 0 1px rgba(0,0,0,0.04), 0 18px 42px rgba(28,25,23,0.12)",
              }}
            />
          </div>

          <div className="space-y-3">
            <p className="workspace-eyebrow">Conversation lane</p>
            <h1 className="workspace-title workspace-title--compact">{displayName}</h1>
            <p className="workspace-description mx-auto max-w-xl">{GREETINGS[greetingIndex]}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[var(--text-eyebrow)] text-muted-foreground">
            <span className="rounded-full border border-foreground/[0.08] px-3 py-1">Ask directly in the composer</span>
            <span className="rounded-full border border-foreground/[0.08] px-3 py-1">Use / for channel commands</span>
            <span className="rounded-full border border-foreground/[0.08] px-3 py-1">Attach files when needed</span>
          </div>
        </div>
      </div>

      <div className="grid w-full max-w-4xl gap-3 md:grid-cols-3">
        {SUGGESTIONS.slice(0, 3).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onSuggestionClick(item.prompt)}
              className="workspace-list-row group flex min-h-34 flex-col items-start gap-4 p-4 text-left"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-[var(--workspace-radius-md)]"
                style={{
                  background: `color-mix(in srgb, ${item.accent} 16%, transparent)`,
                  color: item.accent,
                }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-sm leading-6 text-muted-foreground transition-colors group-hover:text-foreground/82">
                  {item.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
