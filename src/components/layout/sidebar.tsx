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
  Shield,
  FlaskConical,
  BookOpen,
  Scan,
  UserCircle2,
  Network,
  Plug,
  Lightbulb,
  Globe,
  Lock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { getConversations, deleteConversation, getAgents, getFolders, createFolder } from "@/lib/api";
import { cn, getInitials, getAvatarColor, timeAgo } from "@/lib/utils";
import type { ConversationWithDetails, ConversationFolder } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/search", label: "Search", icon: Search },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/groups", label: "Group Chats", icon: Users },
  { href: "/personas", label: "Personas", icon: UserCircle2 },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/workflows", label: "Workflows", icon: GitBranch },
  { href: "/arena", label: "Arena", icon: Swords },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/playground", label: "Playground", icon: FlaskConical },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/scheduled-tasks", label: "Tasks", icon: Clock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/fleet", label: "Fleet", icon: Network },
  { href: "/traces", label: "Traces", icon: Scan },
  { href: "/guardrails", label: "Guardrails", icon: Shield },
  { href: "/policies", label: "Policies", icon: Lock },
  { href: "/a2a", label: "A2A", icon: Globe },
  { href: "/monitoring", label: "Monitoring", icon: Activity },
  { href: "/api-keys", label: "API Keys", icon: Key },
  { href: "/admin", label: "Admin", icon: Layers },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { conversations, setConversations, sidebarOpen, setSidebarOpen, setAgents } = useStore();
  const [hoveredConv, setHoveredConv] = useState<string | null>(null);
  const [folders, setFolders] = useState<ConversationFolder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

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

  // Group conversations by folder
  const convsByFolder: Record<string, ConversationWithDetails[]> = {};
  const unfiledConvs: ConversationWithDetails[] = [];

  for (const conv of conversations) {
    const folderId = (conv as ConversationWithDetails & { folder_id?: string | null }).folder_id;
    if (folderId && folders.some((f) => f.id === folderId)) {
      if (!convsByFolder[folderId]) convsByFolder[folderId] = [];
      convsByFolder[folderId].push(conv);
    } else {
      unfiledConvs.push(conv);
    }
  }

  const hasFolders = folders.length > 0;

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
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
          "fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-border bg-card transition-transform duration-200",
          "md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold">AgentHub</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto hidden md:flex h-7 w-7"
            onClick={() => setSidebarOpen(false)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 p-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <Separator className="mx-2" />

        {/* Conversations */}
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs font-medium uppercase text-muted-foreground">Conversations</span>
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

        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 pb-4">
            {/* Folders */}
            {folders.map((folder) => {
              const isOpen = expandedFolders[folder.id] ?? false;
              const folderConvs = convsByFolder[folder.id] || [];
              const FolderIcon = isOpen ? FolderOpen : FolderClosed;

              return (
                <div key={folder.id}>
                  <div
                    className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm cursor-pointer text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                    onClick={() => toggleFolder(folder.id)}
                  >
                    <FolderIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate text-xs font-medium">{folder.name}</span>
                    <span className="text-[10px] text-muted-foreground">{folderConvs.length}</span>
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
                        <p className="px-2 py-1 text-[10px] text-muted-foreground">Empty</p>
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
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Unfiled</span>
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

            {/* No conversations at all */}
            {conversations.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                No conversations yet.
                <br />
                Chat with an agent to start one.
              </p>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Collapsed sidebar toggle for desktop */}
      {!sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-3 left-3 z-30 hidden md:flex"
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
      )}
    </>
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
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
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
          onClick={(e) => { e.stopPropagation(); onOpenAgent(); }}
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
