"use client";

import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";

export function ChatTabs() {
  const { openTabs, activeTabId, addTab, removeTab, setActiveTabId } = useStore();
  const router = useRouter();

  function handleTabClick(tabId: string, conversationId: string) {
    setActiveTabId(tabId);
    router.push(`/chat/${conversationId}`);
  }

  function handleTabClose(e: React.MouseEvent, tabId: string) {
    e.stopPropagation();
    removeTab(tabId);
  }

  function handleNewChat() {
    const tabId = uuid();
    addTab({ id: tabId, conversationId: "", title: "New Chat" });
    router.push("/");
  }

  if (openTabs.length === 0) {
    return (
      <div className="flex items-center px-3 py-1.5">
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs rounded-lg hover:bg-white/5" onClick={handleNewChat}>
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center px-2 py-1.5 gap-1 overflow-x-auto">
      {openTabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "group flex items-center gap-1 rounded-lg px-3 py-1 text-xs cursor-pointer transition-all duration-200 max-w-[160px] shrink-0",
            tab.id === activeTabId
              ? "glass-bubble neon-border text-foreground"
              : "text-muted-foreground hover:bg-white/5",
          )}
          onClick={() => handleTabClick(tab.id, tab.conversationId)}
        >
          <span className="truncate flex-1">{tab.title}</span>
          <button
            className="ml-1 rounded-md p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity"
            onClick={(e) => handleTabClose(e, tab.id)}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0 rounded-lg hover:bg-white/5" onClick={handleNewChat}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
