"use client";

import { cn } from "@/lib/utils";

interface AnimatedBorderProps {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  accent?: "blue" | "violet" | "emerald" | "amber" | "cyan" | "none";
  speed?: "slow" | "normal" | "fast";
}

const ACCENT_COLORS = {
  blue: "oklch(0.55 0.24 264)",
  violet: "oklch(0.55 0.24 294)",
  emerald: "oklch(0.55 0.20 162)",
  amber: "oklch(0.65 0.20 70)",
  cyan: "oklch(0.55 0.20 200)",
  none: "oklch(0.50 0.05 260)",
};

const SPEED_CLASS = {
  slow: "border-rotate--slow",
  normal: "border-rotate--normal",
  fast: "border-rotate--fast",
};

export function AnimatedBorder({
  children,
  className,
  active = true,
  accent = "none",
  speed = "normal",
}: AnimatedBorderProps) {
  const accentColor = ACCENT_COLORS[accent];

  if (!active) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "animated-border-wrapper",
        SPEED_CLASS[speed],
        className,
      )}
      style={
        {
          "--border-accent": accentColor,
        } as React.CSSProperties
      }
    >
      <div className="animated-border-inner">{children}</div>
    </div>
  );
}
