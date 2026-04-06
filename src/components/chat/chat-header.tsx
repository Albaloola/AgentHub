"use client";

import { RotateCcw, Wrench, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { resetConversation as apiReset } from "@/lib/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ConversationWithDetails } from "@/lib/types";
import { toast } from "sonner";

interface ChatHeaderProps {
  conversation: ConversationWithDetails | null;
  isStreaming: boolean;
  streamingAgentId: string | null;
  toolPanelOpen: boolean;
  onToggleToolPanel: () => void;
  onReset: () => void;
}

export function ChatHeader({
  conversation,
  isStreaming,
  streamingAgentId,
  toolPanelOpen,
  onToggleToolPanel,
  onReset,
}: ChatHeaderProps) {
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  async function handleReset() {
    if (!conversation) return;
    setIsResetting(true);
    try {
      await apiReset(conversation.id);
      toast.success("Conversation context cleared");
      setResetOpen(false);
      onReset();
    } catch {
      toast.error("Failed to reset context");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 md:hidden"
        onClick={() => router.push("/")}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {conversation?.agents.map((agent) => (
        <div key={agent.id} className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white",
              getAvatarColor(agent.id),
            )}
          >
            {getInitials(agent.name)}
          </div>
          <div>
            <div className="text-sm font-medium">{agent.name}</div>
            <div className="text-[10px] text-muted-foreground">
              {agent.gateway_type}
              {isStreaming && streamingAgentId === agent.id && (
                <span className="ml-1 text-yellow-500">thinking...</span>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="ml-auto flex items-center gap-2">
        {conversation?.type === "group" && (
          <Badge variant="outline" className="text-[10px]">
            Group
          </Badge>
        )}

        <Dialog open={resetOpen} onOpenChange={setResetOpen}>
          <DialogTrigger>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={isStreaming}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Reset</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Conversation Context</DialogTitle>
              <DialogDescription>
                This will clear all messages in this conversation. The agent(s) will lose all context.
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReset} disabled={isResetting}>
                {isResetting ? "Resetting..." : "Reset Context"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          variant={toolPanelOpen ? "secondary" : "outline"}
          size="sm"
          onClick={onToggleToolPanel}
          className="gap-1"
        >
          <Wrench className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">Tools</span>
        </Button>
      </div>
    </div>
  );
}
