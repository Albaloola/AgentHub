"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Command, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { formatUiDateTime } from "@/lib/frontend/date-format";
import { openCommandPalette } from "@/lib/frontend/ui-events";

interface ContextualTopBarProps {
  onOpenSettings: () => void;
}

export function ContextualTopBar({ onOpenSettings }: ContextualTopBarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());
  const dateFormat = useStore(s => s.uiPrefs.dateFormat || 'system');

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Simple page title mapping
  const titles: Record<string, string> = {
    "/": "Mission Control",
    "/agents": "Agents",
    "/fleet": "Fleet",
    "/groups": "Group Chats",
    "/analytics": "Analytics",
    "/monitoring": "Monitoring",
    "/traces": "Traces",
    "/knowledge": "Knowledge",
    "/memory": "Memory",
    "/templates": "Templates",
    "/workflows": "Workflows",
    "/arena": "Arena",
    "/playground": "Playground",
    "/webhooks": "Webhooks",
    "/scheduled-tasks": "Scheduled Tasks",
    "/api-keys": "API Keys",
    "/integrations": "Integrations",
    "/insights": "Insights",
    "/personas": "Personas",
    "/guardrails": "Guardrails",
    "/policies": "Policies",
    "/a2a": "A2A",
    "/search": "Search",
    "/settings": "Settings",
    "/admin": "Admin",
  };

  const title = pathname ? (titles[pathname] || "AgentHub") : "AgentHub";

  return (
    <div
      className="relative z-20 flex shrink-0 items-center justify-between border-b border-foreground/[0.05] px-[var(--shell-pad,1rem)]"
      style={{ minHeight: "var(--topbar-height, 3.5rem)" }}
    >
      <div 
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(to right, var(--background) 0%, transparent 35%, transparent 65%, var(--background) 100%)",
        }}
      />

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[1px]"
        style={{
          background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--theme-accent) 40%, transparent), transparent)",
          boxShadow: "0 4px 12px 1px color-mix(in srgb, var(--theme-accent) 25%, transparent)",
        }}
      />

      <div className="relative z-10 flex flex-1 items-center gap-2">
        <span className="contextual-topbar__title title-font font-bold tracking-tight text-foreground">{title}</span>
      </div>

      <div className="relative z-10 hidden flex-1 justify-center lg:flex">
        {mounted && (
          <span className="text-sm font-semibold tracking-wide text-foreground/90 tabular-nums">
            {formatUiDateTime(now, dateFormat)}
          </span>
        )}
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={openCommandPalette}
          aria-label="Open command palette"
          className="hidden h-9 rounded-xl px-3 text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground md:inline-flex"
        >
          <Search className="mr-2 h-4 w-4" />
          Search
          <span className="ml-2 inline-flex items-center gap-1 rounded-md border border-foreground/[0.08] px-1.5 py-0.5 text-[0.65rem] text-muted-foreground">
            <Command className="h-3 w-3" />
            K
          </span>
        </Button>
        <Link
          href="/settings"
          className="hidden h-9 items-center rounded-xl border border-foreground/[0.08] px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground md:inline-flex"
        >
          Full settings
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          aria-label="Open settings"
          className="h-9 w-9 rounded-xl hover:bg-foreground/[0.08]"
        >
          <Settings className="h-4.5 w-4.5" />
        </Button>
        <NotificationCenter />
      </div>
    </div>
  );
}
