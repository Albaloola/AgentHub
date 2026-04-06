"use client";

import {
  Bug, Lightbulb, Zap, GraduationCap, Shield, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BehaviorMode } from "@/lib/types";
import { BEHAVIOR_MODES } from "@/lib/types";

const MODE_ICONS: Record<BehaviorMode, React.ComponentType<{ className?: string }>> = {
  default: Settings2,
  debug: Bug,
  creative: Lightbulb,
  concise: Zap,
  teaching: GraduationCap,
  production: Shield,
};

const MODE_COLORS: Record<BehaviorMode, string> = {
  default: "text-muted-foreground",
  debug: "text-amber-500",
  creative: "text-violet-500",
  concise: "text-blue-500",
  teaching: "text-emerald-500",
  production: "text-red-500",
};

export function BehaviorModeSelector({
  mode,
  onModeChange,
  compact = false,
}: {
  mode: BehaviorMode;
  onModeChange: (mode: BehaviorMode) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        {BEHAVIOR_MODES.map(({ value }) => {
          const Icon = MODE_ICONS[value];
          const isActive = mode === value;
          return (
            <Button
              key={value}
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", isActive && "bg-accent")}
              onClick={() => onModeChange(value)}
              title={BEHAVIOR_MODES.find((m) => m.value === value)?.label}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive ? MODE_COLORS[value] : "text-muted-foreground")} />
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {BEHAVIOR_MODES.map(({ value, label, description }) => {
        const Icon = MODE_ICONS[value];
        const isActive = mode === value;
        return (
          <button
            key={value}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
            )}
            onClick={() => onModeChange(value)}
          >
            <Icon className={cn("h-4 w-4", MODE_COLORS[value])} />
            <div className="flex-1 text-left">
              <div className="font-medium">{label}</div>
              <div className="text-[10px] text-muted-foreground">{description}</div>
            </div>
            {isActive && <Badge variant="outline" className="text-[10px]">Active</Badge>}
          </button>
        );
      })}
    </div>
  );
}
