"use client";

import { RotateCcw, Wrench, Square, Search, X, ChevronUp, ChevronDown, Minimize2, Loader2, History, Share2 } from "lucide-react";
import { LivingAvatar } from "@/components/ui/living-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareDialog } from "@/components/chat/share-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { resetConversation as apiReset, compactConversation } from "@/lib/api";
import { useState, useRef, useEffect } from "react";
import type { ConversationWithDetails } from "@/lib/types";
import { toast } from "sonner";

interface ChatHeaderProps {
  conversation: ConversationWithDetails | null;
  isStreaming: boolean;
  streamingAgentId: string | null;
  toolPanelOpen: boolean;
  onToggleToolPanel: () => void;
  onReset: () => void;
  onStop?: () => void;
  onReplay?: () => void;
  replayOpen?: boolean;
  queueCount?: number;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  searchResultCount?: number;
  onNavigateSearch?: (direction: "next" | "prev") => void;
}

export function ChatHeader({
  conversation,
  isStreaming,
  streamingAgentId,
  toolPanelOpen,
  onToggleToolPanel,
  onReset,
  onStop,
  onReplay,
  replayOpen = false,
  queueCount = 0,
  searchQuery = "",
  onSearchQueryChange,
  searchResultCount = 0,
  onNavigateSearch,
}: ChatHeaderProps) {
  const [resetOpen, setResetOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [compactOpen, setCompactOpen] = useState(false);
  const [isCompacting, setIsCompacting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  function closeSearch() {
    setSearchOpen(false);
    onSearchQueryChange?.("");
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      onNavigateSearch?.(e.shiftKey ? "prev" : "next");
    } else if (e.key === "Escape") {
      closeSearch();
    }
  }

  async function handleReset() {
    if (!conversation) return;
    setIsResetting(true);
    try {
      await apiReset(conversation.id);
      toast.success("Context cleared");
      setResetOpen(false);
      onReset();
    } catch {
      toast.error("Failed to reset");
    } finally {
      setIsResetting(false);
    }
  }

  async function handleCompact() {
    if (!conversation) return;
    setIsCompacting(true);
    try {
      const result = await compactConversation(conversation.id);
      toast.success(`Compacted: removed ${result.removed_count} messages`);
      setCompactOpen(false);
      onReset();
    } catch {
      toast.error("Failed to compact conversation");
    } finally {
      setIsCompacting(false);
    }
  }

  if (!conversation) return null;

  return (
    <div className="flex items-center gap-2 px-2 shrink-0">
      {/* Agent info - compact inline */}
      {conversation.agents.map((agent) => (
        <div key={agent.id} className="flex items-center gap-1.5">
          <LivingAvatar
            name={agent.name}
            id={agent.id}
            state={isStreaming && streamingAgentId === agent.id ? "thinking" : "idle"}
            size="sm"
          />
          <span className="text-sm font-medium">{agent.name}</span>
          {isStreaming && streamingAgentId === agent.id && (
            <span className="text-[0.625rem] text-[var(--accent-blue)] animate-pulse" aria-live="polite">generating...</span>
          )}
        </div>
      ))}

      {conversation.type === "group" && (
        <Badge variant="outline" className="text-[0.5625rem] px-1.5 py-0">Group</Badge>
      )}

      {queueCount > 0 && (
        <Badge variant="outline" className="text-[0.5625rem] px-1.5 py-0 text-[var(--accent-amber)] border-[var(--accent-amber)]/30">
          {queueCount} queued
        </Badge>
      )}

      <div className="flex-1" />

      {/* In-conversation search */}
      {searchOpen && (
        <div className="flex items-center gap-1.5 rounded-lg border border-foreground/[0.08] bg-foreground/[0.04] px-2 py-1 animate-fade-in">
          <Search className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange?.(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search messages..."
            className="bg-transparent text-xs outline-none w-32 placeholder:text-muted-foreground/40"
          />
          {searchResultCount > 0 && (
            <span className="text-[0.625rem] text-muted-foreground/50 tabular-nums shrink-0">
              {searchResultCount} results
            </span>
          )}
          <button 
            onClick={() => onNavigateSearch?.("prev")} 
            className="h-4 w-4 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground transition-colors" 
            aria-label="Previous search result"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button 
            onClick={() => onNavigateSearch?.("next")} 
            className="h-4 w-4 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground transition-colors" 
            aria-label="Next search result"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
          <button onClick={closeSearch} className="h-4 w-4 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground transition-colors" aria-label="Close search">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Actions */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 gap-1 rounded-md text-[0.625rem] px-2 text-muted-foreground"
        onClick={() => setShareOpen(true)}
        title="Share conversation"
        aria-label="Share conversation"
      >
        <Share2 className="h-2.5 w-2.5" />
        Share
      </Button>

      {onReplay && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 gap-1 rounded-md text-[0.625rem] px-2",
            replayOpen ? "text-[var(--accent-blue)]" : "text-muted-foreground",
          )}
          onClick={onReplay}
          disabled={isStreaming}
          title="Replay conversation"
          aria-label="Replay conversation"
        >
          <History className="h-2.5 w-2.5" />
          Replay
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="h-6 gap-1 rounded-md text-[0.625rem] px-2 text-muted-foreground"
        onClick={() => setSearchOpen(!searchOpen)}
        title="Search messages (Ctrl+F)"
        aria-label="Search messages"
      >
        <Search className="h-2.5 w-2.5" />
      </Button>

      {isStreaming && onStop && (
        <Button variant="destructive" size="sm" className="h-6 gap-1 rounded-md text-[0.625rem] px-2" onClick={onStop}>
          <Square className="h-2.5 w-2.5" />
          Stop
        </Button>
      )}

      <Dialog open={compactOpen} onOpenChange={setCompactOpen}>
        <DialogTrigger render={
          <Button variant="ghost" size="sm" className="h-6 gap-1 rounded-md text-[0.625rem] px-2 text-muted-foreground" disabled={isStreaming} title="Compact conversation">
            <Minimize2 className="h-2.5 w-2.5" />
            Compact
          </Button>
        } />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compact Conversation</DialogTitle>
            <DialogDescription>
              Keeps first message, pinned messages, and last 10. Reduces token usage.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompactOpen(false)}>Cancel</Button>
            <Button onClick={handleCompact} disabled={isCompacting}>
              {isCompacting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {isCompacting ? "Compacting..." : "Compact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogTrigger render={
          <Button variant="ghost" size="sm" className="h-6 gap-1 rounded-md text-[0.625rem] px-2 text-muted-foreground" disabled={isStreaming}>
            <RotateCcw className="h-2.5 w-2.5" />
            Reset
          </Button>
        } />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Context</DialogTitle>
            <DialogDescription>Clear all messages. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReset} disabled={isResetting}>
              {isResetting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {isResetting ? "Resetting..." : "Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShareDialog
        conversationId={conversation.id}
        conversationName={conversation.name}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  );
}
