"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  eyebrow?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  iconClassName,
  eyebrow,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "workspace-empty-state",
        className,
      )}
    >
      <div className={cn("workspace-empty-state__icon", iconClassName)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-2">
        {eyebrow ? <p className="workspace-eyebrow">{eyebrow}</p> : null}
        <h3 className="workspace-empty-state__title">{title}</h3>
        {description ? (
          <p className="workspace-empty-state__description">{description}</p>
        ) : null}
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
