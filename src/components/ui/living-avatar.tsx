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
  sm: "h-7 w-7 text-[10px]",
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

export function LivingAvatar({ name, id, state = "idle", size = "md", className }: LivingAvatarProps) {
  const initials = getInitials(name);
  const colorClass = getAvatarColor(id);

  return (
    <div className={cn("relative inline-flex items-center justify-center", RING_SIZE[size], className)}>
      {/* Outer ring - animated based on state */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl transition-all duration-500",
          state === "thinking" && "animate-[spin_3s_linear_infinite] border-2 border-transparent bg-gradient-to-r from-blue-500 via-violet-500 to-blue-500 bg-[length:200%_100%] animate-[gradient-shift_2s_ease_infinite]",
          state === "speaking" && "border-2 border-blue-400/40 animate-[pulse_1.5s_ease-in-out_infinite]",
          state === "error" && "border-2 border-red-500/50",
          state === "success" && "border-2 border-emerald-500/50",
          state === "offline" && "border-2 border-gray-600/30",
          state === "idle" && "border-2 border-white/[0.08]",
        )}
        style={state === "thinking" ? {
          background: "conic-gradient(from 0deg, transparent, rgba(99,102,241,0.4), transparent)",
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
          <div className="absolute inset-0 rounded-xl bg-white/10 animate-[pulse_1.5s_ease-in-out_infinite]" />
        )}
      </div>

      {/* Status dot */}
      <div
        className={cn(
          "absolute -bottom-0.5 -right-0.5 z-20 rounded-full border-2 border-card transition-all duration-300",
          size === "sm" ? "h-2.5 w-2.5" : size === "md" ? "h-3 w-3" : "h-3.5 w-3.5",
          state === "idle" && "bg-emerald-500",
          state === "thinking" && "bg-blue-500 animate-pulse",
          state === "speaking" && "bg-blue-400",
          state === "error" && "bg-red-500",
          state === "success" && "bg-emerald-400",
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
