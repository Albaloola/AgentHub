"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Command,
  History,
  Loader2,
  MoreHorizontal,
  Minimize2,
  Pin,
  RotateCcw,
  Search,
  Share2,
  Square,
  X,
} from "lucide-react";
import { LivingAvatar } from "@/components/ui/living-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareDialog } from "@/components/chat/share-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  compactConversation,
  resetConversation as apiReset,
  toggleConversationPin,
} from "@/lib/api";
import { usePinnedChannelIds } from "@/components/layout/shell-navigation-model";
import type { ConversationWithDetails } from "@/lib/types";
import type { ChatChannelContext } from "./chat-channel-context";
import { toast } from "sonner";

interface ChatHeaderProps {
  conversation: ConversationWithDetails | null;
  channelContext?: ChatChannelContext | null;
  isStreaming: boolean;
  streamingAgentId: string | null;
  onReset: () => void;
  onStop?: () => void;
  onReplay?: () => void;
  replayOpen?: boolean;
  queueCount?: number;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  searchResultCount?: number;
  onNavigateSearch?: (direction: "next" | "prev") => void;
  onConversationPinnedChange?: (pinned: boolean) => void;
}

function ParticipantStack({
  conversation,
  isStreaming,
  streamingAgentId,
}: Pick<ChatHeaderProps, "conversation" | "isStreaming" | "streamingAgentId">) {
  if (!conversation) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {conversation.agents.slice(0, 3).map((agent) => (
        <div key={agent.id} className="flex items-center gap-2 rounded-full border border-foreground/[0.08] px-2 py-1">
          <LivingAvatar
            name={agent.name}
            id={agent.id}
            state={isStreaming && streamingAgentId === agent.id ? "thinking" : "idle"}
            size="sm"
          />
          <span className="max-w-28 truncate text-xs font-medium text-foreground/85">
            {agent.name}
          </span>
        </div>
      ))}
      {conversation.agents.length > 3 && (
        <span className="text-xs text-muted-foreground">+{conversation.agents.length - 3}</span>
      )}
    </div>
  );
}

export function ChatHeader({
  conversation,
  channelContext,
  isStreaming,
  streamingAgentId,
  onReset,
  onStop,
  onReplay,
  replayOpen = false,
  queueCount = 0,
  searchQuery = "",
  onSearchQueryChange,
  searchResultCount = 0,
  onNavigateSearch,
  onConversationPinnedChange,
}: ChatHeaderProps) {
  const [resetOpen, setResetOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [compactOpen, setCompactOpen] = useState(false);
  const [isCompacting, setIsCompacting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isChatPinned, setIsChatPinned] = useState(Boolean(conversation?.is_pinned));
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { isChannelPinned, togglePinnedChannel } = usePinnedChannelIds();

  useEffect(() => {
    setIsChatPinned(Boolean(conversation?.is_pinned));
  }, [conversation?.id, conversation?.is_pinned]);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }

    document.addEventListener("keydown", handleSearchShortcut);
    return () => document.removeEventListener("keydown", handleSearchShortcut);
  }, []);

  function closeSearch() {
    setSearchOpen(false);
    onSearchQueryChange?.("");
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      onNavigateSearch?.(event.shiftKey ? "prev" : "next");
    } else if (event.key === "Escape") {
      closeSearch();
    }
  }

  async function handleReset() {
    if (!conversation) {
      return;
    }

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
    if (!conversation) {
      return;
    }

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

  async function handleToggleChatPin() {
    if (!conversation || isUpdatingPin) {
      return;
    }

    setIsUpdatingPin(true);
    const nextPinned = !isChatPinned;
    setIsChatPinned(nextPinned);

    try {
      await toggleConversationPin(conversation.id);
      onConversationPinnedChange?.(nextPinned);
      toast.success(nextPinned ? "Chat pinned" : "Chat unpinned");
    } catch {
      setIsChatPinned(!nextPinned);
      toast.error("Failed to update chat pin");
    } finally {
      setIsUpdatingPin(false);
    }
  }

  if (!conversation) {
    return null;
  }

  const channelPinned = channelContext?.pinId ? isChannelPinned(channelContext.pinId) : false;
  const ChannelIcon = channelContext?.icon;

  return (
    <div
      className="workspace-shell-chrome px-[var(--shell-pad,1rem)] py-3"
      style={{ minHeight: "calc(var(--topbar-height, 3.5rem) + 0.75rem)" }}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            {channelContext && ChannelIcon && (
              <span
                className="inline-flex items-center gap-2 rounded-full border border-foreground/[0.08] px-3 py-1 text-[var(--text-eyebrow)] font-medium"
                style={{
                  background: `color-mix(in srgb, ${channelContext.accent} 14%, transparent)`,
                  color: channelContext.accent,
                }}
              >
                <ChannelIcon className="h-3.5 w-3.5" />
                {channelContext.label}
              </span>
            )}

            <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight text-foreground">
              {channelContext?.title ?? conversation.name}
            </h1>

            {isStreaming && (
              <span className="text-xs text-[var(--accent-blue)] animate-pulse" aria-live="polite">
                generating…
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {channelContext && (
              <Badge variant="outline" className="text-[var(--text-caption)]">
                {channelContext.kind === "group" ? "Squad channel" : "Direct channel"}
              </Badge>
            )}
            {channelContext?.gatewayLabel && (
              <Badge variant="outline" className="text-[var(--text-caption)]">
                {channelContext.gatewayLabel}
              </Badge>
            )}
            {conversation.type === "group" && (
              <Badge variant="outline" className="text-[var(--text-caption)]">
                {conversation.agents.length} agents
              </Badge>
            )}
            {queueCount > 0 && (
              <Badge
                variant="outline"
                className="border-[var(--accent-amber)]/30 text-[var(--text-caption)] text-[var(--accent-amber)]"
              >
                {queueCount} queued
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{channelContext?.description ?? "Active conversation"}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {channelContext?.pinId && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 rounded-full px-3 text-xs",
                channelPinned
                  ? "text-[var(--accent-amber)] bg-[var(--accent-amber)]/10"
                  : "text-muted-foreground",
              )}
              onClick={() => togglePinnedChannel(channelContext.pinId!)}
              aria-pressed={channelPinned}
            >
              <Pin className="mr-1.5 h-3.5 w-3.5" />
              Channel
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 rounded-full px-3 text-xs",
              isChatPinned
                ? "text-[var(--accent-rose)] bg-[var(--accent-rose)]/10"
                : "text-muted-foreground",
            )}
            onClick={handleToggleChatPin}
            aria-pressed={isChatPinned}
            disabled={isUpdatingPin}
            >
              <Pin className="mr-1.5 h-3.5 w-3.5" />
              Chat
            </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 rounded-full px-3 text-xs",
              searchOpen ? "bg-foreground/[0.06] text-foreground" : "text-muted-foreground",
            )}
            onClick={() => setSearchOpen((previous) => !previous)}
            aria-expanded={searchOpen}
            aria-label="Search messages"
          >
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Search
          </Button>

          {isStreaming && onStop && (
            <Button variant="destructive" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={onStop}>
              <Square className="mr-1.5 h-3.5 w-3.5" />
              Stop
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground"
                  aria-label="More conversation actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuItem onClick={() => setShareOpen(true)}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              {onReplay && (
                <DropdownMenuItem onClick={onReplay} disabled={isStreaming}>
                  <History className="mr-2 h-4 w-4" />
                  {replayOpen ? "Hide replay" : "Open replay"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setCompactOpen(true)} disabled={isStreaming}>
                <Minimize2 className="mr-2 h-4 w-4" />
                Compact conversation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setResetOpen(true)} disabled={isStreaming}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <ParticipantStack
          conversation={conversation}
          isStreaming={isStreaming}
          streamingAgentId={streamingAgentId}
        />
        <div className="flex items-center gap-2 text-[var(--text-eyebrow)] text-muted-foreground">
          <Command className="h-3.5 w-3.5" />
          <span>Use `/` in the composer for channel commands</span>
        </div>
      </div>

      {searchOpen && (
        <div className="surface-subtle mt-3 flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2 animate-fade-in">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange?.(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search messages"
            className="min-w-[12rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
          {searchResultCount > 0 && (
            <span className="text-[var(--text-eyebrow)] text-muted-foreground">
              {searchResultCount} results
            </span>
          )}
          <button
            type="button"
            onClick={() => onNavigateSearch?.("prev")}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            aria-label="Previous search result"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateSearch?.("next")}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            aria-label="Next search result"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={closeSearch}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Dialog open={compactOpen} onOpenChange={setCompactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compact Conversation</DialogTitle>
            <DialogDescription>
              Keeps the opening prompt, pinned messages, and the most recent context while shrinking the transcript.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompactOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompact} disabled={isCompacting}>
              {isCompacting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isCompacting ? "Compacting..." : "Compact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Conversation</DialogTitle>
            <DialogDescription>
              Clears the working context in this chat while keeping the channel and participants intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={isResetting}>
              {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isResetting ? "Resetting..." : "Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        conversationId={conversation.id}
        conversationName={conversation.name}
      />
    </div>
  );
}
