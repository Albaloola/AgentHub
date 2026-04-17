"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Shortcut {
  key: string;
  description: string;
  category: string;
  action: () => void;
}

export function useKeyboardShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  const shortcuts: Shortcut[] = [
    // Navigation
    { key: "g d", description: "Go to Dashboard", category: "Navigation", action: () => router.push("/") },
    { key: "g a", description: "Go to Agents", category: "Navigation", action: () => router.push("/agents") },
    { key: "g t", description: "Go to Templates", category: "Navigation", action: () => router.push("/templates") },
    { key: "g w", description: "Go to Workflows", category: "Navigation", action: () => router.push("/workflows") },
    { key: "g r", description: "Go to Arena", category: "Navigation", action: () => router.push("/arena") },
    { key: "g m", description: "Go to Monitoring", category: "Navigation", action: () => router.push("/monitoring") },
    { key: "g p", description: "Go to Playground", category: "Navigation", action: () => router.push("/playground") },
    { key: "g k", description: "Go to Knowledge", category: "Navigation", action: () => router.push("/knowledge") },
    { key: "g s", description: "Go to Settings", category: "Navigation", action: () => router.push("/settings") },

    // Actions
    { key: "?", description: "Show keyboard shortcuts", category: "General", action: () => setHelpOpen(true) },
  ];

  useEffect(() => {
    let keySequence = "";
    let sequenceTimer: ReturnType<typeof setTimeout>;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      // Ctrl+/ for shortcuts help
      if (e.key === "/" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setHelpOpen((prev) => !prev);
        return;
      }

      // ? for help
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setHelpOpen((prev) => !prev);
        return;
      }

      // Escape to close
      if (e.key === "Escape") {
        setHelpOpen(false);
        return;
      }

      // Build key sequence for chord shortcuts (g + letter)
      clearTimeout(sequenceTimer);
      keySequence += e.key + " ";
      sequenceTimer = setTimeout(() => { keySequence = ""; }, 800);

      const seq = keySequence.trim();
      const match = shortcuts.find((s) => s.key === seq);
      if (match) {
        e.preventDefault();
        match.action();
        keySequence = "";
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { helpOpen, setHelpOpen, shortcuts };
}

export function ShortcutsHelp({
  open,
  onClose,
  shortcuts,
}: {
  open: boolean;
  onClose: () => void;
  shortcuts: { key: string; description: string; category: string }[];
}) {
  if (!open) return null;

  const categories = [...new Set(shortcuts.map((s) => s.category))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-[var(--panel-shadow-dramatic)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            <h2 className="font-semibold">Keyboard Shortcuts</h2>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">{cat}</h3>
              <div className="space-y-1.5">
                {shortcuts.filter((s) => s.category === cat).map((s) => (
                  <div key={s.key} className="flex items-center justify-between text-sm">
                    <span>{s.description}</span>
                    <div className="flex gap-1">
                      {s.key.split(" ").map((k, i) => (
                        <span key={i}>
                          <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono border border-border">{k}</kbd>
                          {i < s.key.split(" ").length - 1 && <span className="text-muted-foreground mx-0.5">then</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">Built-in</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span>Command palette</span>
                <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono border border-border">Ctrl+K</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Send message</span>
                <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono border border-border">Enter</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>New line in input</span>
                <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono border border-border">Shift+Enter</kbd>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="rounded bg-muted px-1 py-0.5 text-xs font-mono border border-border">?</kbd> or <kbd className="rounded bg-muted px-1 py-0.5 text-xs font-mono border border-border">Ctrl+/</kbd> to toggle
          </p>
        </div>
      </div>
    </div>
  );
}
