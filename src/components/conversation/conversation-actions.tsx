"use client";

import { useState } from "react";
import { Pin, PinOff, GitBranch, Download, MessageSquare, Trash2, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { toggleConversationPin, branchConversation, exportConversation } from "@/lib/api";

interface ConversationActionsProps {
  conversationId: string;
  isPinned: boolean;
  onPinChange: (pinned: boolean) => void;
  onBranch: (newConvId: string) => void;
}

export function ConversationActions({ conversationId, isPinned, onPinChange, onBranch }: ConversationActionsProps) {
  const [loading, setLoading] = useState(false);

  async function handlePin() {
    try {
      await toggleConversationPin(conversationId);
      onPinChange(!isPinned);
      toast.success(isPinned ? "Unpinned" : "Pinned");
    } catch {
      toast.error("Failed to pin");
    }
  }

  async function handleBranch() {
    setLoading(true);
    try {
      const { id } = await branchConversation(conversationId);
      onBranch(id);
      toast.success("Conversation branched");
    } catch {
      toast.error("Failed to branch");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: "markdown" | "json" | "html") {
    try {
      const content = await exportConversation(conversationId, format);
      const ext = { markdown: "md", json: "json", html: "html" }[format];
      const mime = { markdown: "text/markdown", json: "application/json", html: "text/html" }[format];
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversation-${conversationId}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format}`);
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="sm" className="gap-1">
          <Share className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handlePin}>
          {isPinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
          {isPinned ? "Unpin" : "Pin Conversation"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleBranch} disabled={loading}>
          <GitBranch className="h-4 w-4 mr-2" />
          Branch
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("markdown")}>
          <Download className="h-4 w-4 mr-2" />
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          <Download className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("html")}>
          <Download className="h-4 w-4 mr-2" />
          Export as HTML
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
