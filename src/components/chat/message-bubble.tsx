"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Copy, Check, ChevronDown, ChevronRight, Wrench, User,
  Pencil, RefreshCw, ThumbsUp, ThumbsDown, ArrowRight,
  Bookmark, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LivingAvatar } from "@/components/ui/living-avatar";
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
  animationDelay?: number;
}

export function MessageBubble({
  message,
  isStreaming,
  onRegenerate,
  onEditComplete,
  showActions = true,
  animationDelay = 0,
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
    if (editContent.trim() === message.content) { setEditing(false); return; }
    setSaving(true);
    try {
      await editMessage(message.id, editContent.trim());
      setEditing(false);
      onEditComplete?.();
      toast.success("Message edited");
    } catch { toast.error("Failed to edit"); }
    finally { setSaving(false); }
  }

  async function handleVote(type: "up" | "down") {
    try { const result = await voteMessage(message.id, type); setVotes(result); }
    catch { toast.error("Failed to vote"); }
  }

  async function handlePin() {
    try { await pinMessage(message.id); toast.success(message.is_pinned ? "Unpinned" : "Pinned"); onEditComplete?.(); }
    catch { toast.error("Failed to pin"); }
  }

  // Handoff message
  if (!!message.is_handoff) {
    return (
      <div className="flex items-center justify-center gap-3 py-3 my-2 animate-fade-in">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="glass-bubble flex items-center gap-2 rounded-full px-4 py-2">
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{message.content}</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
    );
  }

  // Summary/compacted message
  if (!!message.is_summary) {
    return (
      <div className="flex gap-3 px-2 py-2 animate-fade-in">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 animate-float">
          <Sparkles className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex-1 glass-bubble rounded-2xl px-5 py-3 text-sm border-amber-500/20">
          <Badge variant="outline" className="text-[0.625rem] border-amber-500/30 text-amber-400 mb-2">Compacted Context</Badge>
          <div className="prose prose-sm max-w-none dark:prose-invert text-muted-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-message-id={message.id}
      className={cn(
        "group flex gap-3 px-2 py-1.5",
        isUser ? "flex-row-reverse" : "flex-row",
        isUser ? "animate-slide-up" : "animate-fade-in",
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-500/20">
          <User className="h-4 w-4" />
        </div>
      ) : message.agent ? (
        <LivingAvatar
          name={message.agent.name}
          id={message.agent.id}
          state={isStreaming ? "speaking" : "idle"}
          size="md"
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-semibold text-foreground">?</div>
      )}

      {/* Content */}
      <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start", "max-w-[90%]")}>
        {/* Agent name + meta */}
        {!isUser && (
          <div className="flex items-center gap-2 px-1">
            {message.agent && (
              <span className="text-xs font-medium text-muted-foreground/80">{message.agent.name}</span>
            )}
            {!!message.is_pinned && <Bookmark className="h-3 w-3 text-amber-400 fill-amber-400" />}
            {!!message.is_edited && <span className="text-[0.625rem] text-muted-foreground/50 italic">(edited)</span>}
            <span className="text-[0.625rem] text-muted-foreground/40">{timeAgo(message.created_at)}</span>
          </div>
        )}

        {isUser && !!(message.is_pinned || message.is_edited) && (
          <div className="flex items-center gap-2 px-1">
            {!!message.is_pinned && <Bookmark className="h-3 w-3 text-amber-400 fill-amber-400" />}
            {!!message.is_edited && <span className="text-[0.625rem] text-muted-foreground/50 italic">(edited)</span>}
          </div>
        )}

        {/* Tool calls */}
        {message.tool_calls.length > 0 && (
          <div className="space-y-1.5 w-full">
            {message.tool_calls.map((tc) => (
              <ToolCallPill key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Editing mode */}
        {editing ? (
          <div className="w-full space-y-2 glass-bubble rounded-2xl p-4">
            <Textarea
              ref={editRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[3.75rem] text-sm bg-transparent border-border/30 rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSaveEdit();
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs rounded-lg" onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save & Send"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg" onClick={() => setEditing(false)}>Cancel</Button>
              <span className="text-[0.625rem] text-muted-foreground/50 self-center ml-auto">Ctrl+Enter</span>
            </div>
          </div>
        ) : (
          message.content && (
            <div className={cn(
              "rounded-2xl px-5 py-3 text-sm transition-all duration-200",
              isUser ? "glass-bubble-user text-white" : "glass-bubble text-foreground",
              hovered && "shadow-lg",
            )}>
              <div className={cn("prose prose-sm max-w-none", isUser ? "prose-invert" : "dark:prose-invert")}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeString = String(children).replace(/\n$/, "");
                      if (match) return <CodeBlock language={match[1]} code={codeString} />;
                      return (
                        <code className="rounded-md bg-black/20 px-1.5 py-0.5 text-xs font-mono" {...props}>
                          {children}
                        </code>
                      );
                    },
                    table({ children }) {
                      return (
                        <div className="overflow-x-auto my-3 rounded-xl border border-border/30 glass">
                          <table className="min-w-full text-xs">{children}</table>
                        </div>
                      );
                    },
                    th({ children }) {
                      return <th className="border-b border-border/30 bg-muted/30 px-3 py-2 text-left font-medium">{children}</th>;
                    },
                    td({ children }) {
                      return <td className="border-b border-border/20 px-3 py-2">{children}</td>;
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              {isStreaming && (
                <span className="inline-block w-2 h-5 ml-1 rounded-sm bg-current animate-pulse" />
              )}
            </div>
          )
        )}

        {/* Action bar - wraps on mobile */}
        {showActions && hovered && !editing && !isStreaming && (
          <div className="flex items-center gap-0.5 px-1 animate-fade-in flex-wrap overflow-hidden max-w-full" style={{ animationDuration: "150ms" }}>
            {isUser && (
              <ActionBtn icon={Pencil} onClick={() => { setEditContent(message.content); setEditing(true); }} title="Edit" glowColor="#3b82f6" />
            )}
            {!isUser && (
              <>
                <ActionBtn icon={ThumbsUp} onClick={() => handleVote("up")} title="Good" active={votes.up > 0} activeColor="text-emerald-400" glowColor="#10b981" />
                <ActionBtn icon={ThumbsDown} onClick={() => handleVote("down")} title="Bad" active={votes.down > 0} activeColor="text-red-400" glowColor="#fb565b" />
                {onRegenerate && (
                  <ActionBtn icon={RefreshCw} onClick={() => onRegenerate(message.id, message.sender_agent_id ?? undefined)} title="Regenerate" glowColor="#8b5cf6" />
                )}
              </>
            )}
            <ActionBtn icon={Bookmark} onClick={handlePin} title={message.is_pinned ? "Unpin" : "Pin"} active={!!message.is_pinned} activeColor="text-amber-400" glowColor="#f59e0b" />
            <CopyBtn text={message.content} />
            {message.token_count > 0 && (
              <span className="text-[0.625rem] text-muted-foreground/40 ml-1.5 tabular-nums">{message.token_count} tok</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, onClick, title, active, activeColor, glowColor }: {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  title: string;
  active?: boolean;
  activeColor?: string;
  glowColor?: string;
}) {
  const glow = glowColor ?? (activeColor?.includes("emerald") ? "#10b981" : activeColor?.includes("red") ? "#fb565b" : activeColor?.includes("amber") ? "#f59e0b" : "#3b82f6");
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7 rounded-lg transition-all duration-200", active && activeColor)}
      onClick={onClick}
      title={title}
      aria-label={title}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 0 8px ${glow}60, 0 0 20px ${glow}25`;
        e.currentTarget.style.background = `${glow}15`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.background = "transparent";
      }}
    >
      <Icon className={cn("h-3.5 w-3.5", active && activeColor ? `${activeColor} fill-current` : "text-muted-foreground/60")} />
    </Button>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 rounded-lg transition-all duration-200"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      title="Copy"
      aria-label="Copy message"
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 8px rgba(6,182,212,0.5), 0 0 20px rgba(6,182,212,0.2)"; e.currentTarget.style.background = "rgba(6,182,212,0.1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "transparent"; }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground/60" />}
    </Button>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(code.split("\n").length > 30);
  const lineCount = code.split("\n").length;
  const displayCode = collapsed ? code.split("\n").slice(0, 15).join("\n") + "\n..." : code;

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-border/20 glass">
      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground/70 border-b border-border/20">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="font-medium">{language}</span>
          <span className="opacity-50">{lineCount} lines</span>
        </div>
        <div className="flex items-center gap-1">
          {lineCount > 30 && (
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand code" : "Collapse code"} aria-expanded={!collapsed}>
              <ChevronDown className={cn("h-3 w-3 transition-transform", !collapsed && "rotate-180")} />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg" onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }} aria-label="Copy code">
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        showLineNumbers
        customStyle={{ margin: 0, borderRadius: 0, fontSize: "12px", background: "transparent", maxHeight: collapsed ? "360px" : undefined }}
        lineNumberStyle={{ minWidth: "2.5em", paddingRight: "1em", color: "oklch(0.35 0 0)" }}
      >
        {displayCode}
      </SyntaxHighlighter>
      {collapsed && (
        <button className="w-full py-2 text-xs text-muted-foreground/50 hover:text-muted-foreground bg-transparent border-t border-border/20 transition-colors" onClick={() => setCollapsed(false)}>
          Show all {lineCount} lines
        </button>
      )}
    </div>
  );
}

function ToolCallPill({ toolCall }: { toolCall: MessageWithToolCalls["tool_calls"][number] }) {
  const [open, setOpen] = useState(false);
  const statusColor =
    toolCall.status === "success" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
    toolCall.status === "error" ? "text-red-400 border-red-500/20 bg-red-500/5" :
    "text-amber-400 border-amber-500/20 bg-amber-500/5";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className={cn("flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs transition-all hover:bg-foreground/5 w-full glass", statusColor)} aria-expanded={open}>
        <Wrench className="h-3 w-3" />
        <span className="font-mono font-medium">{toolCall.tool_name}</span>
        <Badge variant="outline" className={cn("ml-auto text-[0.625rem] px-1.5 py-0 rounded-md", statusColor)}>{toolCall.status}</Badge>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1.5 rounded-xl border border-border/20 glass p-3 text-xs font-mono space-y-2">
          <div>
            <span className="text-muted-foreground/60">Input:</span>
            <pre className="mt-1 whitespace-pre-wrap break-all text-[0.6875rem] text-foreground/80">{formatJSON(toolCall.input)}</pre>
          </div>
          {toolCall.output && toolCall.output !== "{}" && (
            <div>
              <span className="text-muted-foreground/60">Output:</span>
              <pre className="mt-1 whitespace-pre-wrap break-all text-[0.6875rem] text-foreground/80">{formatJSON(toolCall.output)}</pre>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function formatJSON(str: string): string {
  try { return JSON.stringify(JSON.parse(str), null, 2); } catch { return str; }
}
