'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ContextualTopBar } from '@/components/layout/contextual-topbar';
import { SettingsModal } from '@/components/settings/settings-modal';
import { CommandPalette } from '@/components/search/command-palette';
import { ShortcutsHelp, useKeyboardShortcuts } from '@/components/shortcuts/keyboard-shortcuts';
import { UI_EVENT_OPEN_COMMAND_PALETTE, UI_EVENT_OPEN_QUICK_SETTINGS } from '@/lib/frontend/ui-events';

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { helpOpen, setHelpOpen, shortcuts } = useKeyboardShortcuts();

  useEffect(() => {
    function openCommandPalette() {
      setCommandPaletteOpen(true);
    }

    function openQuickSettings() {
      setSettingsOpen(true);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    }

    window.addEventListener(UI_EVENT_OPEN_COMMAND_PALETTE, openCommandPalette);
    window.addEventListener(UI_EVENT_OPEN_QUICK_SETTINGS, openQuickSettings);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(UI_EVENT_OPEN_COMMAND_PALETTE, openCommandPalette);
      window.removeEventListener(UI_EVENT_OPEN_QUICK_SETTINGS, openQuickSettings);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <ContextualTopBar onOpenSettings={() => setSettingsOpen(true)} />
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={shortcuts} />
    </div>
  );
}
