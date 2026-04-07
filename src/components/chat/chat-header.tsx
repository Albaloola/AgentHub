"use client";

import { RotateCcw, Wrench, Square } from "lucide-react";
import { LivingAvatar } from "@/components/ui/living-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { resetConversation as apiReset } from "@/lib/api";
import { useState } from "react";
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
  queueCount?: number;
}

export function ChatHeader({
  conversation,
  isStreaming,
  streamingAgentId,
  toolPanelOpen,
  onToggleToolPanel,
  onReset,
  onStop,
  queueCount = 0,
}: ChatHeaderProps) {
  const [resetOpen, setResetOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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
            <span className="text-[10px] text-blue-400 animate-pulse">generating...</span>
          )}
        </div>
      ))}

      {conversation.type === "group" && (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0">Group</Badge>
      )}

      {queueCount > 0 && (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-400 border-amber-500/30">
          {queueCount} queued
        </Badge>
      )}

      <div className="flex-1" />

      {/* Actions */}
      {isStreaming && onStop && (
        <Button variant="destructive" size="sm" className="h-6 gap-1 rounded-md text-[10px] px-2" onClick={onStop}>
          <Square className="h-2.5 w-2.5" />
          Stop
        </Button>
      )}

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogTrigger render={
          <Button variant="ghost" size="sm" className="h-6 gap-1 rounded-md text-[10px] px-2 text-muted-foreground" disabled={isStreaming}>
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
              {isResetting ? "Resetting..." : "Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
