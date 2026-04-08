"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Send, Square, ChevronDown, Upload, Maximize2, Minimize2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { spring } from "@/lib/animation";

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
  isCentered?: boolean;
  hasStartedChat?: boolean;
}

export function ChatInput({ 
  onSend, 
  onCancel, 
  isStreaming, 
  agents, 
  disabled, 
  conversationId, 
  onFontChange, 
  chatFont,
  isCentered = false,
  hasStartedChat = false,
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const [targetAgent, setTargetAgent] = useState<Agent | null>(null);
  const [commandTrigger, setCommandTrigger] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (textareaRef.current && !expanded) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, 40), 96); // 1 to ~3 lines
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [content, expanded]);

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
      className="relative z-10 max-w-3xl mx-auto px-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <CommandsMenu
        onSelect={(cmd) => { setContent(cmd); textareaRef.current?.focus(); }}
        triggerValue={commandTrigger}
        disabled={isStreaming}
      />

      <div 
        className="absolute inset-0 pointer-events-none rounded-2xl blur-3xl transition-opacity duration-500"
        style={{
          background: "radial-gradient(ellipse at center, var(--theme-accent) 0%, transparent 80%)",
          opacity: isFocused ? 0.4 : 0.15,
          transform: isFocused ? "scale(1.05)" : "scale(1)"
        }}
      />

      <motion.div
        className={cn(
          "relative rounded-2xl backdrop-blur-xl",
        )}
        style={{
          background: "var(--glass-bg)",
          border: `1px solid var(--panel-border)`,
          boxShadow: isFocused
            ? `var(--panel-shadow), 0 0 0 1px var(--theme-accent), 0 0 20px var(--theme-accent-soft)`
            : "var(--panel-shadow)",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
        animate={{
          scale: isPressed && !prefersReducedMotion ? 0.98 : 1,
        }}
        transition={spring.gentle}
      >
        <FileChips files={attachedFiles} onRemove={removeFile} />

        {agents && agents.length > 1 && (
          <div className="px-4 pt-4">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="surface-subtle inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs transition-colors hover:bg-[var(--surface-hover)]"
              >
                {targetAgent ? (
                  <>
                    <div className={cn("h-4 w-4 rounded-md text-[0.5rem] font-medium text-white flex items-center justify-center", getAvatarColor(targetAgent.id))}>
                      {getInitials(targetAgent.name)}
                    </div>
                    <span>{targetAgent.name}</span>
                  </>
                ) : (
                  <span>All agents</span>
                )}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setTargetAgent(null)}>All agents</DropdownMenuItem>
                {agents.map((agent) => (
                  <DropdownMenuItem key={agent.id} onClick={() => setTargetAgent(agent)}>
                    <div className={cn("h-4 w-4 rounded-md text-[0.5rem] font-medium text-white flex items-center justify-center mr-2", getAvatarColor(agent.id))}>
                      {getInitials(agent.name)}
                    </div>
                    {agent.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className={cn("flex px-3 py-3 gap-2", expanded ? "flex-col" : "items-end md:items-center")}>
          {/* Unexpanded Left Buttons */}
          {!expanded && (
            <div className="flex items-center gap-1 shrink-0 pb-1 md:pb-0">
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
                className="h-10 w-10 aspect-square rounded-[0.8rem] transition-all duration-200 text-muted-foreground hover:text-[var(--theme-accent-text)] hover:bg-[var(--theme-accent-softer)]"
                disabled={disabled || uploading || isStreaming}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach file"
              >
                <Upload className={cn("h-4.5 w-4.5", uploading && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 aspect-square rounded-[0.8rem] transition-all duration-200 text-muted-foreground hover:text-[var(--theme-accent-text)] hover:bg-[var(--theme-accent-softer)]"
                onClick={() => setExpanded(true)}
                title="Expand"
                aria-label="Expand input"
              >
                <Maximize2 className="h-4.5 w-4.5" />
              </Button>
            </div>
          )}

          {/* Text Input Area */}
          <div className="flex-1 relative min-w-0">
            <div className={cn(
              "bg-foreground/[0.04] transition-colors duration-200 focus-within:bg-foreground/[0.06] overflow-hidden",
              expanded ? "rounded-xl p-4" : "rounded-2xl py-2.5 px-4"
            )}>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={isCentered ? "Ask anything..." : "Send a message..."}
                disabled={disabled}
                className={cn(
                  "w-full bg-transparent border-0 focus:outline-none focus:ring-0",
                  "placeholder:text-muted-foreground/60 text-foreground",
                  "scrollbar-thin scrollbar-thumb-rounded",
                  expanded ? "min-h-[40vh]" : ""
                )}
                style={{
                  fontSize: "0.9375rem",
                  lineHeight: "1.5",
                  resize: "none",
                  overflowY: "auto",
                  minHeight: expanded ? "40vh" : "24px",
                  maxHeight: expanded ? "50vh" : "96px",
                  display: "block"
                }}
              />
            </div>
            {content.length > 0 && (
              <div className="absolute top-2 right-3 text-[var(--theme-accent-text)] opacity-40 text-[0.6875rem] tabular-nums pointer-events-none">
                ~{Math.ceil(content.length / 4)} t
              </div>
            )}
          </div>

          {/* Unexpanded Right Button */}
          {!expanded && (
            <div className="flex items-center shrink-0 pb-1 md:pb-0">
              {isStreaming ? (
                <Button variant="destructive" size="icon" className="h-10 w-10 aspect-square rounded-[0.8rem] transition-all" onClick={onCancel}>
                  <Square className="h-4.5 w-4.5" />
                </Button>
              ) : (
                <motion.div whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                  <Button
                    size="icon"
                    className={cn(
                      "h-10 w-10 aspect-square rounded-[0.8rem] transition-all duration-200",
                      content.trim() && !disabled ? "bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-alt)] text-white shadow-lg shadow-[var(--theme-accent-shadow-strong)]" : "bg-foreground/[0.06] text-muted-foreground"
                    )}
                    onClick={handleSend}
                    onMouseDown={() => setIsPressed(true)}
                    onMouseUp={() => setIsPressed(false)}
                    onMouseLeave={() => setIsPressed(false)}
                    disabled={!content.trim() || disabled}
                    aria-label="Send message"
                  >
                    <Send className="h-4.5 w-4.5" />
                  </Button>
                </motion.div>
              )}
            </div>
          )}

          {/* Expanded Bottom Row */}
          {expanded && (
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1 pl-1">
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
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                  disabled={disabled || uploading || isStreaming}
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                >
                  <Upload className={cn("h-4 w-4", uploading && "animate-spin")} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => setExpanded(false)}
                  title="Minimize"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="pr-1">
                {isStreaming ? (
                  <Button variant="destructive" size="sm" className="rounded-lg px-4 transition-all" onClick={onCancel}>
                    <Square className="h-4 w-4 mr-2" /> Stop
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className={cn(
                      "rounded-lg px-5 font-medium transition-all duration-200",
                      content.trim() && !disabled ? "bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-alt)] text-white shadow-lg shadow-[var(--theme-accent-shadow)]" : "bg-foreground/[0.06] text-muted-foreground"
                    )}
                    onClick={handleSend}
                    disabled={!content.trim() || disabled}
                  >
                    Send <Send className="h-3.5 w-3.5 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
