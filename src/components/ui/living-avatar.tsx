"use client";

import type { CSSProperties } from "react";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

type AvatarState = "idle" | "thinking" | "speaking" | "error" | "success" | "offline";

interface LivingAvatarProps {
  name: string;
  id: string;
  state?: AvatarState;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_MAP = {
  sm: "h-7 w-7 text-[0.625rem]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-16 w-16 text-lg",
};

const RING_SIZE = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-20 w-20",
};

const DOT_SIZE = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-3.5 w-3.5",
  xl: "h-4 w-4",
};

export function LivingAvatar({ name, id, state = "idle", size = "md", className }: LivingAvatarProps) {
  const initials = getInitials(name);
  const colorClass = getAvatarColor(id);
  const auraStyle: CSSProperties | undefined =
    state === "thinking"
      ? {
          background:
            "linear-gradient(90deg, color-mix(in srgb, var(--accent-blue) 24%, transparent), color-mix(in srgb, var(--accent-violet) 24%, transparent), color-mix(in srgb, var(--accent-blue) 24%, transparent))",
        }
      : state === "speaking"
        ? {
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--accent-blue) 20%, transparent), color-mix(in srgb, var(--accent-cyan) 20%, transparent), color-mix(in srgb, var(--accent-violet) 20%, transparent))",
          }
        : state === "error"
          ? { background: "color-mix(in srgb, var(--accent-rose) 20%, transparent)" }
          : state === "success"
            ? { background: "color-mix(in srgb, var(--accent-emerald) 20%, transparent)" }
            : undefined;

  const ringStyle: CSSProperties | undefined =
    state === "thinking"
      ? {
          background:
            "conic-gradient(from 0deg, transparent, color-mix(in srgb, var(--accent-blue) 56%, transparent), color-mix(in srgb, var(--accent-violet) 44%, transparent), transparent)",
          animation: "spin 2s linear infinite",
          borderRadius: "inherit",
        }
      : state === "speaking"
        ? {
            borderColor: "color-mix(in srgb, var(--accent-blue) 42%, transparent)",
            boxShadow: "0 0 12px color-mix(in srgb, var(--accent-blue) 24%, transparent)",
          }
        : state === "error"
          ? {
              borderColor: "color-mix(in srgb, var(--accent-rose) 50%, transparent)",
              boxShadow: "0 0 8px color-mix(in srgb, var(--accent-rose) 28%, transparent)",
            }
          : state === "success"
            ? {
                borderColor: "color-mix(in srgb, var(--accent-emerald) 50%, transparent)",
                boxShadow: "0 0 8px color-mix(in srgb, var(--accent-emerald) 28%, transparent)",
              }
            : undefined;

  const statusDotStyle: CSSProperties | undefined =
    state === "idle"
      ? { background: "var(--status-online)", boxShadow: "0 0 6px color-mix(in srgb, var(--status-online) 40%, transparent)" }
      : state === "thinking"
        ? { background: "var(--accent-blue)", boxShadow: "0 0 6px color-mix(in srgb, var(--accent-blue) 45%, transparent)" }
        : state === "speaking"
          ? { background: "var(--accent-cyan)", boxShadow: "0 0 6px color-mix(in srgb, var(--accent-cyan) 45%, transparent)" }
          : state === "error"
            ? { background: "var(--status-danger)", boxShadow: "0 0 6px color-mix(in srgb, var(--status-danger) 45%, transparent)" }
            : state === "success"
              ? { background: "var(--accent-emerald)", boxShadow: "0 0 6px color-mix(in srgb, var(--accent-emerald) 45%, transparent)" }
              : { background: "var(--status-offline)" };

  return (
    <div className={cn("relative inline-flex items-center justify-center", RING_SIZE[size], className)}>
      {/* Ambient glow behind avatar based on state */}
      <div
        className={cn(
          "absolute -inset-1 rounded-2xl opacity-0 transition-opacity duration-500",
          state === "thinking" && "opacity-40 animate-[luminance-pulse_2s_ease-in-out_infinite] blur-md",
          state === "speaking" && "opacity-30 animate-[luminance-pulse_1.5s_ease-in-out_infinite] blur-md",
          state === "error" && "opacity-30 blur-md",
          state === "success" && "opacity-30 blur-md",
          state === "idle" && "opacity-20 bg-foreground/[0.03] blur-sm",
        )}
        style={auraStyle}
      />

      {/* Outer ring - animated based on state */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl transition-all duration-500",
          state === "thinking" && "border-2 border-transparent",
          state === "speaking" && "border-2 animate-[pulse_1.5s_ease-in-out_infinite]",
          state === "error" && "border-2",
          state === "success" && "border-2",
          state === "offline" && "border-2 border-gray-600/30",
          state === "idle" && "border-2 border-foreground/[0.08] hover:border-foreground/[0.15]",
        )}
        style={ringStyle}
      />

      {/* Inner avatar */}
      <div
        className={cn(
          "relative z-10 flex items-center justify-center rounded-xl font-semibold text-white transition-all duration-300",
          SIZE_MAP[size],
          colorClass,
          state === "thinking" && "scale-95",
          state === "speaking" && "scale-100",
          state === "error" && "grayscale-[50%]",
          state === "offline" && "opacity-50 grayscale",
        )}
      >
        {initials}

        {/* Breathing overlay for thinking */}
        {state === "thinking" && (
          <div className="absolute inset-0 rounded-xl bg-foreground/10 animate-[pulse_1.5s_ease-in-out_infinite]" />
        )}

        {/* Sound wave rings for speaking */}
        {state === "speaking" && (
          <>
            <div className="absolute -inset-1 rounded-xl border animate-[ping_2s_ease-in-out_infinite]" style={{ borderColor: "color-mix(in srgb, var(--accent-blue) 22%, transparent)" }} />
            <div
              className="absolute -inset-1.5 rounded-xl border animate-[ping_2s_ease-in-out_infinite]"
              style={{ animationDelay: "0.5s", borderColor: "color-mix(in srgb, var(--accent-violet) 14%, transparent)" }}
            />
          </>
        )}
      </div>

      {/* Status dot */}
      <div
        className={cn(
          "absolute -bottom-0.5 -right-0.5 z-20 rounded-full border-2 border-card transition-all duration-300",
          DOT_SIZE[size],
          state === "thinking" && "animate-pulse",
        )}
        style={statusDotStyle}
      />

      {/* Tool use sparkle effect */}
      {state === "speaking" && (
        <>
          <div className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full animate-ping" style={{ background: "color-mix(in srgb, var(--accent-blue) 60%, transparent)" }} />
          <div className="absolute -bottom-1 -left-1 h-1 w-1 rounded-full animate-ping" style={{ animationDelay: "0.5s", background: "color-mix(in srgb, var(--accent-violet) 44%, transparent)" }} />
        </>
      )}
    </div>
  );
}
