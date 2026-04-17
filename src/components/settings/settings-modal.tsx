"use client";

import { SettingsSurface } from "@/components/settings/settings-surface";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  if (!open) return null;
  return <SettingsSurface variant="modal" onClose={onClose} />;
}
