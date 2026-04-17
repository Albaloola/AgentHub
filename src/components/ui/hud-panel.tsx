"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { X, Minus, Maximize2, Minimize2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { spring, duration, stagger as staggerPresets } from "@/lib/animation";

interface HudPanelProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  controls?: boolean;
  collapsible?: boolean;
  onClose?: () => void;
  accent?: "blue" | "violet" | "emerald" | "amber" | "red" | "cyan" | "none";
  variant?: "default" | "compact" | "full";
  status?: string;
  badge?: React.ReactNode;
}

const ACCENT_VARS = {
  blue: "var(--accent-blue)",
  violet: "var(--accent-violet)",
  emerald: "var(--accent-emerald)",
  amber: "var(--accent-amber)",
  red: "var(--accent-rose)",
  cyan: "var(--accent-cyan)",
  none: "transparent",
} as const;

const HUD_STYLES = `
@keyframes hud-accent-line {
  from { width: 0%; }
  to { width: 100%; }
}
@keyframes hud-breathe {
  0%, 100% { box-shadow: var(--panel-shadow); }
  50% { box-shadow: var(--panel-shadow-hover); }
}
`;

export function HudPanel({
  title,
  icon,
  children,
  className,
  controls = false,
  collapsible = false,
  onClose,
  accent = "none",
  variant = "default",
  status,
  badge,
}: HudPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const prefersReduced = useReducedMotion();

  const accentColor = ACCENT_VARS[accent];
  const accentStyle = accent === "none"
    ? undefined
    : ({ ["--hud-accent" as string]: accentColor } as CSSProperties);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: HUD_STYLES }} />
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={spring.bouncy}
        className={cn(
          "surface-panel flex flex-col overflow-hidden rounded-[var(--workspace-radius-md)]",
          "transition-[box-shadow,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "hover:shadow-[var(--panel-shadow-hover)] hover:border-[var(--panel-border-strong)]",
          accent !== "none" && "border-t-2",
          maximized && "fixed inset-4 z-50",
          variant === "compact" && "rounded-lg",
          className,
        )}
        style={{
          ...accentStyle,
          ...(accent !== "none"
            ? { borderTopColor: `color-mix(in srgb, ${accentColor} 40%, transparent)` }
            : {}),
          /* Dark-theme-only idle breathing glow */
          animation: !prefersReduced ? "hud-breathe 4s ease-in-out infinite" : undefined,
        }}
      >
        {/* Top accent line — width animates 0% → 100% on mount */}
        {accent !== "none" && (
          <div className="relative h-0 overflow-visible">
            <div
              className="absolute top-0 left-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${accentColor} 55%, transparent), transparent)`,
                animation: !prefersReduced ? "hud-accent-line 0.6s cubic-bezier(0.4,0,0.2,1) 0.2s both" : undefined,
                width: prefersReduced ? "100%" : undefined,
              }}
            />
          </div>
        )}

        {/* Header */}
        <div
          className={cn(
            "panel-drag-header relative flex shrink-0 items-center gap-2 border-b border-[var(--panel-border)] px-4 transition-colors duration-200",
            variant === "compact" ? "py-2" : "py-2.5",
            collapsible && "cursor-pointer hover:bg-[var(--button-ghost-hover)]",
          )}
          onClick={collapsible ? () => setCollapsed(!collapsed) : undefined}
        >
          {icon && (
            <span className="text-muted-foreground" style={accent !== "none" ? { color: accentColor } : undefined}>
              {icon}
            </span>
          )}
          <span className={cn("font-medium flex-1", variant === "compact" ? "text-xs" : "text-sm")}>{title}</span>

          {status && (
            <span className="text-[var(--text-label)] text-muted-foreground/60">{status}</span>
          )}

          {badge}

          {controls && (
            <div className="flex items-center gap-0.5">
              {collapsible && (
                <Button variant="ghost" size="icon-xs" className="rounded-md" onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}>
                  <Minus className="h-3 w-3" />
                </Button>
              )}
              <Button variant="ghost" size="icon-xs" className="rounded-md" onClick={(e) => { e.stopPropagation(); setMaximized(!maximized); }}>
                {maximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </Button>
              {onClose && (
                <Button variant="ghost" size="icon-xs" className="rounded-md hover-glow-rose hover:text-[var(--accent-rose)]" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content — staggered entrance */}
        <motion.div
          initial={prefersReduced ? false : "hidden"}
          animate={collapsed ? "hidden" : "visible"}
          variants={{
            hidden: { opacity: 0, height: 0 },
            visible: {
              opacity: 1,
              height: "auto",
              transition: {
                height: { ...spring.gentle },
                opacity: { duration: duration.normal, delay: 0.08 },
                staggerChildren: staggerPresets.normal,
                delayChildren: 0.1,
              },
            },
          }}
          className="flex-1 min-h-0 overflow-hidden"
        >
          {children}
        </motion.div>
      </motion.div>
    </>
  );
}

/** Mini stat card for dashboard HUD */
export function HudStat({
  label,
  value,
  icon,
  trend,
  accent = "none",
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "stable";
  accent?: "blue" | "violet" | "emerald" | "amber" | "red" | "cyan" | "none";
}) {
  const accentStyle = accent === "none"
    ? undefined
    : ({ borderLeftColor: ACCENT_VARS[accent] } as CSSProperties);

  return (
    <div
      className={cn(
        "surface-panel flex items-center gap-3 rounded-[var(--workspace-radius-md)] p-fluid",
        "transition-[box-shadow,border-color,transform] duration-300",
        "hover:shadow-[var(--panel-shadow-hover)] hover:border-[var(--panel-border-strong)]",
        accent !== "none" && "border-l-2",
      )}
      style={accentStyle}
    >
      {icon && (
        <span className="text-muted-foreground" style={accent !== "none" ? { color: ACCENT_VARS[accent] } : undefined}>
          {icon}
        </span>
      )}
      <div>
        <div className="text-fluid-xl font-semibold tracking-[-0.03em] tabular-nums">{value}</div>
        <div className="text-fluid-xs text-muted-foreground">{label}</div>
      </div>
      {trend && (
        <div className={cn(
          "ml-auto text-[var(--text-label)] font-medium",
          trend === "up"
            ? "text-[var(--accent-emerald)]"
            : trend === "down"
              ? "text-[var(--accent-rose)]"
              : "text-muted-foreground",
        )}>
          {trend === "up" ? "+" : trend === "down" ? "-" : "="}
        </div>
      )}
    </div>
  );
}
