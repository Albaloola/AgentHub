"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  Send,
  Square,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getAvatarColor, getInitials } from "@/lib/utils";
import type { Agent } from "@/lib/types";
import { CommandsMenu } from "./commands-menu";
import { FileChips, type UploadedFile } from "./file-chips";
import type { ChatChannelContext } from "./chat-channel-context";
import { toast } from "sonner";
import { spring } from "@/lib/animation";

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
  channelContext?: ChatChannelContext | null;
}

function getQuickCommandLabels(channelContext: ChatChannelContext | null | undefined) {
  return (channelContext?.suggestedCommands ?? []).slice(0, 3);
}

export function ChatInput({
  onSend,
  onCancel,
  isStreaming,
  agents,
  disabled,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  conversationId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onFontChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  chatFont,
  isCentered = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hasStartedChat = false,
  channelContext,
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

  const quickCommands = useMemo(() => getQuickCommandLabels(channelContext), [channelContext]);
  const resolvedTargetAgent = useMemo(() => {
    if (!targetAgent) {
      return null;
    }
    return agents?.some((agent) => agent.id === targetAgent.id) ? targetAgent : null;
  }, [agents, targetAgent]);
  const routeLabel = resolvedTargetAgent
    ? resolvedTargetAgent.name
    : channelContext?.kind === "group"
      ? "Entire squad"
      : "Current channel";

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!textareaRef.current || expanded) {
      return;
    }

    textareaRef.current.style.height = "auto";
    const scrollHeight = textareaRef.current.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, 48), 112);
    textareaRef.current.style.height = `${newHeight}px`;
  }, [content, expanded]);

  function handleSend() {
    const text = content.trim();
    if (!text || isStreaming) {
      return;
    }

    onSend(text, resolvedTargetAgent?.id, attachedFiles.map((file) => file.id));
    setContent("");
    setAttachedFiles([]);
    setExpanded(false);
    setCommandTrigger("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape" && expanded) {
      event.preventDefault();
      setExpanded(false);
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleInput(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    setContent(value);

    const lastSlashIndex = value.lastIndexOf("/");
    if (lastSlashIndex < 0) {
      setCommandTrigger("");
      return;
    }

    const afterSlash = value.slice(lastSlashIndex);
    if (!afterSlash.includes(" ")) {
      setCommandTrigger(afterSlash);
      return;
    }

    setCommandTrigger("");
  }

  async function handleFiles(files: FileList) {
    setUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        if (!response.ok) {
          const error = await response.json();
          toast.error(error.error || "Upload failed");
          continue;
        }

        const payload = await response.json();
        uploadedFiles.push(payload);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (uploadedFiles.length > 0) {
      setAttachedFiles((previous) => [...previous, ...uploadedFiles]);
    }

    setUploading(false);
  }

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    if (disabled || uploading || isStreaming) {
      return;
    }
    await handleFiles(event.dataTransfer.files);
  }, [disabled, isStreaming, uploading]);

  function removeFile(id: string) {
    setAttachedFiles((previous) => previous.filter((file) => file.id !== id));
  }

  return (
    <div
      className="relative z-10 mx-auto w-full max-w-[var(--composer-max-width,60rem)] px-3 md:px-4"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <CommandsMenu
        onSelect={(command) => {
          setContent(command);
          textareaRef.current?.focus();
        }}
        triggerValue={commandTrigger}
        disabled={isStreaming}
        channelContext={channelContext}
      />

      <div
        className="pointer-events-none absolute inset-x-6 inset-y-0 rounded-[2rem] blur-3xl transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${channelContext?.accent ?? "var(--theme-accent)"} 0%, transparent 72%)`,
          opacity: isFocused ? 0.28 : 0.12,
        }}
      />

      <motion.div
        className="relative overflow-visible rounded-[1.9rem] border backdrop-blur-xl"
        style={{
          background: "var(--glass-bg)",
          borderColor: "var(--panel-border)",
          boxShadow: isFocused
            ? `var(--panel-shadow), 0 0 0 1px ${channelContext?.accent ?? "var(--theme-accent)"}, 0 0 26px color-mix(in srgb, ${channelContext?.accent ?? "var(--theme-accent)"} 26%, transparent)`
            : "var(--panel-shadow)",
        }}
        animate={{
          scale: isPressed && !prefersReducedMotion ? 0.985 : 1,
        }}
        transition={spring.gentle}
      >
        <div
          className="pointer-events-none absolute inset-x-4 -top-px h-px"
          style={{
            background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${channelContext?.accent ?? "var(--theme-accent)"} 55%, transparent), transparent)`,
          }}
        />

        <FileChips files={attachedFiles} onRemove={removeFile} />

        <div className="space-y-3 px-[var(--shell-card-pad,1rem)] pb-[var(--shell-card-pad,1rem)] pt-3">
          {((agents && agents.length > 1) || quickCommands.length > 0 || channelContext?.scopeHint) && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
              {agents && agents.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="surface-subtle inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-transparent px-3 text-xs transition-colors hover:bg-[var(--surface-hover)]"
                    aria-label="Choose which agent should answer next"
                  >
                  {resolvedTargetAgent ? (
                    <>
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-[0.55rem] font-semibold text-white",
                          getAvatarColor(resolvedTargetAgent.id),
                        )}
                      >
                        {getInitials(resolvedTargetAgent.name)}
                      </div>
                      <span>{resolvedTargetAgent.name}</span>
                    </>
                  ) : (
                      <span>{routeLabel}</span>
                    )}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-56">
                    <DropdownMenuItem onClick={() => setTargetAgent(null)}>
                      {channelContext?.kind === "group" ? "Entire squad" : "Current channel"}
                    </DropdownMenuItem>
                    {agents.map((agent) => (
                      <DropdownMenuItem key={agent.id} onClick={() => setTargetAgent(agent)}>
                        <div
                          className={cn(
                            "mr-2 flex h-5 w-5 items-center justify-center rounded-full text-[0.55rem] font-semibold text-white",
                            getAvatarColor(agent.id),
                          )}
                        >
                          {getInitials(agent.name)}
                        </div>
                        {agent.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {!resolvedTargetAgent && channelContext && (
                <span className="rounded-full border border-foreground/[0.08] px-3 py-1.5 text-[0.7rem] text-muted-foreground">
                  {channelContext.kind === "group" ? "Squad lane" : "Channel lane"}
                </span>
              )}

              {quickCommands.map((command) => (
                <button
                  key={command.name}
                  type="button"
                  onClick={() => {
                    setContent(`${command.name} `);
                    textareaRef.current?.focus();
                  }}
                  className="rounded-full border border-foreground/[0.08] px-3 py-1.5 text-[0.72rem] text-muted-foreground transition-colors hover:border-foreground/[0.16] hover:bg-foreground/[0.04] hover:text-foreground"
                >
                  {command.name}
                </button>
              ))}
              </div>

              {channelContext?.scopeHint ? (
                <span className="hidden max-w-[24rem] text-right text-[0.68rem] text-muted-foreground lg:block">
                  {channelContext.scopeHint}
                </span>
              ) : null}
            </div>
          )}

          <div className={cn("flex gap-2", expanded ? "flex-col" : "items-end")}>
            <div className="flex shrink-0 items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => event.target.files && handleFiles(event.target.files)}
                disabled={disabled || uploading || isStreaming}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-[1rem] text-muted-foreground hover:text-foreground"
                disabled={disabled || uploading || isStreaming}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach file"
              >
                <Upload className={cn("h-4.5 w-4.5", uploading && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-[1rem] text-muted-foreground hover:text-foreground"
                onClick={() => setExpanded((previous) => !previous)}
                aria-label={expanded ? "Collapse composer" : "Expand composer"}
                title={expanded ? "Collapse composer" : "Expand composer"}
              >
                {expanded ? <Minimize2 className="h-4.5 w-4.5" /> : <Maximize2 className="h-4.5 w-4.5" />}
              </Button>
            </div>

            <div className="relative min-w-0 flex-1">
              <div
                className={cn(
                  "overflow-hidden rounded-[1.5rem] border border-foreground/[0.05] bg-foreground/[0.035] transition-colors focus-within:bg-foreground/[0.05]",
                  expanded ? "p-4" : "px-4 py-3",
                )}
              >
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={
                    channelContext?.composerPlaceholder ?? (isCentered ? "Ask anything..." : "Send a message...")
                  }
                  disabled={disabled}
                  aria-label="Message composer"
                  className={cn(
                    "chat-font chat-input-text w-full border-0 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/60",
                    "scrollbar-thin scrollbar-thumb-rounded",
                    expanded && "min-h-[32vh]",
                  )}
                  style={{
                    resize: "none",
                    overflowY: "auto",
                    minHeight: expanded ? "32vh" : "28px",
                    maxHeight: expanded ? "52vh" : "112px",
                    display: "block",
                  }}
                />
              </div>

              {content.length > 0 && (
                <div className="pointer-events-none absolute right-4 top-3 text-[0.68rem] text-muted-foreground/60">
                  ~{Math.ceil(content.length / 4)} tokens
                </div>
              )}
            </div>

            <div className={cn("flex shrink-0 items-center gap-2", expanded && "justify-between")}>
              <div className="hidden flex-col text-[0.68rem] text-muted-foreground md:flex">
                <span>
                  {resolvedTargetAgent ? `Next reply routes to ${resolvedTargetAgent.name}.` : `Next reply routes to ${routeLabel.toLowerCase()}.`}
                </span>
                <span>Enter sends, Shift+Enter adds a newline, `/` opens commands.</span>
              </div>

              {isStreaming ? (
                <Button
                  variant="destructive"
                  className="h-11 rounded-[1rem] px-4"
                  onClick={onCancel}
                  aria-label="Stop generating"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              ) : (
                <motion.div
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                >
                  <Button
                    className={cn(
                      "h-11 rounded-[1rem] px-4 font-medium transition-colors duration-200",
                      content.trim() && !disabled
                        ? "bg-[var(--theme-accent)] text-white shadow-lg shadow-[var(--theme-accent-shadow-strong)] hover:bg-[var(--theme-accent-alt)]"
                        : "bg-foreground/[0.06] text-muted-foreground",
                    )}
                    onClick={handleSend}
                    onMouseDown={() => setIsPressed(true)}
                    onMouseUp={() => setIsPressed(false)}
                    onMouseLeave={() => setIsPressed(false)}
                    disabled={!content.trim() || disabled}
                    aria-label="Send message"
                  >
                    <span>{expanded ? "Send message" : "Send"}</span>
                    {expanded ? (
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    ) : (
                      <Send className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
