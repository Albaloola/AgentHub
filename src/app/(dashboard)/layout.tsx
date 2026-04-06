"use client";

import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatTabs } from "@/components/chat/chat-tabs";
import { CommandPalette } from "@/components/search/command-palette";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { useKeyboardShortcuts, ShortcutsHelp } from "@/components/shortcuts/keyboard-shortcuts";
import { SettingsModal } from "@/components/settings/settings-modal";
import { ThemeLoader } from "@/components/theme/theme-loader";
import { useStore } from "@/lib/store";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useStore();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { helpOpen, setHelpOpen, shortcuts } = useKeyboardShortcuts();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
      // Ctrl+, opens settings
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="relative flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="relative flex items-center justify-between shrink-0 border-b border-white/[0.04] glass-strong">
          {/* Subtle top-bar luminance */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-oklch(0.55_0.24_264_/0.15) to-transparent" />
          <ChatTabs />
          <div className="flex items-center gap-1.5 pr-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground transition-all duration-200 hover:bg-white/[0.06]"
              onClick={() => setSettingsOpen(true)}
              title="Settings (Ctrl+,)"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <NotificationCenter />
          </div>
        </div>
        {/* Page content */}
        <div className="relative flex-1 min-h-0 overflow-auto">
          {children}
        </div>
      </main>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={shortcuts} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ThemeLoader />
    </div>
  );
}
