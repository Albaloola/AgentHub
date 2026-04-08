"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Send, Square, ChevronDown, Upload, Maximize2, Minimize2, Type, Image, Smile } from "lucide-react";
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
import { spring, ease } from "@/lib/animation";

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
      const newHeight = Math.min(Math.max(scrollHeight, 120), 300);
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

  const showLeftColumn = hasStartedChat || expanded;

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

      <motion.div
        className={cn(
          "relative rounded-2xl transition-all duration-300",
          "backdrop-blur-xl",
          isFocused && "ring-2"
        )}
        style={{
          background: "var(--glass-bg)",
          border: `1px solid ${isFocused ? "var(--ring)" : "var(--glass-border-color)"}`,
          boxShadow: isFocused 
            ? `var(--panel-shadow), 0 0 0 3px var(--theme-accent-soft)`
            : "var(--panel-shadow)",
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

        <div className="flex items-start gap-4 p-4">
          {showLeftColumn && (
            <motion.div 
              className="flex flex-col items-center gap-3 shrink-0 py-2"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              transition={{ duration: 0.2 }}
            >
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
                className="h-9 w-9 rounded-xl transition-all duration-200 hover-glow-violet shrink-0"
                disabled={disabled || uploading || isStreaming}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach file"
              >
                <Upload className={cn("h-4 w-4", uploading && "animate-spin")} />
              </Button>

              {onFontChange && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 cursor-pointer hover-glow-blue",
                      chatFont ? "text-[var(--theme-accent-text)]" : "",
                    )}
                    aria-label="Change chat font"
                  >
                    <Type className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {CHAT_FONTS.map((f) => (
                      <DropdownMenuItem
                        key={f.value}
                        onClick={() => onFontChange(f.value)}
                        className={cn(chatFont === f.value && "text-[var(--theme-accent-text)]")}
                      >
                        {f.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl transition-all duration-200 hover-glow-cyan shrink-0"
                onClick={() => setExpanded(!expanded)}
                title={expanded ? "Minimize" : "Expand"}
                aria-label={expanded ? "Minimize input" : "Expand input"}
              >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </motion.div>
          )}

          <div className="flex-1 relative min-w-0">
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
                "w-full resize-none bg-transparent border-0 focus:outline-none focus:ring-0",
                "placeholder:text-muted-foreground/50 text-foreground",
                "scrollbar-thin scrollbar-thumb-rounded",
                expanded ? "min-h-[200px]" : "min-h-[120px] max-h-[300px]"
              )}
              style={{
                fontSize: "0.9375rem",
                lineHeight: "1.6",
              }}
              rows={expanded ? 8 : 3}
            />
            {content.length > 0 && (
              <div className="absolute bottom-0 right-0 text-muted-foreground/40 text-[0.6875rem] tabular-nums pointer-events-none">
                ~{Math.ceil(content.length / 4)} tokens
              </div>
            )}
          </div>

          <div className="flex flex-col justify-end shrink-0 py-2">
            {isStreaming ? (
              <Button
                variant="destructive"
                size="icon"
                className="h-11 w-11 rounded-xl transition-all duration-200 hover:scale-105"
                onClick={onCancel}
                aria-label="Stop generating"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <motion.div
                whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  size="icon"
                  className={cn(
                    "h-11 w-11 rounded-xl transition-all duration-200",
                    "bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-alt)]",
                    "text-white shadow-lg",
                    content.trim() && !disabled && "shadow-[var(--theme-accent-shadow-strong)]"
                  )}
                  onClick={handleSend}
                  onMouseDown={() => setIsPressed(true)}
                  onMouseUp={() => setIsPressed(false)}
                  onMouseLeave={() => setIsPressed(false)}
                  disabled={!content.trim() || disabled}
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
