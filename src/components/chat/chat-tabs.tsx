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
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs rounded-lg hover:bg-white/5 transition-all duration-200" onClick={handleNewChat}>
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center px-2 py-1.5 gap-1 overflow-x-auto">
      {/* Ambient glow behind active tab */}
      <div className="absolute inset-x-2 bottom-0 h-px bg-gradient-to-r from-transparent via-oklch(0.55_0.24_264_/0.3) to-transparent animate-[luminance-pulse_3s_ease-in-out_infinite]" />

      {openTabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={cn(
              "group relative flex items-center gap-1 rounded-lg px-3 py-1 text-xs cursor-pointer transition-all duration-300 max-w-[160px] shrink-0",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]",
            )}
            onClick={() => handleTabClick(tab.id, tab.conversationId)}
          >
            {/* Active tab luminance glow */}
            {isActive && (
              <>
                {/* Soft glow behind tab */}
                <div className="absolute inset-0 rounded-lg bg-oklch(0.55_0.24_264_/0.08) blur-sm animate-[luminance-pulse_3s_ease-in-out_infinite]" />
                {/* Glass surface */}
                <div className="absolute inset-0 rounded-lg glass-bubble" />
                {/* Bottom luminance line */}
                <div className="absolute bottom-0 left-[15%] right-[15%] h-[1.5px] rounded-full bg-gradient-to-r from-transparent via-oklch(0.55_0.24_264_/0.7) to-transparent animate-[luminance-pulse_2.5s_ease-in-out_infinite]" />
              </>
            )}

            {/* Content */}
            <span className="relative z-10 truncate flex-1">{tab.title}</span>
            <button
              className="relative z-10 ml-1 rounded-md p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all duration-200"
              onClick={(e) => handleTabClose(e, tab.id)}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      <Button variant="ghost" size="sm" className="relative z-10 h-7 w-7 shrink-0 p-0 rounded-lg hover:bg-white/5 transition-all duration-200" onClick={handleNewChat}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
