"use client";

import { useEffect, useState } from "react";
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
} from "@/lib/api";
import { cn, getInitials, getAvatarColor, timeAgo } from "@/lib/utils";
import type { ConversationWithDetails, ConversationFolder } from "@/lib/types";

// ---------- Nav category definitions ----------

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavCategory {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    label: "Core",
    icon: Layout,
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
    items: [
      { href: "/webhooks", label: "Webhooks", icon: Webhook },
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/scheduled-tasks", label: "Tasks", icon: Clock },
    ],
  },
  {
    label: "Operations",
    icon: Activity,
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
    items: [
      { href: "/admin", label: "Admin", icon: Layers },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

// Flat list of all nav items (used in collapsed mode)
const ALL_NAV_ITEMS = NAV_CATEGORIES.flatMap((c) => c.items);

// ---------- Sidebar ----------

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { conversations, setConversations, sidebarOpen, setSidebarOpen, setAgents } =
    useStore();
  const [hoveredConv, setHoveredConv] = useState<string | null>(null);
  const [folders, setFolders] = useState<ConversationFolder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    () => {
      // Start with all categories expanded
      const init: Record<string, boolean> = {};
      for (const cat of NAV_CATEGORIES) init[cat.label] = true;
      return init;
    },
  );

  // collapsed = icon-only desktop mode (different from sidebarOpen which is mobile drawer)
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    loadData();
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

  async function handleDeleteConversation(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteConversation(id);
      setConversations(conversations.filter((c) => c.id !== id));
      if (pathname === `/chat/${id}`) router.push("/");
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  }

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

  function toggleFolder(folderId: string) {
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  }

  function toggleCategory(label: string) {
    setExpandedCategories((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  // Group conversations by folder
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

  return (
    <TooltipProvider delay={300}>
      {/* Mobile toggle */}
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

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full flex-col border-r border-white/[0.06] glass-strong transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-14" : "w-64",
        )}
      >
        {/* ---- Logo area ---- */}
        <div
          className={cn(
            "flex items-center gap-2 border-b border-white/[0.06] glass",
            collapsed ? "justify-center px-2 py-3" : "px-4 py-3",
          )}
        >
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 shadow-[0_0_12px_oklch(0.55_0.24_264_/0.3)]">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-400 to-violet-500 opacity-0 animate-[luminance-pulse_4s_ease-in-out_infinite]" />
            <Bot className="relative h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <>
              <span className="text-lg font-semibold whitespace-nowrap bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">AgentHub</span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto hidden md:flex h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setCollapsed(true)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* ---- Navigation (scrollable) ---- */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-1.5 py-2">
          {collapsed ? (
            // -- Collapsed: flat icon list with tooltips --
            <div className="flex flex-col items-center gap-0.5">
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
                            "relative flex h-9 w-9 items-center justify-center rounded-md transition-all duration-200 light-sweep-hover",
                            isActive
                              ? "bg-accent/80 text-accent-foreground shadow-[0_0_10px_var(--accent-color-glow,rgba(99,102,241,0.35))] sidebar-item-active"
                              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground sidebar-item-glow",
                          )}
                        />
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
          ) : (
            // -- Expanded: categorized nav --
            <div className="space-y-1">
              {NAV_CATEGORIES.map((category) => {
                const isOpen = expandedCategories[category.label] ?? true;
                const CategoryIcon = category.icon;
                const hasActiveChild = category.items.some(
                  (i) => pathname === i.href,
                );

                return (
                  <div key={category.label}>
                    {/* Category heading */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.label)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium uppercase tracking-wider transition-all duration-200",
                        hasActiveChild
                          ? "text-foreground/90 hover:bg-white/[0.03]"
                          : "text-muted-foreground/70 hover:text-muted-foreground hover:bg-white/[0.02]",
                      )}
                    >
                      <CategoryIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 text-left">{category.label}</span>
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition-transform duration-200",
                          !isOpen && "-rotate-90",
                        )}
                      />
                    </button>

                    {/* Category items */}
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-200 ease-in-out",
                        isOpen
                          ? "max-h-[500px] opacity-100"
                          : "max-h-0 opacity-0",
                      )}
                    >
                      <div className="space-y-0.5 py-0.5">
                        {category.items.map((item, idx) => {
                          const isActive = pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "stagger-item relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all duration-200 light-sweep-hover",
                                isActive
                                  ? "bg-accent/80 text-accent-foreground sidebar-item-active"
                                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground sidebar-item-glow",
                              )}
                              style={{ animationDelay: `${idx * 40}ms` }}
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{item.label}</span>
                              {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_oklch(0.55_0.24_264/0.6)] animate-[luminance-pulse_2s_ease-in-out_infinite]" />}
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

        {/* ---- Conversations section (scrollable, hidden when collapsed) ---- */}
        {!collapsed && (
          <>
            <div className="border-t border-white/[0.06] mx-2" />

            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                Conversations
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleNewFolder}
                title="New Folder"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-2 pb-2">
              <div className="space-y-1 pb-4">
                {/* Folders */}
                {folders.map((folder) => {
                  const isOpen = expandedFolders[folder.id] ?? false;
                  const folderConvs = convsByFolder[folder.id] || [];
                  const FolderIcon = isOpen ? FolderOpen : FolderClosed;

                  return (
                    <div key={folder.id}>
                      <div
                        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm cursor-pointer text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all duration-200 sidebar-item-glow"
                        onClick={() => toggleFolder(folder.id)}
                      >
                        <FolderIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate text-xs font-medium">
                          {folder.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {folderConvs.length}
                        </span>
                        <ChevronRight
                          className={cn(
                            "h-3 w-3 text-muted-foreground transition-transform",
                            isOpen && "rotate-90",
                          )}
                        />
                      </div>
                      {isOpen && (
                        <div className="ml-2 border-l border-border/50 pl-1 space-y-0.5">
                          {folderConvs.length === 0 ? (
                            <p className="px-2 py-1 text-[10px] text-muted-foreground">
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

                {/* Unfiled conversations */}
                {hasFolders && unfiledConvs.length > 0 && (
                  <div className="pt-1">
                    <div className="px-2 py-1">
                      <span className="text-[10px] font-medium uppercase text-muted-foreground">
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

                {/* No conversations */}
                {conversations.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No conversations yet.
                    <br />
                    Chat with an agent to start one.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* ---- Bottom collapse/expand toggle ---- */}
        <div className="border-t border-white/[0.06] p-2">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => setCollapsed(false)}
                    className="flex h-9 w-full items-center justify-center rounded-md text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-all duration-200 sidebar-item-glow"
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
              onClick={() => setCollapsed(true)}
              className="hidden md:flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-all duration-200 sidebar-item-glow"
            >
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </button>
          )}
        </div>
      </aside>

      {/* Desktop collapsed sidebar expand button (when sidebar is fully hidden on mobile) */}
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
    </TooltipProvider>
  );
}

// ---------- ConversationItem ----------

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
          "group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-all duration-200 light-sweep-hover",
          isActive
            ? "bg-accent text-accent-foreground sidebar-item-active"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground sidebar-item-glow",
        )}
      >
      {agent ? (
        <div
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white",
            getAvatarColor(agent.id),
          )}
        >
          {getInitials(agent.name)}
        </div>
      ) : (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
          {conv.type === "group" ? (
            <Users className="h-3 w-3" />
          ) : (
            <MessageSquare className="h-3 w-3" />
          )}
        </div>
      )}

      <div className="flex-1 truncate">
        <div className="truncate text-xs">{conv.name}</div>
        {conv.last_message && (
          <div className="truncate text-[10px] text-muted-foreground">
            {conv.last_message.content.slice(0, 40)}
          </div>
        )}
      </div>

      {agent && (
        <Link
          href={`/agents/${agent.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpenAgent();
          }}
          className="rounded-sm p-0.5 opacity-0 group-hover:opacity-100 hover:bg-accent-foreground/20 transition-opacity"
          title={`View ${agent.name} profile`}
        >
          <UserCircle className="h-3 w-3" />
        </Link>
      )}

      {isHovered && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0 opacity-60 hover:opacity-100"
          onClick={(e) => onDelete(conv.id, e)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </Link>
  );
}
