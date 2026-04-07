"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  MessageSquare,
  Users,
  Settings,
  Activity,
  Plus,
  ChevronRight,
  ChevronDown,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  UserCircle,
  FileText,
  GitBranch,
  BarChart3,
  Search,
  Webhook,
  Key,
  Swords,
  Brain,
  Clock,
  FolderOpen,
  FolderClosed,
  Scan,
  UserCircle2,
  Network,
  Plug,
  Lightbulb,
  Globe,
  Lock,
  Layers,
  Shield,
  FlaskConical,
  BookOpen,
  Layout,
  Hammer,
  Zap,
  FolderPlus,
  MessageSquarePlus,
  X,
  SlidersHorizontal,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";
import {
  getConversations,
  deleteConversation,
  getAgents,
  getFolders,
  createFolder,
  deleteFolder,
  createConversation,
} from "@/lib/api";
import { cn, getInitials, getAvatarColor, timeAgo } from "@/lib/utils";
import { NavConfigPanel, loadNavConfig, saveNavConfig } from "./nav-config-panel";
import type { NavGroupConfig } from "./nav-config-panel";
import type { ConversationWithDetails, ConversationFolder } from "@/lib/types";
import { toast } from "sonner";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavCategory {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  neon: string; // neon color class for hover glow
  activeColor: string; // color for active state text
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    label: "Core",
    icon: Layout,
    neon: "neon-blue",
    activeColor: "text-neon-blue",
    items: [
      { href: "/", label: "Dashboard", icon: Activity },
      { href: "/search", label: "Search", icon: Search },
      { href: "/agents", label: "Agents", icon: Bot },
      { href: "/groups", label: "Group Chats", icon: Users },
    ],
  },
  {
    label: "Build",
    icon: Hammer,
    neon: "neon-violet",
    activeColor: "text-neon-violet",
    items: [
      { href: "/personas", label: "Personas", icon: UserCircle2 },
      { href: "/templates", label: "Templates", icon: FileText },
      { href: "/workflows", label: "Workflows", icon: GitBranch },
      { href: "/playground", label: "Playground", icon: FlaskConical },
    ],
  },
  {
    label: "Intelligence",
    icon: Brain,
    neon: "neon-cyan",
    activeColor: "text-neon-cyan",
    items: [
      { href: "/arena", label: "Arena", icon: Swords },
      { href: "/memory", label: "Memory", icon: Brain },
      { href: "/knowledge", label: "Knowledge", icon: BookOpen },
      { href: "/insights", label: "Insights", icon: Lightbulb },
    ],
  },
  {
    label: "Automation",
    icon: Zap,
    neon: "neon-amber",
    activeColor: "text-neon-amber",
    items: [
      { href: "/webhooks", label: "Webhooks", icon: Webhook },
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/scheduled-tasks", label: "Tasks", icon: Clock },
    ],
  },
  {
    label: "Operations",
    icon: Activity,
    neon: "neon-emerald",
    activeColor: "text-neon-emerald",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/fleet", label: "Fleet", icon: Network },
      { href: "/traces", label: "Traces", icon: Scan },
      { href: "/monitoring", label: "Monitoring", icon: Activity },
    ],
  },
  {
    label: "Security",
    icon: Shield,
    neon: "neon-rose",
    activeColor: "text-neon-rose",
    items: [
      { href: "/guardrails", label: "Guardrails", icon: Shield },
      { href: "/policies", label: "Policies", icon: Lock },
      { href: "/a2a", label: "A2A", icon: Globe },
      { href: "/api-keys", label: "API Keys", icon: Key },
    ],
  },
  {
    label: "System",
    icon: Settings,
    neon: "neon-blue",
    activeColor: "text-neon-blue",
    items: [
      { href: "/admin", label: "Admin", icon: Layers },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_CATEGORIES.flatMap((c) => c.items);

// Glow colors per category for neon lighting
const CATEGORY_GLOW: Record<string, string> = {
  Core: "#3b82f6",        // blue
  Build: "#8b5cf6",       // violet
  Intelligence: "#06b6d4", // cyan
  Automation: "#f59e0b",  // amber
  Operations: "#10b981",  // emerald
  Security: "#fb565b",    // rose
  System: "#3b82f6",      // blue
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { agents, conversations, setConversations, sidebarOpen, setSidebarOpen, setAgents, uiPrefs } =
    useStore();
  const [hoveredConv, setHoveredConv] = useState<string | null>(null);
  const [folders, setFolders] = useState<ConversationFolder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    () => {
      const init: Record<string, boolean> = {};
      for (const cat of NAV_CATEGORIES) init[cat.label] = true;
      return init;
    },
  );

  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Resizable sidebar width (px)
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  // Resizable nav/chats split (pixels from top of content zone)
  const [navHeight, setNavHeight] = useState<number | null>(null);
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const contentZoneRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Sidebar width drag handler
  useEffect(() => {
    if (!isResizingSidebar) return;
    const handleMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      const newWidth = Math.max(200, Math.min(450, e.clientX - rect.left));
      setSidebarWidth(newWidth);
    };
    const handleUp = () => setIsResizingSidebar(false);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingSidebar]);

  // Nav/chats split drag handler
  useEffect(() => {
    if (!isResizingSplit) return;
    const handleMove = (e: MouseEvent) => {
      const nav = navRef.current;
      if (!nav) return;
      const navTop = nav.getBoundingClientRect().top;
      const newHeight = Math.max(80, Math.min(600, e.clientY - navTop));
      setNavHeight(newHeight);
    };
    const handleUp = () => setIsResizingSplit(false);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingSplit]);

  useEffect(() => {
    setHydrated(true);
    loadData();
    try {
      const stored = localStorage.getItem("agenthub-ui-prefs-v2");
      if (stored) {
        const prefs = JSON.parse(stored);
        if (prefs.sidebarCollapsed) setCollapsed(true);
      }
    } catch {}
  }, []);

  async function loadData() {
    try {
      const [convs, agents, flds] = await Promise.all([
        getConversations(),
        getAgents(),
        getFolders(),
      ]);
      setConversations(convs);
      setAgents(agents);
      setFolders(flds);
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  }

  function handleDeleteConversation(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Optimistic removal with undo
    const removed = conversations.find((c) => c.id === id);
    setConversations(conversations.filter((c) => c.id !== id));
    if (pathname === `/chat/${id}`) router.push("/");

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        await deleteConversation(id);
      } catch {
        // Restore if API fails
        if (removed) setConversations([...conversations]);
        toast.error("Failed to delete conversation");
      }
    }, 5000);

    toast("Conversation deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          cancelled = true;
          clearTimeout(timer);
          if (removed) setConversations([...conversations]);
        },
      },
      duration: 5000,
    });
  }

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [editChatsMode, setEditChatsMode] = useState(false);

  // Configurable nav groups (persisted in localStorage)
  const [navGroups, setNavGroups] = useState<NavGroupConfig[]>(() => {
    const defaults: NavGroupConfig[] = NAV_CATEGORIES.map((cat) => ({
      id: cat.label.toLowerCase(),
      label: cat.label,
      items: cat.items.map((item) => ({ href: item.href, label: item.label, visible: true })),
      collapsed: false,
    }));
    return loadNavConfig(defaults);
  });

  async function handleNewFolder() {
    try {
      const name = `Folder ${folders.length + 1}`;
      const result = await createFolder(name);
      const newFolder: ConversationFolder = {
        id: result.id,
        name,
        parent_id: null,
        sort_order: folders.length,
        color: "#6366f1",
        icon: "folder",
        created_at: new Date().toISOString(),
      };
      setFolders((prev) => [...prev, newFolder]);
      setExpandedFolders((prev) => ({ ...prev, [result.id]: true }));
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  }

  async function handleDeleteFolder(folderId: string) {
    try {
      await deleteFolder(folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
    } catch {
      toast.error("Failed to delete folder");
    }
  }

  async function handleNewChat(agentId: string) {
    try {
      const { id } = await createConversation({ agent_id: agentId });
      setNewChatOpen(false);
      router.push(`/chat/${id}`);
    } catch {
      toast.error("Failed to create conversation");
    }
  }

  function toggleFolder(folderId: string) {
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  }

  function toggleCategory(label: string) {
    setExpandedCategories((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function handleCollapseChange() {
    const next = !collapsed;
    setCollapsed(next);
    useStore.getState().setUiPref("sidebarCollapsed", next);
  }

  const convsByFolder: Record<string, ConversationWithDetails[]> = {};
  const unfiledConvs: ConversationWithDetails[] = [];

  for (const conv of conversations) {
    const folderId = (conv as ConversationWithDetails & { folder_id?: string | null })
      .folder_id;
    if (folderId && folders.some((f) => f.id === folderId)) {
      if (!convsByFolder[folderId]) convsByFolder[folderId] = [];
      convsByFolder[folderId].push(conv);
    } else {
      unfiledConvs.push(conv);
    }
  }

  const hasFolders = folders.length > 0;
  const isPills = hydrated && uiPrefs.navStyle === "pills";

  return (
    <TooltipProvider delay={300}>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="h-5 w-5" />
        ) : (
          <PanelLeft className="h-5 w-5" />
        )}
      </Button>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full flex-col border-r border-white/[0.04] bg-sidebar/95 backdrop-blur-xl overflow-visible",
          "md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          !isResizingSidebar && "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        )}
        style={{ width: collapsed ? 52 : sidebarWidth }}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center border-b border-white/[0.04]",
            collapsed ? "justify-center px-2 py-3" : "px-4 py-3 gap-2",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 shadow-[0_0_12px_oklch(0.55_0.24_264_/0.2)]">
            <Bot className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <>
              <span className="text-lg font-semibold whitespace-nowrap bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">AgentHub</span>
            </>
          )}
        </div>

        {/* Content zone (nav + chats) - ref for split resize calculation */}
        <div ref={contentZoneRef} className="flex-1 flex flex-col min-h-0">

        {/* Navigation header with configure button */}
        {!collapsed && (
          <div className="flex items-center justify-end px-3 pt-2">
            <button
              onClick={() => setConfigOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.04] transition-all"
            >
              <SlidersHorizontal className="h-3 w-3" />
              Configure
            </button>
          </div>
        )}

        {/* Navigation (resizable height) */}
        <div
          ref={navRef}
          className="min-h-0 overflow-y-auto scrollbar-hidden px-1.5 py-1"
          style={{ height: collapsed ? "auto" : navHeight ? `${navHeight}px` : "55%", flexShrink: 0 }}
        >
          {collapsed ? (
            <div className="flex flex-col items-center gap-1">
              {ALL_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger
                      render={
                        <Link
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200",
                            isActive
                              ? "bg-oklch(0.55_0.24_264_/0.15) text-foreground"
                              : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
                          )}
                        >
                          {isActive && (
                            <div className="absolute inset-0 rounded-lg bg-oklch(0.55_0.24_264_/0.08) animate-[luminance-pulse_3s_ease-in-out_infinite]" />
                          )}
                          <item.icon className="relative h-4 w-4" />
                        </Link>
                      }
                    >
                      <item.icon className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ) : isPills ? (
            <div className="space-y-2">
              {NAV_CATEGORIES.map((category) => {
                const isOpen = expandedCategories[category.label] ?? true;
                const CategoryIcon = category.icon;
                const hasActiveChild = category.items.some(
                  (i) => pathname === i.href,
                );

                return (
                  <div key={category.label}>
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.label)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-wider transition-all duration-200",
                        hasActiveChild
                          ? "text-foreground/80"
                          : "text-muted-foreground/50 hover:text-muted-foreground/80",
                      )}
                    >
                      <CategoryIcon className="h-3 w-3 shrink-0" />
                      <span className="flex-1 text-left">{category.label}</span>
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition-transform duration-200",
                          !isOpen && "-rotate-90",
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300",
                        isOpen
                          ? "max-h-[500px] opacity-100"
                          : "max-h-0 opacity-0",
                      )}
                    >
                      <div className="flex flex-wrap gap-1 py-1">
                        {category.items.map((item) => {
                          const isActive = pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-300 border neon-interactive",
                                isActive
                                  ? cn("border-current", category.activeColor)
                                  : "border-transparent text-muted-foreground/70 hover:text-foreground",
                              )}
                              style={isActive ? {
                                boxShadow: `0 0 8px ${CATEGORY_GLOW[category.label]}, 0 0 24px ${CATEGORY_GLOW[category.label]}40`,
                              } : undefined}
                              onMouseEnter={(e) => {
                                if (!isActive) {
                                  const c = CATEGORY_GLOW[category.label];
                                  e.currentTarget.style.boxShadow = `0 0 10px ${c}, 0 0 30px ${c}60`;
                                  e.currentTarget.style.borderColor = `${c}80`;
                                  e.currentTarget.style.background = `${c}15`;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.boxShadow = "none";
                                  e.currentTarget.style.borderColor = "transparent";
                                  e.currentTarget.style.background = "transparent";
                                }
                              }}
                            >
                              <item.icon className="relative h-3.5 w-3.5 shrink-0" />
                              <span className="relative truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {NAV_CATEGORIES.map((category) => {
                const isOpen = expandedCategories[category.label] ?? true;
                const CategoryIcon = category.icon;
                const hasActiveChild = category.items.some(
                  (i) => pathname === i.href,
                );

                return (
                  <div key={category.label}>
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.label)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200",
                        hasActiveChild
                          ? "text-foreground/80"
                          : "text-muted-foreground/50 hover:text-muted-foreground/80",
                      )}
                    >
                      <CategoryIcon className="h-3 w-3 shrink-0" />
                      <span className="flex-1 text-left">{category.label}</span>
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition-transform duration-200",
                          !isOpen && "-rotate-90",
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300",
                        isOpen
                          ? "max-h-[500px] opacity-100"
                          : "max-h-0 opacity-0",
                      )}
                    >
                      <div className="space-y-0.5 py-0.5">
                        {category.items.map((item) => {
                          const isActive = pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all duration-300",
                                isActive
                                  ? cn("text-foreground", category.activeColor)
                                  : "text-muted-foreground/70 hover:text-foreground",
                              )}
                              style={isActive ? {
                                background: `${CATEGORY_GLOW[category.label]}15`,
                                boxShadow: `0 0 8px ${CATEGORY_GLOW[category.label]}40, inset 0 0 12px ${CATEGORY_GLOW[category.label]}10`,
                              } : undefined}
                              onMouseEnter={(e) => {
                                if (!isActive) {
                                  const c = CATEGORY_GLOW[category.label];
                                  e.currentTarget.style.boxShadow = `0 0 10px ${c}50, inset 0 0 10px ${c}08`;
                                  e.currentTarget.style.background = `${c}10`;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.boxShadow = "none";
                                  e.currentTarget.style.background = "transparent";
                                }
                              }}
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{item.label}</span>
                              {isActive && (
                                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-oklch(0.55_0.24_264) shadow-[0_0_6px_oklch(0.55_0.24_264/0.5)]" />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Draggable divider between nav and chats */}
        {!collapsed && (
          <div
            className="relative mx-2 shrink-0"
            style={{ cursor: "row-resize" }}
            onMouseDown={(e) => { e.preventDefault(); setIsResizingSplit(true); }}
          >
            {/* Wider invisible hit area */}
            <div className="absolute inset-x-0 -top-3 -bottom-3 z-10" />
            <div className={cn(
              "h-[2px] rounded-full transition-colors",
              isResizingSplit ? "bg-blue-400/50" : "bg-white/[0.06] hover:bg-white/[0.2]",
            )} />
          </div>
        )}

        {/* Conversations */}
        {!collapsed && (
          <>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-base font-semibold text-muted-foreground/80">
                Chats
              </span>
              <button
                onClick={() => setEditChatsMode(!editChatsMode)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all",
                  editChatsMode
                    ? "text-blue-400 bg-blue-500/10"
                    : "text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.04]",
                )}
              >
                <Pencil className="h-3 w-3" />
                {editChatsMode ? "Done" : "Edit"}
              </button>
            </div>

            {/* Action buttons - big, clear, separated */}
            <div className="px-3 pb-3 flex flex-col gap-2">
              <button
                onClick={() => setNewChatOpen(!newChatOpen)}
                className="flex items-center gap-3 w-full rounded-xl border border-white/[0.08] px-4 py-3 text-left transition-all hover:bg-white/[0.04] hover:border-white/[0.15]"
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 10px rgba(59,130,246,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
              >
                <MessageSquarePlus className="h-5 w-5 text-blue-400" />
                <span className="text-sm font-medium">New Chat</span>
              </button>
              <button
                onClick={handleNewFolder}
                className="flex items-center gap-3 w-full rounded-xl border border-white/[0.08] px-4 py-3 text-left transition-all hover:bg-white/[0.04] hover:border-white/[0.15]"
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 10px rgba(139,92,246,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
              >
                <FolderPlus className="h-5 w-5 text-violet-400" />
                <span className="text-sm font-medium">New Folder</span>
              </button>
            </div>

            {/* New chat agent picker dropdown */}
            {newChatOpen && (
              <div className="mx-3 mb-3 rounded-xl border border-white/[0.08] glass-strong overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
                  <span className="text-sm font-medium text-muted-foreground/70">Pick an agent</span>
                  <button onClick={() => setNewChatOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-white/[0.06]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="py-1">
                  {agents.filter((a) => a.is_active).map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => handleNewChat(agent.id)}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
                    >
                      <div className={cn("flex h-5 w-5 items-center justify-center rounded-md text-[8px] font-medium text-white", getAvatarColor(agent.id))}>
                        {getInitials(agent.name)}
                      </div>
                      <span>{agent.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden px-2 pb-2">
              <div className="space-y-1 pb-4">
                {folders.map((folder) => {
                  const isOpen = expandedFolders[folder.id] ?? false;
                  const folderConvs = convsByFolder[folder.id] || [];
                  const FolderIcon = isOpen ? FolderOpen : FolderClosed;

                  return (
                    <div key={folder.id}>
                      <div
                        className="group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.03] transition-all duration-200"
                        onClick={() => toggleFolder(folder.id)}
                      >
                        <FolderIcon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate text-sm font-medium">
                          {folder.name}
                        </span>
                        <span className="text-sm text-muted-foreground/50 group-hover:hidden">
                          {folderConvs.length}
                        </span>
                        <button
                          className="hidden group-hover:flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                          title="Delete folder"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 text-muted-foreground/50 transition-transform",
                            isOpen && "rotate-90",
                          )}
                        />
                      </div>
                      {isOpen && (
                        <div className="ml-2 border-l border-white/[0.06] pl-1 space-y-0.5">
                          {folderConvs.length === 0 ? (
                            <p className="px-2 py-1 text-xs text-muted-foreground/50">
                              Empty
                            </p>
                          ) : (
                            folderConvs.map((conv) => (
                              <ConversationItem
                                key={conv.id}
                                conv={conv}
                                isActive={pathname === `/chat/${conv.id}`}
                                isHovered={hoveredConv === conv.id}
                                onHover={setHoveredConv}
                                onDelete={handleDeleteConversation}
                                onClick={() => setSidebarOpen(false)}
                                onOpenAgent={() => setSidebarOpen(false)}
                              />
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {hasFolders && unfiledConvs.length > 0 && (
                  <div className="pt-1">
                    <div className="px-2 py-1">
                      <span className="text-xs font-medium uppercase text-muted-foreground/50">
                        Unfiled
                      </span>
                    </div>
                  </div>
                )}
                {unfiledConvs.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={pathname === `/chat/${conv.id}`}
                    isHovered={hoveredConv === conv.id}
                    onHover={setHoveredConv}
                    onDelete={handleDeleteConversation}
                    onClick={() => setSidebarOpen(false)}
                    onOpenAgent={() => setSidebarOpen(false)}
                  />
                ))}

                {conversations.length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground/50">
                    No conversations yet.
                    <br />
                    Chat with an agent to start one.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        </div>{/* end content zone */}

        {/* Bottom bar: collapse toggle + settings */}
        <div className="border-t border-white/[0.04] p-1.5 space-y-0.5">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={handleCollapseChange}
                    className="flex h-9 w-full items-center justify-center rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.05] transition-all duration-200"
                  />
                }
              >
                <PanelLeft className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Expand sidebar
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={handleCollapseChange}
              className="hidden md:flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.04] transition-all duration-200"
            >
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </button>
          )}
        </div>

        {/* Right edge resize handle - inside aside, extends beyond */}
        {!collapsed && (
          <div
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsResizingSidebar(true); }}
            style={{ cursor: "col-resize" }}
            className="absolute top-0 bottom-0 -right-[5px] w-[10px] z-[60]"
          >
            <div className={cn(
              "absolute top-0 bottom-0 left-1/2 -translate-x-1/2 transition-all",
              isResizingSidebar ? "w-[3px] bg-blue-400/60" : "w-[1px] bg-transparent hover:w-[3px] hover:bg-white/30",
            )} />
          </div>
        )}
      </aside>

      {!sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-3 left-3 z-30 hidden md:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
      )}
      <NavConfigPanel
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        groups={navGroups}
        onSave={setNavGroups}
      />
    </TooltipProvider>
  );
}

function ConversationItem({
  conv,
  isActive,
  isHovered,
  onHover,
  onDelete,
  onClick,
  onOpenAgent,
}: {
  conv: ConversationWithDetails;
  isActive: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClick: () => void;
  onOpenAgent: () => void;
}) {
  const agent = conv.agents[0];

  return (
    <Link
      href={`/chat/${conv.id}`}
      onClick={onClick}
      onMouseEnter={() => onHover(conv.id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
        isActive
          ? "bg-white/[0.06] text-foreground"
          : "text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.03]",
      )}
    >
      {agent ? (
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold text-white",
            getAvatarColor(agent.id),
          )}
        >
          {getInitials(agent.name)}
        </div>
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
          {conv.type === "group" ? (
            <Users className="h-4 w-4" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium">{conv.name}</div>
        {conv.last_message && (
          <div className="truncate text-xs text-muted-foreground/50">
            {conv.last_message.content.slice(0, 35)}
          </div>
        )}
      </div>

      {agent && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenAgent();
          }}
          className="rounded-sm p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity"
          title={`View ${agent.name} profile`}
        >
          <UserCircle className="h-3 w-3" />
        </button>
      )}

      {isHovered && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-lg opacity-60 hover:opacity-100 hover:text-red-400 hover:bg-red-500/10"
          onClick={(e) => onDelete(conv.id, e)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </Link>
  );
}
