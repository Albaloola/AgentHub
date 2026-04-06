"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatTabs } from "@/components/chat/chat-tabs";
import { CommandPalette } from "@/components/search/command-palette";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { useKeyboardShortcuts, ShortcutsHelp } from "@/components/shortcuts/keyboard-shortcuts";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useStore();
  const [cmdOpen, setCmdOpen] = useState(false);
  const { helpOpen, setHelpOpen, shortcuts } = useKeyboardShortcuts();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main
        className={cn(
          "flex-1 overflow-auto transition-all duration-200",
          sidebarOpen ? "md:ml-0" : "md:ml-0",
        )}
      >
        <div className="flex items-center justify-between">
          <ChatTabs />
          <div className="pr-4">
            <NotificationCenter />
          </div>
        </div>
        {children}
      </main>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={shortcuts} />
    </div>
  );
}
