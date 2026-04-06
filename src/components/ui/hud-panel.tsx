"use client";

import { useState, useRef, useCallback } from "react";
import { X, Minus, Maximize2, Minimize2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HudPanelProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** If true, shows minimize/maximize/close controls */
  controls?: boolean;
  /** If true, panel can be collapsed to just the header */
  collapsible?: boolean;
  onClose?: () => void;
  /** Visual accent color for the top border glow */
  accent?: "blue" | "violet" | "emerald" | "amber" | "red" | "cyan" | "none";
  /** Size variant */
  variant?: "default" | "compact" | "full";
  /** Optional status text shown in the header */
  status?: string;
  /** Optional badge content */
  badge?: React.ReactNode;
}

const ACCENT_STYLES = {
  blue: "border-t-blue-500/50 shadow-[0_-1px_10px_rgba(59,130,246,0.1)]",
  violet: "border-t-violet-500/50 shadow-[0_-1px_10px_rgba(139,92,246,0.1)]",
  emerald: "border-t-emerald-500/50 shadow-[0_-1px_10px_rgba(16,185,129,0.1)]",
  amber: "border-t-amber-500/50 shadow-[0_-1px_10px_rgba(245,158,11,0.1)]",
  red: "border-t-red-500/50 shadow-[0_-1px_10px_rgba(239,68,68,0.1)]",
  cyan: "border-t-cyan-500/50 shadow-[0_-1px_10px_rgba(6,182,212,0.1)]",
  none: "",
};

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

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-white/[0.06] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover-lift",
        "bg-card/80 backdrop-blur-xl",
        accent !== "none" && `border-t-2 ${ACCENT_STYLES[accent]}`,
        maximized && "fixed inset-4 z-50",
        variant === "compact" && "rounded-xl",
        className,
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "relative flex items-center gap-2 px-4 shrink-0 border-b border-white/[0.04] transition-colors duration-200",
          variant === "compact" ? "py-2" : "py-2.5",
          collapsible && "cursor-pointer hover:bg-white/[0.02]",
        )}
        onClick={collapsible ? () => setCollapsed(!collapsed) : undefined}
      >
        {accent !== "none" && (
          <div className="absolute bottom-0 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-oklch(0.55_0.24_264_/0.2) to-transparent" />
        )}
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className={cn("font-medium flex-1", variant === "compact" ? "text-xs" : "text-sm")}>{title}</span>

        {status && (
          <span className="text-[10px] text-muted-foreground/60">{status}</span>
        )}

        {badge}

        {controls && (
          <div className="flex items-center gap-0.5">
            {collapsible && (
              <Button variant="ghost" size="icon" className="h-5 w-5 rounded-md" onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}>
                <Minus className="h-3 w-3" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-md" onClick={(e) => { e.stopPropagation(); setMaximized(!maximized); }}>
              {maximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
            {onClose && (
              <Button variant="ghost" size="icon" className="h-5 w-5 rounded-md hover:bg-red-500/20 hover:text-red-400" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex-1 min-h-0 overflow-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          collapsed ? "max-h-0 opacity-0 overflow-hidden" : "max-h-[9999px] opacity-100",
        )}
      >
        {children}
      </div>
    </div>
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
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border border-white/[0.06] bg-card/60 backdrop-blur-sm p-3 transition-all duration-300 hover-lift hover:bg-card/80",
      accent !== "none" && `border-l-2 ${ACCENT_STYLES[accent].split(" ")[0]}`,
    )}>
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <div>
        <div className="text-xl font-bold tabular-nums">{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </div>
      {trend && (
        <div className={cn(
          "ml-auto text-[10px] font-medium",
          trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-muted-foreground",
        )}>
          {trend === "up" ? "+" : trend === "down" ? "-" : "="}
        </div>
      )}
    </div>
  );
}
