"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Code2, X, Maximize2, Minimize2, Copy, Check,
  ChevronLeft, ChevronRight, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MessageWithToolCalls } from "@/lib/types";

interface Artifact {
  id: string;
  messageId: string;
  language: string;
  code: string;
  title: string;
}

function extractArtifacts(messages: MessageWithToolCalls[]): Artifact[] {
  const artifacts: Artifact[] = [];
  const codeBlockRegex = /```(html|svg|jsx|tsx|react|css)\n([\s\S]*?)```/g;

  for (const msg of messages) {
    if (!msg.content || msg.sender_agent_id === null) continue;
    let match;
    let idx = 0;
    while ((match = codeBlockRegex.exec(msg.content)) !== null) {
      const lang = match[1];
      const code = match[2].trim();
      // Only include if it looks renderable (has tags or JSX)
      if (code.length > 50 && (code.includes("<") || lang === "css")) {
        artifacts.push({
          id: `${msg.id}-${idx}`,
          messageId: msg.id,
          language: lang,
          code,
          title: lang === "svg" ? "SVG Image" : lang === "css" ? "Stylesheet" : `${lang.toUpperCase()} Component`,
        });
        idx++;
      }
    }
  }
  return artifacts;
}

function getPreviewColors(): { bg: string; fg: string; muted: string; surface: string; border: string } {
  if (typeof window === "undefined") return { bg: "#09090b", fg: "#e4e4e7", muted: "#a1a1aa", surface: "#18181b", border: "#27272a" };
  const s = getComputedStyle(document.documentElement);
  return {
    bg: s.getPropertyValue("--background").trim() || "#09090b",
    fg: s.getPropertyValue("--foreground").trim() || "#e4e4e7",
    muted: s.getPropertyValue("--muted-foreground").trim() || "#a1a1aa",
    surface: s.getPropertyValue("--card").trim() || "#18181b",
    border: s.getPropertyValue("--border").trim() || "#27272a",
  };
}

function buildPreviewHtml(artifact: Artifact): string {
  const { language, code } = artifact;
  const c = getPreviewColors();

  if (language === "html") {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:system-ui,-apple-system,sans-serif;color:${c.fg};background:${c.bg}}</style></head><body>${code}</body></html>`;
  }

  if (language === "svg") {
    return `<!DOCTYPE html><html><head><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:${c.bg}}</style></head><body>${code}</body></html>`;
  }

  if (language === "css") {
    return `<!DOCTYPE html><html><head><style>${code}</style></head><body><div class="preview">CSS Preview</div></body></html>`;
  }

  // JSX/TSX/React — wrap in a basic React scaffold
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<style>body{margin:0;padding:16px;font-family:system-ui,-apple-system,sans-serif;color:${c.fg};background:${c.bg}}*{box-sizing:border-box}</style>
<script>
// Minimal React-like rendering for simple JSX
document.addEventListener('DOMContentLoaded', function() {
  var root = document.getElementById('root');
  root.innerHTML = \`<div style="padding:16px"><pre style="color:${c.muted};font-size:12px">JSX/TSX artifact detected.\\nRendering requires a React runtime.\\n\\nCode preview:</pre><pre style="color:${c.fg};font-size:11px;white-space:pre-wrap;background:${c.surface};padding:12px;border-radius:8px;border:1px solid ${c.border};margin-top:8px">${code.replace(/`/g, "\\`").replace(/\\/g, "\\\\").replace(/\$/g, "\\$")}</pre></div>\`;
});
</script>
</head><body><div id="root"></div></body></html>`;
}

export function ArtifactsPanel({ messages }: { messages: MessageWithToolCalls[] }) {
  const artifacts = useMemo(() => extractArtifacts(messages), [messages]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (artifacts.length > 0 && activeIndex >= artifacts.length) {
      setActiveIndex(artifacts.length - 1);
    }
  }, [artifacts.length]);

  // Auto-open when new artifact appears
  useEffect(() => {
    if (artifacts.length > 0 && !open) {
      setOpen(true);
      setActiveIndex(artifacts.length - 1);
    }
  }, [artifacts.length]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  if (artifacts.length === 0) return null;

  const current = artifacts[activeIndex] ?? artifacts[0];
  if (!current) return null;

  function handleCopy() {
    navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-20 right-4 z-40 gap-1.5 shadow-[var(--panel-shadow)]"
        onClick={() => setOpen(true)}
      >
        <Layers className="h-4 w-4" />
        {artifacts.length} artifact{artifacts.length !== 1 ? "s" : ""}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col border-l border-border bg-card transition-all duration-200",
        expanded ? "w-[37.5rem]" : "w-[23.75rem]",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Code2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium flex-1">{current.title}</span>
        <Badge variant="outline" className="text-[var(--text-label)]">{current.language}</Badge>

        {artifacts.length > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))} disabled={activeIndex === 0} aria-label="Previous artifact">
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground">{activeIndex + 1}/{artifacts.length}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setActiveIndex(Math.min(artifacts.length - 1, activeIndex + 1))} disabled={activeIndex === artifacts.length - 1} aria-label="Next artifact">
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}

        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy} title="Copy code" aria-label="Copy code">
          {copied ? <Check className="h-3 w-3 text-[var(--accent-emerald)]" /> : <Copy className="h-3 w-3" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(!expanded)} title={expanded ? "Shrink" : "Expand"} aria-label={expanded ? "Shrink panel" : "Expand panel"}>
          {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)} aria-label="Close artifacts panel">
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 overflow-hidden bg-background">
        <iframe
          ref={iframeRef}
          srcDoc={buildPreviewHtml(current)}
          sandbox="allow-scripts"
          className="w-full h-full border-0"
          title="Artifact Preview"
        />
      </div>
    </div>
  );
}
