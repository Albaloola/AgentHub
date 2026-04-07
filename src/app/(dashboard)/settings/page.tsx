"use client";

import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#101010] border border-[#3d3a39] mb-4">
        <Settings className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-medium mb-2">Settings</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Open settings with the gear icon in the top bar, or press <kbd className="px-1.5 py-0.5 rounded bg-[#1a1a1c] text-[10px] font-mono border border-[#3d3a39]">Ctrl+,</kbd>
      </p>
    </div>
  );
}
