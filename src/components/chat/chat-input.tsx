"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Square, ChevronDown, Upload } from "lucide-react";
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

interface ChatInputProps {
  onSend: (content: string, targetAgentId?: string, attachmentIds?: string[]) => void;
  onCancel?: () => void;
  isStreaming: boolean;
  agents?: Agent[];
  disabled?: boolean;
}

export function ChatInput({ onSend, onCancel, isStreaming, agents, disabled }: ChatInputProps) {
  const [content, setContent] = useState("");
  const [targetAgent, setTargetAgent] = useState<Agent | null>(null);
  const [commandTrigger, setCommandTrigger] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
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

    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
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
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || "Upload failed");
          continue;
        }

        const data = await res.json();
        uploaded.push(data);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (uploaded.length > 0) {
      setAttachedFiles((prev) => [...prev, ...uploaded]);
    }
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
      className="border-t border-border p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <FileChips files={attachedFiles} onRemove={removeFile} />
      <div className="flex items-end gap-2">
        {agents && agents.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center justify-center gap-1 rounded-md border border-input bg-transparent px-3 h-9 text-sm hover:bg-accent hover:text-accent-foreground shrink-0"
            >
              {targetAgent ? (
                <>
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full text-[8px] font-medium text-white flex items-center justify-center",
                      getAvatarColor(targetAgent.id),
                    )}
                  >
                    {getInitials(targetAgent.name)}
                  </div>
                  <span className="text-xs">{targetAgent.name}</span>
                </>
              ) : (
                <span className="text-xs">All agents</span>
              )}
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setTargetAgent(null)}>
                All agents
              </DropdownMenuItem>
              {agents.map((agent) => (
                <DropdownMenuItem key={agent.id} onClick={() => setTargetAgent(agent)}>
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full text-[8px] font-medium text-white flex items-center justify-center mr-2",
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

        <CommandsMenu
          onSelect={(cmd) => {
            setContent(cmd + " ");
            textareaRef.current?.focus();
          }}
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
          className="h-7 w-7 shrink-0"
          disabled={disabled || uploading || isStreaming}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className={cn("h-3.5 w-3.5", uploading && "animate-spin")} />
        </Button>

        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          disabled={disabled}
          className="min-h-[36px] max-h-[200px] resize-none text-sm"
          rows={1}
        />

        {isStreaming ? (
          <Button
            variant="destructive"
            size="icon"
            className="shrink-0 h-9 w-9"
            onClick={onCancel}
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="shrink-0 h-9 w-9"
            onClick={handleSend}
            disabled={!content.trim() || disabled}
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
