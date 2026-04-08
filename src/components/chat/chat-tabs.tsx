"use client";

import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";

export function ChatTabs() {
  const { openTabs, activeTabId, addTab, removeTab, setActiveTabId } = useStore(useShallow((s) => ({ openTabs: s.openTabs, activeTabId: s.activeTabId, addTab: s.addTab, removeTab: s.removeTab, setActiveTabId: s.setActiveTabId })));
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
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-sm rounded-lg transition-all duration-200" onClick={handleNewChat}>
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
              "group relative flex max-w-[11.25rem] shrink-0 cursor-pointer items-center gap-1 rounded-full px-4 py-1.5 text-sm transition-all duration-300",
              isActive
                ? "text-foreground"
                : "text-muted-foreground/70 hover:text-foreground hover:bg-[var(--button-ghost-hover)]",
            )}
            onClick={() => handleTabClick(tab.id, tab.conversationId)}
          >
            {isActive && (
              <>
                <div className="absolute -inset-[1px] rounded-full brand-chip animate-[luminance-pulse_2.4s_ease-in-out_infinite]" />
                <div className="absolute -inset-[4px] rounded-full blur-lg animate-[luminance-pulse_3.2s_ease-in-out_infinite]" style={{ background: "color-mix(in srgb, var(--theme-accent) 24%, transparent)" }} />
                <div className="absolute inset-[1px] rounded-full border" style={{ background: "var(--tab-active-bg)", borderColor: "var(--tab-active-border)", boxShadow: "var(--tab-active-shadow)" }} />
              </>
            )}

            <span className="relative z-10 truncate flex-1">{tab.title}</span>
            <button
              className="relative z-10 ml-1 rounded-full p-0.5 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-[var(--button-ghost-hover)]"
              onClick={(e) => handleTabClose(e, tab.id)}
              aria-label={`Close tab: ${tab.title}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      <Button variant="ghost" size="sm" className="relative z-10 h-8 w-8 shrink-0 rounded-full p-0 transition-all duration-200" onClick={handleNewChat} aria-label="New chat">
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
