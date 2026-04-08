'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ContextualTopBar } from '@/components/layout/contextual-topbar';
import { SettingsModal } from '@/components/settings/settings-modal';

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

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
    </div>
  );
}
