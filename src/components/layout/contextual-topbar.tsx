"use client";

import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

interface ContextualTopBarProps {
  onOpenSettings: () => void;
}

export function ContextualTopBar({ onOpenSettings }: ContextualTopBarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());
  const dateFormat = useStore(s => s.uiPrefs.dateFormat || 'system');

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function formatDateTime(date: Date) {
    if (dateFormat === "system") {
      return date.toLocaleDateString(undefined, {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
      });
    }
    
    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = (h % 12 || 12).toString();
    const timeStr = `${h12}:${m} ${ampm}`;
    
    const mo = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    const y = date.getFullYear();
    
    if (dateFormat === "MM/DD/YYYY") {
      return `${mo}/${d}/${y} ${timeStr}`;
    }
    return `${d}/${mo}/${y} ${timeStr}`;
  }

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
      className="relative flex h-10 shrink-0 items-center justify-between px-4"
      style={{
        backgroundColor: "var(--background)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, var(--topbar-line) 0%, transparent 1px)",
          opacity: 0.6,
        }}
      />

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: "var(--panel-border)",
        }}
      />

      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm font-semibold">{title}</span>
      </div>

      <div className="flex justify-center flex-1">
        {mounted && (
          <span className="text-xs font-mono text-muted-foreground tabular-nums">
            {formatDateTime(now)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          aria-label="Open settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <NotificationCenter />
      </div>
    </div>
  );
}
