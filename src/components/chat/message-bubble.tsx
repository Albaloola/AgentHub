"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Copy, Check, ChevronDown, ChevronRight, Wrench, User,
  Pencil, RefreshCw, ThumbsUp, ThumbsDown, Pin, ArrowRight,
  MoreHorizontal, X, Bookmark, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn, getInitials, getAvatarColor, timeAgo } from "@/lib/utils";
import { editMessage, voteMessage, pinMessage } from "@/lib/api";
import type { MessageWithToolCalls } from "@/lib/types";
import { toast } from "sonner";

interface MessageBubbleProps {
  message: MessageWithToolCalls;
  isStreaming?: boolean;
  onRegenerate?: (messageId: string, agentId?: string) => void;
  onEditComplete?: () => void;
  showActions?: boolean;
}

export function MessageBubble({
  message,
  isStreaming,
  onRegenerate,
  onEditComplete,
  showActions = true,
}: MessageBubbleProps) {
  const isUser = message.sender_agent_id === null;
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [hovered, setHovered] = useState(false);
  const [votes, setVotes] = useState(message.votes ?? { up: 0, down: 0 });
  const [saving, setSaving] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editContent.length, editContent.length);
    }
  }, [editing]);

  async function handleSaveEdit() {
    if (editContent.trim() === message.content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await editMessage(message.id, editContent.trim());
      setEditing(false);
      onEditComplete?.();
      toast.success("Message edited");
    } catch {
      toast.error("Failed to edit");
    } finally {
      setSaving(false);
    }
  }

  async function handleVote(type: "up" | "down") {
    try {
      const result = await voteMessage(message.id, type);
      setVotes(result);
    } catch {
      toast.error("Failed to vote");
    }
  }

  async function handlePin() {
    try {
      await pinMessage(message.id);
      toast.success(message.is_pinned ? "Unpinned" : "Pinned");
      onEditComplete?.();
    } catch {
      toast.error("Failed to pin");
    }
  }

  // Handoff message
  if (message.is_handoff) {
    return (
      <div className="flex items-center justify-center gap-2 py-2 my-1">
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5">
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{message.content}</span>
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>
    );
  }

  // Summary message
  if (message.is_summary) {
    return (
      <div className="flex gap-3 px-2 py-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-600/10">
          <Sparkles className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex-1 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">Compacted Context</Badge>
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert text-muted-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("group flex gap-3 px-2 py-1", isUser ? "flex-row-reverse" : "flex-row")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
          <User className="h-4 w-4" />
        </div>
      ) : (
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white",
            message.agent ? getAvatarColor(message.agent.id) : "bg-muted",
          )}
        >
          {message.agent ? getInitials(message.agent.name) : "?"}
        </div>
      )}

      {/* Content */}
      <div className={cn("flex max-w-[80%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
        {/* Agent name + badges */}
        {!isUser && (
          <div className="flex items-center gap-2">
            {message.agent && (
              <span className="text-xs text-muted-foreground">{message.agent.name}</span>
            )}
            {message.is_pinned && <Bookmark className="h-3 w-3 text-amber-500 fill-amber-500" />}
            {message.is_edited && (
              <span className="text-[10px] text-muted-foreground italic">(edited)</span>
            )}
          </div>
        )}

        {/* Pinned / edited indicators for user messages */}
        {isUser && (message.is_pinned || message.is_edited) && (
          <div className="flex items-center gap-2">
            {message.is_pinned && <Bookmark className="h-3 w-3 text-amber-500 fill-amber-500" />}
            {message.is_edited && <span className="text-[10px] text-muted-foreground italic">(edited)</span>}
          </div>
        )}

        {/* Tool calls before content */}
        {message.tool_calls.length > 0 && (
          <div className="space-y-1 w-full">
            {message.tool_calls.map((tc) => (
              <ToolCallPill key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Editing mode */}
        {editing ? (
          <div className="w-full space-y-2">
            <Textarea
              ref={editRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[60px] text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSaveEdit();
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs" onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save & Send"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <span className="text-[10px] text-muted-foreground self-center ml-auto">Ctrl+Enter to save</span>
            </div>
          </div>
        ) : (
          /* Message content */
          message.content && (
            <div
              className={cn(
                "rounded-lg px-4 py-2.5 text-sm",
                isUser ? "bg-blue-600 text-white" : "bg-muted text-foreground",
              )}
            >
              <div className={cn("prose prose-sm max-w-none", isUser ? "prose-invert" : "dark:prose-invert")}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeString = String(children).replace(/\n$/, "");

                      if (match) {
                        return <CodeBlock language={match[1]} code={codeString} />;
                      }

                      return (
                        <code className="rounded bg-black/20 px-1.5 py-0.5 text-xs font-mono" {...props}>
                          {children}
                        </code>
                      );
                    },
                    table({ children }) {
                      return (
                        <div className="overflow-x-auto my-2 rounded-md border border-border">
                          <table className="min-w-full text-xs">{children}</table>
                        </div>
                      );
                    },
                    th({ children }) {
                      return <th className="border-b border-border bg-muted/50 px-3 py-1.5 text-left font-medium">{children}</th>;
                    },
                    td({ children }) {
                      return <td className="border-b border-border px-3 py-1.5">{children}</td>;
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse" />
              )}
            </div>
          )
        )}

        {/* Action buttons (hover) */}
        {showActions && hovered && !editing && !isStreaming && (
          <div className="flex items-center gap-0.5 -mt-0.5">
            {/* User message actions */}
            {isUser && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditContent(message.content); setEditing(true); }} title="Edit">
                <Pencil className="h-3 w-3" />
              </Button>
            )}

            {/* Agent message actions */}
            {!isUser && (
              <>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleVote("up")} title="Good response">
                  <ThumbsUp className={cn("h-3 w-3", votes.up > 0 && "text-emerald-500 fill-emerald-500")} />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleVote("down")} title="Bad response">
                  <ThumbsDown className={cn("h-3 w-3", votes.down > 0 && "text-red-500 fill-red-500")} />
                </Button>
                {onRegenerate && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRegenerate(message.id, message.sender_agent_id ?? undefined)} title="Regenerate">
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}

            {/* Common actions */}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handlePin} title={message.is_pinned ? "Unpin" : "Pin"}>
              <Bookmark className={cn("h-3 w-3", message.is_pinned && "text-amber-500 fill-amber-500")} />
            </Button>

            {/* Copy */}
            <CopyButton text={message.content} />

            {/* Token count */}
            {message.token_count > 0 && (
              <span className="text-[10px] text-muted-foreground ml-1">{message.token_count} tok</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy} title="Copy">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(code.split("\n").length > 30);
  const lineCount = code.split("\n").length;

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const displayCode = collapsed ? code.split("\n").slice(0, 15).join("\n") + "\n..." : code;

  return (
    <div className="relative my-2 rounded-lg overflow-hidden border border-border/50">
      <div className="flex items-center justify-between bg-[#1e1e2e] px-3 py-1.5 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="font-medium">{language}</span>
          <span className="text-gray-500">{lineCount} lines</span>
        </div>
        <div className="flex items-center gap-1">
          {lineCount > 30 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-white"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand" : "Collapse"}
            >
              <ChevronDown className={cn("h-3 w-3 transition-transform", !collapsed && "rotate-180")} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        showLineNumbers
        customStyle={{ margin: 0, borderRadius: 0, fontSize: "12px", maxHeight: collapsed ? "360px" : undefined }}
        lineNumberStyle={{ minWidth: "2.5em", paddingRight: "1em", color: "#4a4a6a" }}
      >
        {displayCode}
      </SyntaxHighlighter>
      {collapsed && (
        <button
          className="w-full py-1.5 text-xs text-gray-400 hover:text-white bg-[#1e1e2e] border-t border-gray-800 transition-colors"
          onClick={() => setCollapsed(false)}
        >
          Show all {lineCount} lines
        </button>
      )}
    </div>
  );
}

function ToolCallPill({ toolCall }: { toolCall: MessageWithToolCalls["tool_calls"][number] }) {
  const [open, setOpen] = useState(false);

  const statusColor =
    toolCall.status === "success"
      ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
      : toolCall.status === "error"
        ? "text-red-500 border-red-500/30 bg-red-500/10"
        : "text-yellow-500 border-yellow-500/30 bg-yellow-500/10";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs transition-colors hover:bg-accent/50 w-full",
          statusColor,
        )}
      >
        <Wrench className="h-3 w-3" />
        <span className="font-mono font-medium">{toolCall.tool_name}</span>
        <Badge variant="outline" className={cn("ml-auto text-[10px] px-1 py-0", statusColor)}>
          {toolCall.status}
        </Badge>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 rounded-md border border-border bg-muted/50 p-2 text-xs font-mono space-y-2">
          <div>
            <span className="text-muted-foreground">Input:</span>
            <pre className="mt-0.5 whitespace-pre-wrap break-all text-[11px]">{formatJSON(toolCall.input)}</pre>
          </div>
          {toolCall.output && toolCall.output !== "{}" && (
            <div>
              <span className="text-muted-foreground">Output:</span>
              <pre className="mt-0.5 whitespace-pre-wrap break-all text-[11px]">{formatJSON(toolCall.output)}</pre>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function formatJSON(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}
