"use client";

export const UI_EVENT_OPEN_COMMAND_PALETTE = "agenthub:open-command-palette";
export const UI_EVENT_OPEN_QUICK_SETTINGS = "agenthub:open-quick-settings";

function dispatchUiEvent(eventName: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(eventName));
}

export function openCommandPalette() {
  dispatchUiEvent(UI_EVENT_OPEN_COMMAND_PALETTE);
}

export function openQuickSettings() {
  dispatchUiEvent(UI_EVENT_OPEN_QUICK_SETTINGS);
}
