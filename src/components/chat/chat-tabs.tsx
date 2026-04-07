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
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-sm rounded-lg hover:bg-white/5 transition-all duration-200" onClick={handleNewChat}>
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center px-2 py-1.5 gap-1.5 overflow-x-auto">
      {openTabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={cn(
              "group relative flex items-center gap-1 rounded-full px-4 py-1.5 text-sm cursor-pointer transition-all duration-300 max-w-[180px] shrink-0",
              isActive
                ? "text-foreground"
                : "text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.04]",
            )}
            onClick={() => handleTabClick(tab.id, tab.conversationId)}
          >
            {isActive && (
              <>
                <div className="absolute -inset-[1px] rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-blue-500 animate-[luminance-pulse_2s_ease-in-out_infinite]" />
                <div className="absolute -inset-[4px] rounded-full bg-oklch(0.55_0.24_264_/0.25) blur-lg animate-[luminance-pulse_3s_ease-in-out_infinite]" />
                <div className="absolute inset-[1px] rounded-full bg-oklch(0.16_0.008_260_/0.95)" />
              </>
            )}

            <span className="relative z-10 truncate flex-1">{tab.title}</span>
            <button
              className="relative z-10 ml-1 rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all duration-200"
              onClick={(e) => handleTabClose(e, tab.id)}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      <Button variant="ghost" size="sm" className="relative z-10 h-8 w-8 shrink-0 p-0 rounded-full hover:bg-white/5 transition-all duration-200" onClick={handleNewChat}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
