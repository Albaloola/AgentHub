"use client";

import { ArrowRight } from "lucide-react";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

export function HandoffPill({
  fromName,
  fromId,
  toName,
  toId,
}: {
  fromName: string;
  fromId: string;
  toName: string;
  toId: string;
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-3 my-2">
      <div className="h-px flex-1 bg-border" />
      <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5">
        <div className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-medium text-white", getAvatarColor(fromId))}>
          {getInitials(fromName)}
        </div>
        <span className="text-xs text-muted-foreground">{fromName}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <div className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-medium text-white", getAvatarColor(toId))}>
          {getInitials(toName)}
        </div>
        <span className="text-xs text-muted-foreground">{toName}</span>
      </div>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
