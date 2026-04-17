"use client";

import {
  Children,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Command,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  MessageSquarePlus,
  MoreHorizontal,
  PanelLeft,
  PanelLeftClose,
  Pin,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NavConfigPanel, loadNavConfig, type NavGroupConfig } from "@/components/layout/nav-config-panel";
import { useStore } from "@/lib/store";
import { createConversation, createFolder, deleteConversation, deleteFolder, exportConversation, getAgents, getChannels, getConversations, getFolders, moveConversationToFolder, toggleConversationPin } from "@/lib/api";
import { openCommandPalette, openQuickSettings } from "@/lib/frontend/ui-events";
import { cn, getAvatarColor, getInitials, timeAgo } from "@/lib/utils";
import type {
  AgentChannelWithAgent,
  AgentWithStatus,
  ConversationFolder,
  ConversationWithDetails,
} from "@/lib/types";
import {
  buildGatewayGroups,
  buildShellChannelIndex,
  getConversationChannelId,
  getGatewayMeta,
  usePinnedChannelIds,
  type GatewayGroup,
  type ShellChannelDescriptor,
} from "./shell-navigation-model";
import {
  DEFAULT_CONTROL_GROUP_CONFIG,
  SIDEBAR_CONTROL_GROUPS,
  SIDEBAR_CONTROL_ITEM_MAP,
  isSidebarRouteActive,
} from "./sidebar-control-data";
import { toast } from "sonner";

type SidebarTab = "channels" | "control";

const SIDEBAR_TAB_STORAGE_KEY = "agenthub-sidebar-tab-v1";

function sortConversationsByRecent(conversations: ConversationWithDetails[]) {
  return [...conversations].sort(
    (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  );
}

function rowSurfaceClass(navStyle: "pills" | "list", isActive: boolean) {
  const shared = "relative isolate flex min-w-0 flex-1 items-center gap-3 overflow-visible text-left transition-all duration-200";
  const spacing = "px-[var(--rail-row-pad-x,0.95rem)] py-[var(--rail-row-pad-y,0.82rem)]";

  if (navStyle === "list") {
    return cn(
      shared,
      spacing,
      "rounded-[var(--workspace-radius-md)] border border-transparent bg-transparent",
      isActive
        ? "bg-foreground/[0.07] text-foreground"
        : "text-foreground/92 hover:bg-foreground/[0.04]",
    );
  }

  return cn(
    shared,
    spacing,
    "rounded-[var(--workspace-radius-lg)] border",
    isActive
      ? "border-foreground/[0.12] bg-foreground/[0.04]"
      : "border-foreground/[0.06] hover:border-foreground/[0.14] hover:bg-foreground/[0.03]",
  );
}

function iconButtonClass(active = false) {
  return cn(
    "flex h-10 w-10 items-center justify-center rounded-[var(--workspace-radius-md)] border transition-colors",
    active
      ? "border-foreground/[0.12] bg-foreground/[0.05] text-foreground"
      : "border-foreground/[0.06] bg-transparent text-muted-foreground hover:border-foreground/[0.12] hover:bg-foreground/[0.04] hover:text-foreground",
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    agents,
    conversations,
    setAgents,
    setConversations,
    sidebarOpen,
    setSidebarOpen,
    uiPrefs,
    setUiPref,
  } = useStore(
    useShallow((state) => ({
      agents: state.agents,
      conversations: state.conversations,
      setAgents: state.setAgents,
      setConversations: state.setConversations,
      sidebarOpen: state.sidebarOpen,
      setSidebarOpen: state.setSidebarOpen,
      uiPrefs: state.uiPrefs,
      setUiPref: state.setUiPref,
    })),
  );
  const [railTab, setRailTab] = useState<SidebarTab>(() => {
    if (typeof window === "undefined") {
      return "channels";
    }

    try {
      const storedTab = window.localStorage.getItem(SIDEBAR_TAB_STORAGE_KEY);
      return storedTab === "control" ? "control" : "channels";
    } catch {
      return "channels";
    }
  });
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [channels, setChannels] = useState<AgentChannelWithAgent[]>([]);
  const [folders, setFolders] = useState<ConversationFolder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [navConfigOpen, setNavConfigOpen] = useState(false);
  const [navConfig, setNavConfig] = useState<NavGroupConfig[]>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_CONTROL_GROUP_CONFIG;
    }
    return loadNavConfig(DEFAULT_CONTROL_GROUP_CONFIG);
  });
  const { pinnedChannelIds, togglePinnedChannel, isChannelPinned } = usePinnedChannelIds();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(SIDEBAR_TAB_STORAGE_KEY, railTab);
  }, [railTab]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [nextConversations, nextAgents, nextChannels, nextFolders] = await Promise.all([
          getConversations(),
          getAgents(),
          getChannels(),
          getFolders(),
        ]);
        if (cancelled) {
          return;
        }
        setConversations(nextConversations);
        setAgents(nextAgents);
        setChannels(nextChannels);
        setFolders(nextFolders);
        setExpandedFolders((previous) => {
          const next = { ...previous };
          for (const folder of nextFolders) {
            if (!(folder.id in next)) {
              next[folder.id] = true;
            }
          }
          return next;
        });
      } catch (error) {
        console.error("Failed to load sidebar data:", error);
        toast.error("Failed to load sidebar");
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [setAgents, setConversations]);

  const collapsed = uiPrefs.sidebarCollapsed;
  const gatewayGroups = useMemo(() => buildGatewayGroups(agents), [agents]);
  const channelIndex = useMemo(
    () => buildShellChannelIndex(agents, conversations, channels),
    [agents, channels, conversations],
  );
  const sortedConversations = useMemo(() => sortConversationsByRecent(conversations), [conversations]);
  const activeConversation = useMemo(
    () => conversations.find((conversation) => pathname === `/chat/${conversation.id}`) ?? null,
    [conversations, pathname],
  );
  const activeChannelId = getConversationChannelId(activeConversation);
  const activeGateway =
    pathname === "/agents"
      ? (typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("gateway")
          : selectedGateway)
      : null;

  const ownedChannelGroups = useMemo(() => {
    const grouped = new Map<string, ShellChannelDescriptor[]>();

    for (const channel of channelIndex.values()) {
      if (channel.kind !== "channel") {
        continue;
      }
      const gateway = channel.gateway ?? "default";
      const current = grouped.get(gateway) ?? [];
      current.push(channel);
      grouped.set(gateway, current);
    }

    return Array.from(grouped.entries())
      .map(([gateway, items]) => ({
        gateway,
        label: getGatewayMeta(gateway).label,
        channels: [...items].sort((left, right) => left.title.localeCompare(right.title)),
        onlineCount: gatewayGroups.find((group) => group.gateway === gateway)?.onlineCount ?? 0,
        totalAgents: gatewayGroups.find((group) => group.gateway === gateway)?.agents.length ?? 0,
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [channelIndex, gatewayGroups]);

  const pinnedChannels = useMemo(
    () =>
      pinnedChannelIds
        .map((channelId) => channelIndex.get(channelId))
        .filter((channel): channel is ShellChannelDescriptor => Boolean(channel)),
    [channelIndex, pinnedChannelIds],
  );

  const pinnedChats = useMemo(
    () => sortedConversations.filter((conversation) => conversation.is_pinned),
    [sortedConversations],
  );

  const folderConversationMap = useMemo(() => {
    const map = new Map<string, ConversationWithDetails[]>();
    for (const folder of folders) {
      map.set(folder.id, []);
    }
    for (const conversation of sortedConversations) {
      if (!conversation.folder_id) {
        continue;
      }
      const current = map.get(conversation.folder_id) ?? [];
      current.push(conversation);
      map.set(conversation.folder_id, current);
    }
    return map;
  }, [folders, sortedConversations]);

  const recentChats = useMemo(
    () =>
      sortedConversations.filter(
        (conversation) => !conversation.is_pinned && !conversation.folder_id,
      ),
    [sortedConversations],
  );

  const visibleControlGroups = useMemo(() => {
    const groups = navConfig
      .map((group) => {
        const meta = SIDEBAR_CONTROL_GROUPS.find((item) => item.id === group.id);
        const items = group.items
          .filter((item) => item.visible)
          .map((item) => SIDEBAR_CONTROL_ITEM_MAP.get(item.href))
          .filter(Boolean);

        if (items.length === 0) {
          return null;
        }

        return {
          id: group.id,
          label: group.label,
          description: meta?.description ?? "Workspace tools",
          accent: meta?.accent ?? "var(--theme-accent)",
          icon: meta?.icon ?? LayoutGrid,
          items,
        };
      })
      .filter(
        (
          group,
        ): group is {
          id: string;
          label: string;
          description: string;
          accent: string;
          icon: typeof LayoutGrid;
          items: Array<{
            href: string;
            label: string;
            description: string;
            icon: typeof LayoutGrid;
          } | undefined>;
        } => Boolean(group),
      );

    return groups;
  }, [navConfig]);

  async function handleOpenChannel(channel: ShellChannelDescriptor) {
    setSidebarOpen(false);
    setNewChatOpen(false);

    if (channel.kind === "gateway") {
      setSelectedGateway(channel.gateway ?? null);
    }

    if (channel.href) {
      router.push(channel.href);
      return;
    }

    if (channel.conversationId) {
      router.push(`/chat/${channel.conversationId}`);
      return;
    }

    if (channel.channelId) {
      try {
        const { id } = await createConversation({
          channel_id: channel.channelId,
          name: channel.title,
        });
        router.push(`/chat/${id}`);
      } catch {
        toast.error("Failed to open channel");
      }
      return;
    }

    if (channel.agentId) {
      try {
        const { id } = await createConversation({ agent_id: channel.agentId });
        router.push(`/chat/${id}`);
      } catch {
        toast.error("Failed to open channel");
      }
    }
  }

  const collapsedShortcuts = [
    { id: "home", label: "Mission control", icon: Bot, action: () => router.push("/") },
    { id: "search", label: "Search", icon: Search, action: openCommandPalette },
    { id: "agents", label: "Agents", icon: LayoutGrid, action: () => router.push("/agents") },
    { id: "settings", label: "Settings", icon: Settings2, action: () => router.push("/settings") },
    ...pinnedChannels.slice(0, 2).map((channel) => ({
      id: channel.id,
      label: channel.title,
      icon: channel.icon,
      action: () => void handleOpenChannel(channel),
    })),
  ];

  async function handleNewChat(agentId: string) {
    try {
      const { id } = await createConversation({ agent_id: agentId });
      setNewChatOpen(false);
      setSidebarOpen(false);
      router.push(`/chat/${id}`);
    } catch {
      toast.error("Failed to create conversation");
    }
  }

  async function handleToggleChatPin(conversationId: string) {
    const currentConversation = conversations.find((conversation) => conversation.id === conversationId);
    if (!currentConversation) {
      return;
    }

    const nextPinned = !currentConversation.is_pinned;
    setConversations(
      conversations.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, is_pinned: nextPinned }
          : conversation,
      ),
    );

    try {
      await toggleConversationPin(conversationId);
    } catch {
      setConversations(
        conversations.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, is_pinned: currentConversation.is_pinned }
            : conversation,
        ),
      );
      toast.error("Failed to update chat pin");
    }
  }

  async function handleDeleteConversation(conversationId: string) {
    const previousConversations = conversations;
    setConversations(conversations.filter((conversation) => conversation.id !== conversationId));
    if (pathname === `/chat/${conversationId}`) {
      router.push("/");
    }

    try {
      await deleteConversation(conversationId);
      toast.success("Chat deleted");
    } catch {
      setConversations(previousConversations);
      toast.error("Failed to delete chat");
    }
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) {
      return;
    }

    try {
      const created = await createFolder(name, undefined, "#6c7dff");
      const nextFolders = await getFolders();
      setFolders(nextFolders);
      setExpandedFolders((previous) => ({ ...previous, [created.id]: true }));
      setNewFolderName("");
      setCreateFolderOpen(false);
      toast.success("Folder created");
    } catch {
      toast.error("Failed to create folder");
    }
  }

  async function handleDeleteFolder(folderId: string) {
    try {
      await deleteFolder(folderId);
      setFolders((previous) => previous.filter((folder) => folder.id !== folderId));
      setConversations(
        conversations.map((conversation) =>
          conversation.folder_id === folderId
            ? { ...conversation, folder_id: null }
            : conversation,
        ),
      );
      toast.success("Folder deleted");
    } catch {
      toast.error("Failed to delete folder");
    }
  }

  async function handleAssignConversationFolder(conversationId: string, folderId: string | null) {
    const currentConversation = conversations.find((conversation) => conversation.id === conversationId);
    if (!currentConversation) {
      return;
    }

    setConversations(
      conversations.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, folder_id: folderId }
          : conversation,
      ),
    );

    try {
      await moveConversationToFolder(conversationId, folderId);
      toast.success(folderId ? "Moved to folder" : "Removed from folder");
    } catch {
      setConversations(
        conversations.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, folder_id: currentConversation.folder_id }
            : conversation,
        ),
      );
      toast.error("Failed to move conversation");
    }
  }

  async function handleExportConversation(conversationId: string, conversationName: string) {
    try {
      const payload = await exportConversation(conversationId, "markdown");
      const blob = new Blob([payload], { type: "text/markdown;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${(conversationName || "conversation").replace(/\s+/g, "-").toLowerCase()}.md`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      toast.success("Conversation exported");
    } catch {
      toast.error("Failed to export conversation");
    }
  }

  function handleCollapseChange() {
    setUiPref("sidebarCollapsed", !collapsed);
  }

  function handleToggleFolder(folderId: string) {
    setExpandedFolders((previous) => ({ ...previous, [folderId]: !previous[folderId] }));
  }

  return (
    <TooltipProvider delay={250}>
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-3 top-3 z-50 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
      </Button>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/45 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full flex-col border-r border-foreground/[0.05] bg-sidebar/95 backdrop-blur-xl transition-transform duration-300 md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          width: collapsed
            ? "var(--sidebar-collapsed-width, 86px)"
            : "min(92vw, var(--sidebar-width, 340px))",
        }}
        aria-label="Workspace navigation"
      >
        <div
          className="border-b border-foreground/[0.05]"
          style={{ padding: "var(--shell-pad, 1rem)" }}
        >
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setSidebarOpen(false)}>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-[var(--panel-shadow)]"
                style={{
                  background: "linear-gradient(135deg, var(--theme-accent) 0%, var(--theme-accent-alt) 100%)",
                  boxShadow: "0 12px 30px -20px var(--theme-accent-shadow-strong)",
                }}
              >
                <Bot className="h-5 w-5" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[var(--tracking-label)] text-foreground/70">
                    AgentHub
                  </p>
                  <p className="truncate text-lg font-semibold tracking-tight text-foreground">
                    {railTab === "channels" ? "Channel rail" : "Control rail"}
                  </p>
                </div>
              )}
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className={cn("ml-auto h-9 w-9 rounded-xl", collapsed && "ml-0")}
              onClick={handleCollapseChange}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeft className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
            </Button>
          </div>

          {!collapsed && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <SidebarTabButton
                  active={railTab === "channels"}
                  icon={Bot}
                  label="Channels"
                  onClick={() => setRailTab("channels")}
                />
                <SidebarTabButton
                  active={railTab === "control"}
                  icon={LayoutGrid}
                  label="Control"
                  onClick={() => setRailTab("control")}
                />
              </div>

              {railTab === "channels" ? (
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => setNewChatOpen((previous) => !previous)}
                    className="group relative isolate flex w-full items-center justify-between overflow-visible rounded-[var(--workspace-radius-lg)] border border-foreground/[0.08] px-4 py-3 text-left transition-colors hover:border-foreground/[0.14] hover:bg-foreground/[0.03]"
                  >
                    <div className="pointer-events-none absolute inset-x-6 -inset-y-1 -z-10 rounded-full opacity-0 blur-xl transition-opacity duration-200 group-hover:opacity-100" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--accent-blue) 26%, transparent) 0%, transparent 72%)" }} />
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/12 text-blue-100">
                        <MessageSquarePlus className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Start a new chat</p>
                        <p className="text-xs text-muted-foreground">Launch directly into an agent channel</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>

                  {newChatOpen && (
                    <div className="overflow-hidden rounded-[var(--workspace-radius-md)] border border-foreground/[0.08] bg-foreground/[0.02]">
                      <div className="border-b border-foreground/[0.06] px-4 py-3 text-xs uppercase tracking-[var(--tracking-label)] text-muted-foreground">
                        Available agents
                      </div>
                      <div className="max-h-64 overflow-y-auto py-1">
                        {agents.filter((agent) => agent.is_active).length === 0 ? (
                          <p className="px-4 py-4 text-sm text-muted-foreground">
                            No active agents yet
                          </p>
                        ) : (
                          agents
                            .filter((agent) => agent.is_active)
                            .map((agent) => (
                              <button
                                key={agent.id}
                                type="button"
                                onClick={() => void handleNewChat(agent.id)}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.04]"
                              >
                                <div
                                  className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white",
                                    getAvatarColor(agent.id),
                                  )}
                                >
                                  {getInitials(agent.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-foreground">{agent.name}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {agent.gateway_type}
                                  </p>
                                </div>
                                <Plus className="h-4 w-4 text-muted-foreground" />
                              </button>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-[var(--workspace-radius-lg)] border border-foreground/[0.08] bg-foreground/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--theme-accent-softer)] text-[var(--theme-accent-text)]">
                      <Sparkles className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Full platform access</p>
                      <p className="text-xs text-muted-foreground">Jump to every surface the app exposes.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <SidebarActionButton icon={Search} label="Search" onClick={openCommandPalette} />
                    <SidebarActionButton icon={Settings2} label="Quick settings" onClick={openQuickSettings} />
                    <Link href="/settings" className={cn(iconButtonClass(), "col-span-2 h-10 w-full justify-start gap-2 px-3 text-sm font-medium")}>
                      <SlidersHorizontal className="h-4 w-4" />
                      Full settings
                    </Link>
                    <button
                      type="button"
                      className={cn(iconButtonClass(), "col-span-2 h-10 w-full justify-start gap-2 px-3 text-sm font-medium")}
                      onClick={() => setNavConfigOpen(true)}
                    >
                      <Command className="h-4 w-4" />
                      Configure control tab
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {collapsed ? (
          <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto px-2 py-3">
            {collapsedShortcuts.map((shortcut) => {
              const ShortcutIcon = shortcut.icon;
              return (
                <Tooltip key={shortcut.id}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => {
                          shortcut.action();
                          setSidebarOpen(false);
                        }}
                        className="group relative flex h-11 w-11 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                        aria-label={shortcut.label}
                      >
                        <div
                          className="pointer-events-none absolute inset-x-2 -inset-y-1 rounded-full opacity-0 blur-xl transition-opacity duration-200 group-hover:opacity-100"
                          style={{
                            background: "radial-gradient(circle, color-mix(in srgb, var(--theme-accent) 22%, transparent) 0%, transparent 72%)",
                          }}
                        />
                        <ShortcutIcon className="relative z-10 h-4.5 w-4.5" />
                      </button>
                    }
                  />
                  <TooltipContent side="right" sideOffset={10}>
                    {shortcut.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ) : (
          <div
            className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded"
            style={{ padding: "var(--shell-pad, 1rem)" }}
          >
            {railTab === "channels" ? (
              <>
                <SidebarSection
                  title="Pinned channels"
                  description="Local pins for agents, gateways, or shared channels."
                  emptyState="Pin a gateway or agent channel to keep it at the top."
                >
                  {pinnedChannels.map((channel) => (
                    <ChannelRow
                      key={channel.id}
                      channel={channel}
                      isActive={
                        channel.id === activeChannelId ||
                        (channel.kind === "gateway" && pathname === "/agents" && activeGateway === channel.gateway) ||
                        (channel.kind === "home" && pathname === "/")
                      }
                      isPinned
                      navStyle={uiPrefs.navStyle}
                      onOpen={handleOpenChannel}
                      onTogglePin={togglePinnedChannel}
                    />
                  ))}
                </SidebarSection>

                <SidebarSection
                  title="Gateways"
                  description="Grouped by adapter so you can jump into the right lane fast."
                >
                  <div className="grid gap-2">
                    {gatewayGroups.map((group) => (
                      <GatewayCard
                        key={group.gateway}
                        group={group}
                        isPinned={isChannelPinned(`gateway:${group.gateway}`)}
                        isActive={pathname === "/agents" && activeGateway === group.gateway}
                        navStyle={uiPrefs.navStyle}
                        onOpen={() => void handleOpenChannel(channelIndex.get(`gateway:${group.gateway}`)!)}
                        onTogglePin={() => togglePinnedChannel(`gateway:${group.gateway}`)}
                      />
                    ))}
                  </div>
                </SidebarSection>

                <SidebarSection
                  title="Agent channels"
                  description="Direct channels owned by each agent, grouped by gateway."
                >
                  <div className="space-y-3">
                    {ownedChannelGroups.length > 0
                      ? ownedChannelGroups.map((group) => (
                          <div key={group.gateway} className="space-y-1.5">
                            <div className="flex items-center justify-between px-1">
                              <p className="text-[var(--text-caption)] uppercase tracking-[var(--tracking-eyebrow)] text-muted-foreground">
                                {group.label}
                              </p>
                              <span className="text-[var(--text-caption)] text-muted-foreground">
                                {group.onlineCount}/{Math.max(group.totalAgents, 1)} online
                              </span>
                            </div>
                            {group.channels.map((channel) => (
                              <ChannelRow
                                key={channel.id}
                                channel={channel}
                                isActive={activeChannelId === channel.id}
                                isPinned={isChannelPinned(channel.id)}
                                navStyle={uiPrefs.navStyle}
                                onOpen={handleOpenChannel}
                                onTogglePin={togglePinnedChannel}
                              />
                            ))}
                          </div>
                        ))
                      : gatewayGroups.map((group) => (
                          <div key={group.gateway} className="space-y-1.5">
                            <div className="flex items-center justify-between px-1">
                              <p className="text-[var(--text-caption)] uppercase tracking-[var(--tracking-eyebrow)] text-muted-foreground">
                                {group.label}
                              </p>
                              <span className="text-[var(--text-caption)] text-muted-foreground">
                                {group.onlineCount}/{group.agents.length} online
                              </span>
                            </div>
                            {group.agents.map((agent) => {
                              const channel = channelIndex.get(`agent:${agent.id}`);
                              if (!channel) {
                                return null;
                              }

                              return (
                                <ChannelRow
                                  key={channel.id}
                                  channel={channel}
                                  agent={agent}
                                  isActive={activeChannelId === channel.id}
                                  isPinned={isChannelPinned(channel.id)}
                                  navStyle={uiPrefs.navStyle}
                                  onOpen={handleOpenChannel}
                                  onTogglePin={togglePinnedChannel}
                                />
                              );
                            })}
                          </div>
                        ))}
                  </div>
                </SidebarSection>

                <SidebarSection
                  title="Folders"
                  description="Organize threads into durable working buckets."
                  action={
                    <button
                      type="button"
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                      onClick={() => setCreateFolderOpen((previous) => !previous)}
                      aria-label="Create folder"
                    >
                      <FolderPlus className="h-4 w-4" />
                    </button>
                  }
                  emptyState="No folders yet. Create one to keep long-running work tidy."
                >
                  {createFolderOpen && (
                    <div className="rounded-[var(--workspace-radius-md)] border border-foreground/[0.08] bg-foreground/[0.02] p-3">
                      <label className="block text-[var(--text-caption)] font-semibold uppercase tracking-[var(--tracking-label)] text-muted-foreground">
                        Folder name
                      </label>
                      <input
                        value={newFolderName}
                        onChange={(event) => setNewFolderName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleCreateFolder();
                          }
                        }}
                        placeholder="Launches, reviews, experiments…"
                        className="mt-2 w-full rounded-xl border border-foreground/[0.08] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-foreground/[0.18]"
                      />
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setCreateFolderOpen(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => void handleCreateFolder()}>
                          Create
                        </Button>
                      </div>
                    </div>
                  )}

                  {folders.map((folder) => {
                    const folderConversations = folderConversationMap.get(folder.id) ?? [];
                    const expanded = expandedFolders[folder.id] ?? true;

                    return (
                      <div
                        key={folder.id}
                        className="overflow-hidden rounded-[var(--workspace-radius-md)] border border-foreground/[0.08] bg-foreground/[0.02]"
                      >
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleFolder(folder.id)}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <FolderOpen className="h-4 w-4 text-[var(--theme-accent)]" />
                            <span className="truncate text-sm font-medium text-foreground">{folder.name}</span>
                            <span className="rounded-full border border-foreground/[0.08] px-2 py-0.5 text-[var(--text-label)] text-muted-foreground">
                              {folderConversations.length}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteFolder(folder.id)}
                            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-red-400"
                            aria-label={`Delete ${folder.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {expanded && (
                          <div className="space-y-2 border-t border-foreground/[0.06] px-2 py-2">
                            {folderConversations.length > 0 ? (
                              folderConversations.map((conversation) => (
                                <ConversationRow
                                  key={conversation.id}
                                  conversation={conversation}
                                  isActive={pathname === `/chat/${conversation.id}`}
                                  navStyle={uiPrefs.navStyle}
                                  folders={folders}
                                  onOpen={() => {
                                    router.push(`/chat/${conversation.id}`);
                                    setSidebarOpen(false);
                                  }}
                                  onTogglePin={handleToggleChatPin}
                                  onDelete={handleDeleteConversation}
                                  onAssignFolder={handleAssignConversationFolder}
                                  onExport={handleExportConversation}
                                />
                              ))
                            ) : (
                              <div className="rounded-[var(--workspace-radius-sm)] border border-dashed border-foreground/[0.08] px-3 py-3 text-sm text-muted-foreground">
                                No chats in this folder yet.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </SidebarSection>

                <SidebarSection
                  title="Pinned chats"
                  description="Server-backed chat pins stay distinct from channel pins."
                  emptyState="No pinned chats yet."
                >
                  {pinnedChats.map((conversation) => (
                    <ConversationRow
                      key={conversation.id}
                      conversation={conversation}
                      isActive={pathname === `/chat/${conversation.id}`}
                      navStyle={uiPrefs.navStyle}
                      folders={folders}
                      onOpen={() => {
                        router.push(`/chat/${conversation.id}`);
                        setSidebarOpen(false);
                      }}
                      onTogglePin={handleToggleChatPin}
                      onDelete={handleDeleteConversation}
                      onAssignFolder={handleAssignConversationFolder}
                      onExport={handleExportConversation}
                    />
                  ))}
                </SidebarSection>

                <SidebarSection
                  title="Recent chats"
                  description="The latest unfoldered threads that are still moving."
                  emptyState="No chats yet. Start a new one from the top of the rail."
                >
                  {recentChats.map((conversation) => (
                    <ConversationRow
                      key={conversation.id}
                      conversation={conversation}
                      isActive={pathname === `/chat/${conversation.id}`}
                      navStyle={uiPrefs.navStyle}
                      folders={folders}
                      onOpen={() => {
                        router.push(`/chat/${conversation.id}`);
                        setSidebarOpen(false);
                      }}
                      onTogglePin={handleToggleChatPin}
                      onDelete={handleDeleteConversation}
                      onAssignFolder={handleAssignConversationFolder}
                      onExport={handleExportConversation}
                    />
                  ))}
                </SidebarSection>
              </>
            ) : (
              <>
                <SidebarSection
                  title="Workspace control"
                  description="Every mounted surface lives here, even when the channel rail stays focused."
                >
                  {visibleControlGroups.map((group) => (
                    <ControlGroupCard
                      key={group.id}
                      pathname={pathname}
                      group={group}
                    />
                  ))}
                </SidebarSection>

                <SidebarSection
                  title="Global tools"
                  description="Fast paths for discovery, shortcuts, and the full settings surface."
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      className="rounded-[var(--workspace-radius-md)] border border-foreground/[0.08] bg-foreground/[0.02] px-4 py-3 text-left transition-colors hover:bg-foreground/[0.04]"
                      onClick={openCommandPalette}
                    >
                      <p className="text-sm font-medium text-foreground">Open search</p>
                      <p className="mt-1 text-xs text-muted-foreground">Command palette, route search, and quick jumps.</p>
                    </button>
                    <button
                      type="button"
                      className="rounded-[var(--workspace-radius-md)] border border-foreground/[0.08] bg-foreground/[0.02] px-4 py-3 text-left transition-colors hover:bg-foreground/[0.04]"
                      onClick={openQuickSettings}
                    >
                      <p className="text-sm font-medium text-foreground">Quick settings</p>
                      <p className="mt-1 text-xs text-muted-foreground">Tweak visuals without leaving your flow.</p>
                    </button>
                    <Link
                      href="/settings"
                      className="rounded-[var(--workspace-radius-md)] border border-foreground/[0.08] bg-foreground/[0.02] px-4 py-3 transition-colors hover:bg-foreground/[0.04]"
                    >
                      <p className="text-sm font-medium text-foreground">Full settings</p>
                      <p className="mt-1 text-xs text-muted-foreground">Canonical workspace settings and previews.</p>
                    </Link>
                    <button
                      type="button"
                      className="rounded-[var(--workspace-radius-md)] border border-foreground/[0.08] bg-foreground/[0.02] px-4 py-3 text-left transition-colors hover:bg-foreground/[0.04]"
                      onClick={() => setNavConfigOpen(true)}
                    >
                      <p className="text-sm font-medium text-foreground">Customize control</p>
                      <p className="mt-1 text-xs text-muted-foreground">Show, hide, and regroup routes in this tab.</p>
                    </button>
                  </div>
                </SidebarSection>
              </>
            )}
          </div>
        )}
      </aside>

      <NavConfigPanel
        open={navConfigOpen}
        onClose={() => setNavConfigOpen(false)}
        groups={navConfig}
        onSave={setNavConfig}
      />
    </TooltipProvider>
  );
}

function SidebarTabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Bot;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center gap-2 rounded-[var(--workspace-radius-md)] border px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "border-[var(--theme-accent-border)] bg-[var(--theme-accent-softer)] text-[var(--theme-accent-text)]"
          : "border-foreground/[0.08] text-muted-foreground hover:border-foreground/[0.14] hover:bg-foreground/[0.03] hover:text-foreground",
      )}
      aria-pressed={active}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function SidebarActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Search;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(iconButtonClass(), "h-10 w-full justify-start gap-2 px-3 text-sm font-medium")}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function SidebarSection({
  title,
  description,
  action,
  emptyState,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  emptyState?: string;
  children: ReactNode;
}) {
  const childCount = Children.toArray(children).filter(Boolean).length;

  return (
    <section className="mb-[var(--shell-section-gap,1.4rem)]">
      <div className="mb-3 flex items-start justify-between gap-3 px-1">
        <div>
          <p className="text-[var(--text-caption)] uppercase tracking-[var(--tracking-eyebrow)] text-muted-foreground">
            {title}
          </p>
          <p className="mt-1 hidden text-xs text-muted-foreground xl:block">{description}</p>
        </div>
        {action}
      </div>
      <div className="space-y-2">
        {childCount > 0 ? (
          children
        ) : emptyState ? (
          <div className="rounded-[var(--workspace-radius-md)] border border-dashed border-foreground/[0.06] bg-foreground/[0.015] px-3 py-2.5 text-xs text-muted-foreground">
            {emptyState}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function GatewayCard({
  group,
  isPinned,
  isActive,
  navStyle,
  onOpen,
  onTogglePin,
}: {
  group: GatewayGroup;
  isPinned: boolean;
  isActive: boolean;
  navStyle: "pills" | "list";
  onOpen: () => void;
  onTogglePin: () => void;
}) {
  const GatewayIcon = group.meta.icon;

  return (
    <div className="group flex items-stretch gap-2">
      <button
        type="button"
        onClick={onOpen}
        className={rowSurfaceClass(navStyle, isActive)}
        style={{ "--rail-accent": group.meta.accent } as CSSProperties}
        aria-current={isActive ? "page" : undefined}
      >
        <GlowHalo accent={group.meta.accent} active={isActive} />
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", group.meta.iconClassName)}>
          <GatewayIcon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{group.label}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {group.onlineCount} online · {group.agents.length} agents
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={onTogglePin}
        className={iconButtonClass(isPinned)}
        aria-label={isPinned ? "Unpin gateway" : "Pin gateway"}
        aria-pressed={isPinned}
      >
        <Pin className="h-4 w-4" />
      </button>
    </div>
  );
}

function ChannelRow({
  channel,
  agent,
  isActive,
  isPinned,
  navStyle,
  onOpen,
  onTogglePin,
}: {
  channel: ShellChannelDescriptor;
  agent?: AgentWithStatus;
  isActive: boolean;
  isPinned: boolean;
  navStyle: "pills" | "list";
  onOpen: (channel: ShellChannelDescriptor) => void;
  onTogglePin: (channelId: string) => void;
}) {
  const ChannelIcon = channel.icon;

  return (
    <div className="group flex items-stretch gap-2">
      <button
        type="button"
        onClick={() => void onOpen(channel)}
        className={rowSurfaceClass(navStyle, isActive)}
        style={{ "--rail-accent": channel.accent } as CSSProperties}
        aria-current={isActive ? "page" : undefined}
      >
        <GlowHalo accent={channel.accent} active={isActive} />
        <div className="relative shrink-0">
          {agent ? (
            <>
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-white",
                  getAvatarColor(agent.id),
                )}
              >
                {getInitials(agent.name)}
              </div>
              <span
                className={cn(
                  "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-sidebar",
                  agent.status === "online" && "bg-emerald-500",
                  agent.status === "busy" && "bg-amber-500",
                  agent.status === "error" && "bg-rose-500",
                  agent.status === "offline" && "bg-slate-500",
                )}
              />
            </>
          ) : (
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", channel.iconClassName)}>
              <ChannelIcon className="h-4.5 w-4.5" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{channel.title}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">{channel.subtitle}</p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onTogglePin(channel.id)}
        className={iconButtonClass(isPinned)}
        aria-label={isPinned ? "Unpin channel" : "Pin channel"}
        aria-pressed={isPinned}
      >
        <Pin className="h-4 w-4" />
      </button>
    </div>
  );
}

function ConversationRow({
  conversation,
  isActive,
  navStyle,
  folders,
  onOpen,
  onTogglePin,
  onDelete,
  onAssignFolder,
  onExport,
}: {
  conversation: ConversationWithDetails;
  isActive: boolean;
  navStyle: "pills" | "list";
  folders: ConversationFolder[];
  onOpen: () => void;
  onTogglePin: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
  onAssignFolder: (conversationId: string, folderId: string | null) => void;
  onExport: (conversationId: string, conversationName: string) => void;
}) {
  const primaryAgent = conversation.agents[0];
  const accent = primaryAgent ? "var(--accent-blue)" : "var(--accent-violet)";
  const activeFolder = folders.find((folder) => folder.id === conversation.folder_id);

  return (
    <div className="group flex items-stretch gap-2">
      <button
        type="button"
        onClick={onOpen}
        className={rowSurfaceClass(navStyle, isActive)}
        style={{ "--rail-accent": accent } as CSSProperties}
        aria-current={isActive ? "page" : undefined}
      >
        <GlowHalo accent={accent} active={isActive} />
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
            primaryAgent ? getAvatarColor(primaryAgent.id) : "bg-violet-600",
          )}
        >
          {primaryAgent ? getInitials(primaryAgent.name) : "SQ"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {conversation.name || "Untitled chat"}
            </span>
            {activeFolder && (
              <span className="rounded-full border border-foreground/[0.08] px-2 py-0.5 text-[var(--text-label)] text-muted-foreground">
                {activeFolder.name}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {primaryAgent?.name ?? `${conversation.agents.length} agents`} · {timeAgo(conversation.updated_at)}
          </p>
          {conversation.last_message?.content && (
            <p className="mt-1 truncate text-xs text-muted-foreground/80">
              {conversation.last_message.content}
            </p>
          )}
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={iconButtonClass(false)}
              aria-label={`Conversation actions for ${conversation.name || "conversation"}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem onClick={() => onTogglePin(conversation.id)}>
            <Pin className="mr-2 h-4 w-4" />
            {conversation.is_pinned ? "Unpin chat" : "Pin chat"}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderOpen className="mr-2 h-4 w-4" />
              Move to folder
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onAssignFolder(conversation.id, null)}>
                No folder
              </DropdownMenuItem>
              {folders.map((folder) => (
                <DropdownMenuItem key={folder.id} onClick={() => onAssignFolder(conversation.id, folder.id)}>
                  {folder.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onClick={() => onExport(conversation.id, conversation.name || "conversation")}>
            <Sparkles className="mr-2 h-4 w-4" />
            Export markdown
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(conversation.id)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ControlGroupCard({
  pathname,
  group,
}: {
  pathname: string;
  group: {
    id: string;
    label: string;
    description: string;
    accent: string;
    icon: typeof LayoutGrid;
    items: Array<{
      href: string;
      label: string;
      description: string;
      icon: typeof LayoutGrid;
    } | undefined>;
  };
}) {
  const GroupIcon = group.icon;

  return (
    <div className="overflow-hidden rounded-[var(--workspace-radius-lg)] border border-foreground/[0.08] bg-foreground/[0.02]">
      <div className="flex items-start gap-3 border-b border-foreground/[0.06] px-4 py-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-2xl"
          style={{
            background: `color-mix(in srgb, ${group.accent} 16%, transparent)`,
            color: group.accent,
          }}
        >
          <GroupIcon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{group.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
        </div>
      </div>
      <div className="space-y-1 p-2">
        {group.items.map((item) => {
          if (!item) {
            return null;
          }
          const ItemIcon = item.icon;
          const active = isSidebarRouteActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-[var(--workspace-radius-md)] px-3 py-2.5 transition-colors",
                active
                  ? "bg-foreground/[0.06] text-foreground"
                  : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
              )}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{
                  background: active
                    ? `color-mix(in srgb, ${group.accent} 18%, transparent)`
                    : "color-mix(in srgb, var(--foreground) 3%, transparent)",
                  color: active ? group.accent : "var(--muted-foreground)",
                }}
              >
                <ItemIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="truncate text-xs text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 opacity-40 transition-opacity group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function GlowHalo({ accent, active }: { accent: string; active: boolean }) {
  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 rounded-[inherit] border border-transparent transition-opacity duration-200",
          active ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${accent} ${active ? "16%" : "10%"}, transparent), transparent 75%)`,
          boxShadow: active
            ? `0 0 0 1px color-mix(in srgb, ${accent} 26%, transparent), 0 18px 38px -28px color-mix(in srgb, ${accent} 48%, transparent)`
            : `0 16px 34px -30px color-mix(in srgb, ${accent} 40%, transparent)`,
        }}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-6 -inset-y-1 -z-20 rounded-full blur-xl transition-opacity duration-200",
          active ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
        style={{
          background: `radial-gradient(circle, color-mix(in srgb, ${accent} 22%, transparent) 0%, transparent 72%)`,
        }}
      />
    </>
  );
}
