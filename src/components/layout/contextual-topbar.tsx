"use client";

import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notifications/notification-center";

interface ContextualTopBarProps {
  onOpenSettings: () => void;
}

export function ContextualTopBar({ onOpenSettings }: ContextualTopBarProps) {
  const pathname = usePathname();
  
  console.log('[ContextualTopBar] Rendering, pathname:', pathname);

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
        clipPath: "polygon(0 0, calc(50% - 60px) 0, 50% 10px, calc(50% + 60px) 0, 100% 0, 100% 100%, 0 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          clipPath: "polygon(0 0, calc(50% - 60px) 0, 50% 10px, calc(50% + 60px) 0, 100% 0, 100% 1px, calc(50% + 60px) 1px, 50% 11px, calc(50% - 60px) 1px, 0 1px)",
          background: "var(--topbar-line)",
          opacity: 0.6,
        }}
      />

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: "var(--panel-border)",
        }}
      />

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{title}</span>
      </div>

      <div className="flex items-center gap-2">
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
