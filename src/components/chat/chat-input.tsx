"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Square, ChevronDown, Upload, Maximize2, Minimize2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import type { Agent } from "@/lib/types";
import { CommandsMenu } from "./commands-menu";
import { FileChips, UploadedFile } from "./file-chips";
import { toast } from "sonner";

const CHAT_FONTS = [
  { value: "", label: "Default" },
  { value: "geist", label: "Geist" },
  { value: "inter", label: "Inter" },
  { value: "nunito", label: "Nunito" },
  { value: "lexend", label: "Lexend" },
  { value: "caveat", label: "Caveat" },
  { value: "comic-neue", label: "Comic Neue" },
];

interface ChatInputProps {
  onSend: (content: string, targetAgentId?: string, attachmentIds?: string[]) => void;
  onCancel?: () => void;
  isStreaming: boolean;
  agents?: Agent[];
  disabled?: boolean;
  conversationId?: string;
  onFontChange?: (font: string) => void;
  chatFont?: string;
}

export function ChatInput({ onSend, onCancel, isStreaming, agents, disabled, conversationId, onFontChange, chatFont }: ChatInputProps) {
  const [content, setContent] = useState("");
  const [targetAgent, setTargetAgent] = useState<Agent | null>(null);
  const [commandTrigger, setCommandTrigger] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleSend() {
    const text = content.trim();
    if (!text || isStreaming) return;
    onSend(text, targetAgent?.id, attachedFiles.map((f) => f.id));
    setContent("");
    setAttachedFiles([]);
    setExpanded(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setContent(value);

    const lastSlashIndex = value.lastIndexOf("/");
    if (lastSlashIndex >= 0) {
      const afterSlash = value.slice(lastSlashIndex);
      if (!afterSlash.includes(" ")) {
        setCommandTrigger(afterSlash);
      } else {
        setCommandTrigger("");
      }
    } else {
      setCommandTrigger("");
    }

    if (!expanded) {
      const el = e.target;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 300) + "px";
    }
  }

  async function handleFiles(files: FileList) {
    setUploading(true);
    const uploaded: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) { const err = await res.json(); toast.error(err.error || "Upload failed"); continue; }
        const data = await res.json();
        uploaded.push(data);
      } catch { toast.error(`Failed to upload ${file.name}`); }
    }

    if (uploaded.length > 0) setAttachedFiles((prev) => [...prev, ...uploaded]);
    setUploading(false);
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || uploading || isStreaming) return;
    await handleFiles(e.dataTransfer.files);
  }, [disabled, uploading, isStreaming]);

  function removeFile(id: string) {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div
      className={cn(
        "relative z-10 p-4 transition-all duration-300",
        expanded ? "pb-6" : "",
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className={cn(
        "glass-strong rounded-2xl transition-all duration-300 overflow-hidden",
        expanded ? "min-h-[300px]" : "",
      )}>
        <FileChips files={attachedFiles} onRemove={removeFile} />

        <div className={cn("flex gap-2 p-3", expanded ? "flex-col" : "items-end")}>
          {/* Top bar: agent selector + actions */}
          <div className="flex items-center gap-2">
            {agents && agents.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/30 bg-white/5 px-3 h-8 text-xs hover:bg-white/10 transition-colors shrink-0"
                >
                  {targetAgent ? (
                    <>
                      <div className={cn("h-4 w-4 rounded-md text-[8px] font-medium text-white flex items-center justify-center", getAvatarColor(targetAgent.id))}>
                        {getInitials(targetAgent.name)}
                      </div>
                      <span>{targetAgent.name}</span>
                    </>
                  ) : (
                    <span>All agents</span>
                  )}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="glass-strong rounded-xl">
                  <DropdownMenuItem onClick={() => setTargetAgent(null)}>All agents</DropdownMenuItem>
                  {agents.map((agent) => (
                    <DropdownMenuItem key={agent.id} onClick={() => setTargetAgent(agent)}>
                      <div className={cn("h-4 w-4 rounded-md text-[8px] font-medium text-white flex items-center justify-center mr-2", getAvatarColor(agent.id))}>
                        {getInitials(agent.name)}
                      </div>
                      {agent.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <CommandsMenu
              onSelect={(cmd) => { setContent(cmd + " "); textareaRef.current?.focus(); }}
              triggerValue={commandTrigger}
              disabled={isStreaming}
            />

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              disabled={disabled || uploading || isStreaming}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 rounded-lg transition-all duration-200"
              disabled={disabled || uploading || isStreaming}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 8px rgba(139,92,246,0.5), 0 0 20px rgba(139,92,246,0.2)"; e.currentTarget.style.background = "rgba(139,92,246,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "transparent"; }}
            >
              <Upload className={cn("h-3.5 w-3.5", uploading && "animate-spin")} />
            </Button>

            {/* Per-chat font selector */}
            {onFontChange && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 cursor-pointer",
                    chatFont ? "text-blue-400" : "",
                  )}
                  onMouseEnter={(e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.boxShadow = "0 0 8px rgba(59,130,246,0.5), 0 0 20px rgba(59,130,246,0.2)"; e.currentTarget.style.background = "rgba(59,130,246,0.1)"; }}
                  onMouseLeave={(e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "transparent"; }}
                >
                  <Type className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="glass-strong rounded-xl">
                  {CHAT_FONTS.map((f) => (
                    <DropdownMenuItem
                      key={f.value}
                      onClick={() => onFontChange(f.value)}
                      className={cn(chatFont === f.value && "text-blue-400")}
                    >
                      {f.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {!expanded && <div className="flex-1" />}

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 rounded-lg transition-all duration-200"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? "Minimize" : "Expand"}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 8px rgba(6,182,212,0.5), 0 0 20px rgba(6,182,212,0.2)"; e.currentTarget.style.background = "rgba(6,182,212,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "transparent"; }}
            >
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {/* Text area */}
          <div className="flex items-end gap-2 flex-1 w-full">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              disabled={disabled}
              className={cn(
                "resize-none text-sm bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40",
                expanded ? "min-h-[200px] flex-1" : "min-h-[44px] max-h-[300px]",
              )}
              rows={expanded ? 8 : 2}
            />

            {isStreaming ? (
              <Button
                variant="destructive"
                size="icon"
                className="shrink-0 h-10 w-10 rounded-xl"
                onClick={onCancel}
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="shrink-0 h-10 w-10 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 neon-action transition-all duration-200 hover:scale-105"
                onClick={handleSend}
                disabled={!content.trim() || disabled}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
