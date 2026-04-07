"use client";

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

  return (
    <div className={cn("relative inline-flex items-center justify-center", RING_SIZE[size], className)}>
      {/* Ambient glow behind avatar based on state */}
      <div
        className={cn(
          "absolute -inset-1 rounded-2xl opacity-0 transition-opacity duration-500",
          state === "thinking" && "opacity-40 animate-[luminance-pulse_2s_ease-in-out_infinite] bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-blue-500/20 blur-md",
          state === "speaking" && "opacity-30 animate-[luminance-pulse_1.5s_ease-in-out_infinite] bg-gradient-to-r from-blue-400/20 via-cyan-400/20 to-violet-400/20 blur-md",
          state === "error" && "opacity-30 bg-red-500/20 blur-md",
          state === "success" && "opacity-30 bg-emerald-500/20 blur-md",
          state === "idle" && "opacity-20 bg-foreground/[0.03] blur-sm",
        )}
      />

      {/* Outer ring - animated based on state */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl transition-all duration-500",
          state === "thinking" && "border-2 border-transparent",
          state === "speaking" && "border-2 border-blue-400/40 animate-[pulse_1.5s_ease-in-out_infinite]",
          state === "error" && "border-2 border-red-500/50 shadow-[0_0_8px_oklch(0.5_0.2_25/0.3)]",
          state === "success" && "border-2 border-emerald-500/50 shadow-[0_0_8px_oklch(0.5_0.2_162/0.3)]",
          state === "offline" && "border-2 border-gray-600/30",
          state === "idle" && "border-2 border-foreground/[0.08] hover:border-foreground/[0.15]",
        )}
        style={state === "thinking" ? {
          background: "conic-gradient(from 0deg, transparent, rgba(99,102,241,0.5), rgba(139,92,246,0.4), transparent)",
          animation: "spin 2s linear infinite",
          borderRadius: "inherit",
        } : undefined}
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
            <div className="absolute -inset-1 rounded-xl border border-blue-400/20 animate-[ping_2s_ease-in-out_infinite]" />
            <div className="absolute -inset-1.5 rounded-xl border border-violet-400/10 animate-[ping_2s_ease-in-out_infinite]" style={{ animationDelay: "0.5s" }} />
          </>
        )}
      </div>

      {/* Status dot */}
      <div
        className={cn(
          "absolute -bottom-0.5 -right-0.5 z-20 rounded-full border-2 border-card transition-all duration-300",
          DOT_SIZE[size],
          state === "idle" && "bg-emerald-500 shadow-[0_0_4px_oklch(0.5_0.2_162/0.4)]",
          state === "thinking" && "bg-blue-500 animate-pulse shadow-[0_0_6px_oklch(0.5_0.2_264/0.5)]",
          state === "speaking" && "bg-blue-400 shadow-[0_0_6px_oklch(0.5_0.2_200/0.5)]",
          state === "error" && "bg-red-500 shadow-[0_0_6px_oklch(0.5_0.2_25/0.5)]",
          state === "success" && "bg-emerald-400 shadow-[0_0_6px_oklch(0.5_0.2_162/0.5)]",
          state === "offline" && "bg-gray-500",
        )}
      />

      {/* Tool use sparkle effect */}
      {state === "speaking" && (
        <>
          <div className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-blue-400/60 animate-ping" />
          <div className="absolute -bottom-1 -left-1 h-1 w-1 rounded-full bg-violet-400/40 animate-ping" style={{ animationDelay: "0.5s" }} />
        </>
      )}
    </div>
  );
}
