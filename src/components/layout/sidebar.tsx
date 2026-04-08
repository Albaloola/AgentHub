"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
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
  GripVertical,
  Pin,
  Download,
  ArrowRight,
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
import { useShallow } from "zustand/react/shallow";
import { stagger, duration, ease } from "@/lib/animation";
import {
  getConversations,
  deleteConversation,
  getAgents,
  getFolders,
  createFolder,
  deleteFolder,
  createConversation,
  toggleConversationPin,
  exportConversation,
  moveConversationToFolder,
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

const navContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: stagger.fast,
      delayChildren: 0.1,
    },
  },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: ease.gentle },
  },
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { agents, conversations, setConversations, sidebarOpen, setSidebarOpen, setAgents, uiPrefs } =
    useStore(useShallow((s) => ({ agents: s.agents, conversations: s.conversations, setConversations: s.setConversations, sidebarOpen: s.sidebarOpen, setSidebarOpen: s.setSidebarOpen, setAgents: s.setAgents, uiPrefs: s.uiPrefs })));
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

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ convId: string; x: number; y: number } | null>(null);
  const [ctxSubmenu, setCtxSubmenu] = useState(false); // "Move to folder" submenu open
  const [renamingConvId, setRenamingConvId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const ctxMenuRef = useRef<HTMLDivElement>(null);

  // Drag-and-drop reorder state
  const [convOrder, setConvOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("agenthub-conv-order");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; pos: "before" | "after" } | null>(null);
  const [dropFolderId, setDropFolderId] = useState<string | null>(null);

  // Close context menu on click outside or Escape
  useEffect(() => {
    if (!ctxMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
        setCtxSubmenu(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setCtxMenu(null); setCtxSubmenu(false); }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [ctxMenu]);

  // Persist conv order to localStorage
  useEffect(() => {
    if (convOrder.length > 0) {
      localStorage.setItem("agenthub-conv-order", JSON.stringify(convOrder));
    }
  }, [convOrder]);

  // Context menu actions
  function handleCtxRename(convId: string) {
    const conv = conversations.find((c) => c.id === convId);
    setRenamingConvId(convId);
    setRenameValue(conv?.name || "");
    setCtxMenu(null);
    setCtxSubmenu(false);
  }

  function handleRenameSubmit(convId: string) {
    if (renameValue.trim()) {
      setConversations(
        conversations.map((c) => (c.id === convId ? { ...c, name: renameValue.trim() } : c)),
      );
    }
    setRenamingConvId(null);
    setRenameValue("");
  }

  async function handleCtxPin(convId: string) {
    setCtxMenu(null);
    setCtxSubmenu(false);
    const conv = conversations.find((c) => c.id === convId);
    if (!conv) return;
    // Optimistic toggle
    setConversations(
      conversations.map((c) => (c.id === convId ? { ...c, is_pinned: !c.is_pinned } : c)),
    );
    try {
      await toggleConversationPin(convId);
    } catch {
      // Revert on failure
      setConversations(
        conversations.map((c) => (c.id === convId ? { ...c, is_pinned: conv.is_pinned } : c)),
      );
      toast.error("Failed to toggle pin");
    }
  }

  async function handleCtxExport(convId: string) {
    setCtxMenu(null);
    setCtxSubmenu(false);
    try {
      const data = await exportConversation(convId, "json");
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const conv = conversations.find((c) => c.id === convId);
      a.download = `${(conv?.name || "chat").replace(/[^a-z0-9]/gi, "_")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Chat exported");
    } catch {
      toast.error("Failed to export chat");
    }
  }

  async function handleCtxMoveToFolder(convId: string, folderId: string | null) {
    setCtxMenu(null);
    setCtxSubmenu(false);
    try {
      await moveConversationToFolder(convId, folderId);
      // Refresh to pick up server-side folder_id change
      const convs = await getConversations();
      setConversations(convs);
      toast.success(folderId ? "Moved to folder" : "Removed from folder");
    } catch {
      toast.error("Failed to move conversation");
    }
  }

  function handleCtxDelete(convId: string) {
    setCtxMenu(null);
    setCtxSubmenu(false);
    // Reuse existing delete handler with a synthetic event
    handleDeleteConversation(convId, { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent);
  }

  // Drag-and-drop handlers
  function onDragStart(convId: string) {
    setDragId(convId);
  }

  function onDragOverConv(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDropTarget(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? "before" : "after";
    setDropTarget({ id: targetId, pos });
    setDropFolderId(null);
  }

  function onDragOverFolder(e: React.DragEvent, folderId: string) {
    e.preventDefault();
    if (!dragId) return;
    setDropTarget(null);
    setDropFolderId(folderId);
  }

  function onDropConv(e: React.DragEvent) {
    e.preventDefault();
    if (!dragId || !dropTarget) { cleanup(); return; }

    // Build ordered list: start with current order, fill in missing
    const allIds = conversations.map((c) => c.id);
    let ordered = convOrder.filter((id) => allIds.includes(id));
    for (const id of allIds) {
      if (!ordered.includes(id)) ordered.push(id);
    }

    // Remove dragId from current position
    ordered = ordered.filter((id) => id !== dragId);
    // Find target index
    let targetIdx = ordered.indexOf(dropTarget.id);
    if (targetIdx === -1) targetIdx = ordered.length - 1;
    if (dropTarget.pos === "after") targetIdx++;
    ordered.splice(targetIdx, 0, dragId);

    setConvOrder(ordered);
    cleanup();
  }

  async function onDropFolder(e: React.DragEvent, folderId: string) {
    e.preventDefault();
    if (!dragId) { cleanup(); return; }
    try {
      await moveConversationToFolder(dragId, folderId);
      const convs = await getConversations();
      setConversations(convs);
      toast.success("Moved to folder");
    } catch {
      toast.error("Failed to move to folder");
    }
    cleanup();
  }

  function cleanup() {
    setDragId(null);
    setDropTarget(null);
    setDropFolderId(null);
  }

  // Apply ordering to unfiled conversations
  function sortConversations(convs: ConversationWithDetails[]): ConversationWithDetails[] {
    // Pinned first
    const pinned = convs.filter((c) => c.is_pinned);
    const unpinned = convs.filter((c) => !c.is_pinned);

    const orderConvs = (list: ConversationWithDetails[]) => {
      if (convOrder.length === 0) return list;
      const orderMap = new Map(convOrder.map((id, i) => [id, i]));
      return [...list].sort((a, b) => {
        const ia = orderMap.get(a.id) ?? Infinity;
        const ib = orderMap.get(b.id) ?? Infinity;
        return ia - ib;
      });
    };

    return [...orderConvs(pinned), ...orderConvs(unpinned)];
  }

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

  // --- Nav drag-and-drop reorder state ---
  const [editNavMode, setEditNavMode] = useState(false);
  const [dragNavItem, setDragNavItem] = useState<string | null>(null); // href of item being dragged
  const [dragNavGroup, setDragNavGroup] = useState<string | null>(null); // group id being dragged
  const [navDropTarget, setNavDropTarget] = useState<{ type: "item"; groupId: string; href: string; pos: "before" | "after" } | { type: "group"; groupId: string; pos: "before" | "after" } | null>(null);

  // Icon lookup from static NAV_CATEGORIES
  const navIconMap = useRef(new Map<string, LucideIcon>());
  const navGroupIconMap = useRef(new Map<string, { icon: LucideIcon; neon: string; activeColor: string }>());
  if (navIconMap.current.size === 0) {
    for (const cat of NAV_CATEGORIES) {
      navGroupIconMap.current.set(cat.label.toLowerCase(), { icon: cat.icon, neon: cat.neon, activeColor: cat.activeColor });
      for (const item of cat.items) navIconMap.current.set(item.href, item.icon);
    }
  }

  function getNavIcon(href: string): LucideIcon {
    return navIconMap.current.get(href) || Activity;
  }

  function getGroupMeta(groupId: string) {
    return navGroupIconMap.current.get(groupId) || { icon: Layers, neon: "neon-blue", activeColor: "text-neon-blue" };
  }

  function getGroupGlow(groupId: string): string {
    const label = navGroups.find((g) => g.id === groupId)?.label || "";
    return CATEGORY_GLOW[label] || "#3b82f6";
  }

  // Nav item DnD handlers
  function onNavItemDragStart(e: React.DragEvent, href: string) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", href);
    setDragNavItem(href);
    setDragNavGroup(null);
  }

  function onNavGroupDragStart(e: React.DragEvent, groupId: string) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", groupId);
    setDragNavGroup(groupId);
    setDragNavItem(null);
  }

  function onNavItemDragOver(e: React.DragEvent, groupId: string, href: string) {
    e.preventDefault();
    if (!dragNavItem || dragNavItem === href) { setNavDropTarget(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setNavDropTarget({ type: "item", groupId, href, pos });
  }

  function onNavGroupDragOver(e: React.DragEvent, groupId: string) {
    e.preventDefault();
    if (dragNavItem) {
      // Dragging an item over a group header = drop into that group at end
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
      setNavDropTarget({ type: "group", groupId, pos });
      return;
    }
    if (!dragNavGroup || dragNavGroup === groupId) { setNavDropTarget(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setNavDropTarget({ type: "group", groupId, pos });
  }

  function onNavDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!navDropTarget) { cleanupNavDrag(); return; }

    let updated = navGroups.map((g) => ({ ...g, items: [...g.items] }));

    if (dragNavItem && navDropTarget.type === "item") {
      // Move item within or between groups
      const target = navDropTarget as { type: "item"; groupId: string; href: string; pos: "before" | "after" };
      // Remove item from source group
      let movedItem: typeof updated[0]["items"][0] | null = null;
      for (const g of updated) {
        const idx = g.items.findIndex((i) => i.href === dragNavItem);
        if (idx !== -1) { movedItem = g.items.splice(idx, 1)[0]; break; }
      }
      if (movedItem) {
        const targetGroup = updated.find((g) => g.id === target.groupId);
        if (targetGroup) {
          const targetIdx = targetGroup.items.findIndex((i) => i.href === target.href);
          const insertIdx = target.pos === "after" ? targetIdx + 1 : targetIdx;
          targetGroup.items.splice(insertIdx, 0, movedItem);
        }
      }
    } else if (dragNavItem && navDropTarget.type === "group") {
      // Drop item onto group header = append to that group
      let movedItem: typeof updated[0]["items"][0] | null = null;
      for (const g of updated) {
        const idx = g.items.findIndex((i) => i.href === dragNavItem);
        if (idx !== -1) { movedItem = g.items.splice(idx, 1)[0]; break; }
      }
      if (movedItem) {
        const targetGroup = updated.find((g) => g.id === navDropTarget.groupId);
        if (targetGroup) targetGroup.items.push(movedItem);
      }
    } else if (dragNavGroup && navDropTarget.type === "group") {
      // Reorder groups
      const fromIdx = updated.findIndex((g) => g.id === dragNavGroup);
      if (fromIdx !== -1) {
        const [moved] = updated.splice(fromIdx, 1);
        let toIdx = updated.findIndex((g) => g.id === navDropTarget.groupId);
        if (navDropTarget.pos === "after") toIdx++;
        updated.splice(toIdx, 0, moved);
      }
    }

    setNavGroups(updated);
    saveNavConfig(updated);
    cleanupNavDrag();
  }

  function cleanupNavDrag() {
    setDragNavItem(null);
    setDragNavGroup(null);
    setNavDropTarget(null);
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
  const rawUnfiledConvs: ConversationWithDetails[] = [];

  for (const conv of conversations) {
    const folderId = (conv as ConversationWithDetails & { folder_id?: string | null })
      .folder_id;
    if (folderId && folders.some((f) => f.id === folderId)) {
      if (!convsByFolder[folderId]) convsByFolder[folderId] = [];
      convsByFolder[folderId].push(conv);
    } else {
      rawUnfiledConvs.push(conv);
    }
  }

  const unfiledConvs = sortConversations(rawUnfiledConvs);

  const hasFolders = folders.length > 0;
  const isPills = hydrated && uiPrefs.navStyle === "pills";

  return (
    <TooltipProvider delay={300}>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
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
        role="complementary"
        aria-label="Sidebar"
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full flex-col border-r border-foreground/[0.04] bg-sidebar/95 backdrop-blur-xl overflow-visible",
          "md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          !isResizingSidebar && "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        )}
        style={{ width: collapsed ? 52 : sidebarWidth }}
      >
        {/* Logo + collapse toggle */}
        <div
          className={cn(
            "flex items-center border-b border-foreground/[0.04] shrink-0",
            collapsed ? "justify-center px-2 py-3" : "px-4 py-3 gap-2",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 shadow-[0_0_12px_oklch(0.55_0.24_264_/0.2)]">
            <Bot className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <>
              <span className="text-lg font-semibold whitespace-nowrap text-foreground">AgentHub</span>
              <button
                onClick={handleCollapseChange}
                className="ml-auto h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.08] transition-all duration-300"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                aria-expanded={!collapsed}
              >
                <PanelLeftClose className="h-4.5 w-4.5" />
              </button>
            </>
          )}
          {/* Empty - expand button is below the logo when collapsed */}
        </div>

        {/* Expand button when collapsed - big and clear, above nav icons */}
        {collapsed && (
          <div className="shrink-0 flex justify-center py-3 border-b border-foreground/[0.04]">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={handleCollapseChange}
                    aria-label="Expand sidebar"
                    aria-expanded={false}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground/70 hover:text-foreground hover:bg-foreground/[0.12] transition-all"
                  />
                }
              >
                <PanelLeft className="h-5 w-5" />
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                Expand sidebar
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Content zone (nav + chats) - ref for split resize calculation */}
        <div ref={contentZoneRef} className="flex-1 flex flex-col min-h-0">

        {/* Navigation header with configure button */}
        {!collapsed && (
          <div className="flex items-center justify-end gap-1 px-3 pt-2">
            <button
              onClick={() => setEditNavMode(!editNavMode)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all duration-300",
                editNavMode
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]",
              )}
            >
              <GripVertical className="h-3 w-3" />
              {editNavMode ? "Done" : "Reorder"}
            </button>
            <button
              onClick={() => setConfigOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-all duration-300"
            >
              <SlidersHorizontal className="h-3 w-3" />
              Configure
            </button>
          </div>
        )}

        {/* Navigation (resizable height) */}
        <nav
          ref={navRef}
          role="navigation"
          aria-label="Main navigation"
          className={cn("min-h-0 overflow-y-auto scrollbar-hidden px-1.5 py-1", collapsed && "flex-1")}
          style={collapsed ? undefined : { height: navHeight ? `${navHeight}px` : "55%", flexShrink: 0 }}
        >
          {collapsed ? (
            <motion.div
              className="flex flex-col items-center gap-1"
              variants={navContainerVariants}
              initial="hidden"
              animate="visible"
            >
              {ALL_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <motion.div key={item.href} variants={navItemVariants}>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Link
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200",
                              isActive
                                ? "bg-oklch(0.55_0.24_264_/0.15) text-foreground"
                                : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
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
                  </motion.div>
                );
              })}
            </motion.div>
          ) : isPills ? (
            <motion.div
              className="space-y-2"
              variants={navContainerVariants}
              initial="hidden"
              animate="visible"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onNavDrop}
            >
              {navGroups.map((group) => {
                const isOpen = expandedCategories[group.label] ?? true;
                const meta = getGroupMeta(group.id);
                const CategoryIcon = meta.icon;
                const glow = getGroupGlow(group.id);
                const visibleItems = group.items.filter((i) => i.visible);
                const hasActiveChild = visibleItems.some((i) => pathname === i.href);
                const isGroupDropTarget = navDropTarget?.type === "group" && navDropTarget.groupId === group.id;

                return (
                  <motion.div key={group.id} className="relative" variants={navItemVariants}>
                    {isGroupDropTarget && navDropTarget.pos === "before" && (
                      <div className="absolute top-0 left-2 right-2 h-[2px] bg-blue-400 rounded-full z-10" />
                    )}
                    <button
                      type="button"
                      onClick={() => !editNavMode && toggleCategory(group.label)}
                      draggable={editNavMode}
                      onDragStart={(e) => onNavGroupDragStart(e, group.id)}
                      onDragOver={(e) => onNavGroupDragOver(e, group.id)}
                      onDragEnd={cleanupNavDrag}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-wider transition-all duration-200",
                        hasActiveChild
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                        editNavMode && "cursor-grab active:cursor-grabbing",
                      )}
                    >
                      {editNavMode && <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/50" />}
                      <CategoryIcon className="h-3 w-3 shrink-0" />
                      <span className="flex-1 text-left">{group.label}</span>
                      {!editNavMode && (
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 transition-transform duration-200",
                            !isOpen && "-rotate-90",
                          )}
                        />
                      )}
                    </button>

                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300",
                        (isOpen || editNavMode)
                          ? "max-h-[31.25rem] opacity-100"
                          : "max-h-0 opacity-0",
                      )}
                    >
                      <div className="flex flex-wrap gap-1 py-1">
                        {visibleItems.map((item) => {
                          const isActive = pathname === item.href;
                          const ItemIcon = getNavIcon(item.href);
                          const isItemDropTarget = navDropTarget?.type === "item" && navDropTarget.href === item.href;
                          return (
                            <div key={item.href} className="relative">
                              {isItemDropTarget && navDropTarget.pos === "before" && (
                                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-400 rounded-full z-10" />
                              )}
                              {isItemDropTarget && navDropTarget.pos === "after" && (
                                <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-blue-400 rounded-full z-10" />
                              )}
                              <Link
                                href={editNavMode ? "#" : item.href}
                                onClick={(e) => { if (editNavMode) e.preventDefault(); else setSidebarOpen(false); }}
                                draggable={editNavMode}
                                onDragStart={(e) => onNavItemDragStart(e, item.href)}
                                onDragOver={(e) => onNavItemDragOver(e, group.id, item.href)}
                                onDragEnd={cleanupNavDrag}
                                className={cn(
                                  "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border",
                                  isActive
                                    ? cn("border-current", meta.activeColor)
                                    : "border-transparent text-muted-foreground",
                                  editNavMode && "cursor-grab active:cursor-grabbing",
                                )}
                                style={{
                                  transition: "all 0.3s ease",
                                  ...(isActive ? {
                                    boxShadow: `0 0 8px ${glow}, 0 0 24px ${glow}40`,
                                  } : {}),
                                }}
                                onMouseEnter={(e) => {
                                  if (!isActive && !editNavMode) {
                                    e.currentTarget.style.boxShadow = `0 0 10px ${glow}, 0 0 30px ${glow}60`;
                                    e.currentTarget.style.borderColor = `${glow}80`;
                                    e.currentTarget.style.background = `${glow}15`;
                                    e.currentTarget.style.color = glow;
                                    e.currentTarget.style.transform = "scale(1.05)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isActive && !editNavMode) {
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.borderColor = "transparent";
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.color = "";
                                    e.currentTarget.style.transform = "scale(1)";
                                  }
                                }}
                              >
                                {editNavMode && <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/50" />}
                                <ItemIcon className="relative h-3.5 w-3.5 shrink-0" />
                                <span className="relative truncate">{item.label}</span>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {isGroupDropTarget && navDropTarget.pos === "after" && (
                      <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-400 rounded-full z-10" />
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              className="space-y-1"
              variants={navContainerVariants}
              initial="hidden"
              animate="visible"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onNavDrop}
            >
              {navGroups.map((group) => {
                const isOpen = expandedCategories[group.label] ?? true;
                const meta = getGroupMeta(group.id);
                const CategoryIcon = meta.icon;
                const glow = getGroupGlow(group.id);
                const visibleItems = group.items.filter((i) => i.visible);
                const hasActiveChild = visibleItems.some((i) => pathname === i.href);
                const isGroupDropTarget = navDropTarget?.type === "group" && navDropTarget.groupId === group.id;

                return (
                  <motion.div key={group.id} className="relative" variants={navItemVariants}>
                    {isGroupDropTarget && navDropTarget.pos === "before" && (
                      <div className="absolute top-0 left-2 right-2 h-[2px] bg-blue-400 rounded-full z-10" />
                    )}
                    <button
                      type="button"
                      onClick={() => !editNavMode && toggleCategory(group.label)}
                      draggable={editNavMode}
                      onDragStart={(e) => onNavGroupDragStart(e, group.id)}
                      onDragOver={(e) => onNavGroupDragOver(e, group.id)}
                      onDragEnd={cleanupNavDrag}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200",
                        hasActiveChild
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                        editNavMode && "cursor-grab active:cursor-grabbing",
                      )}
                    >
                      {editNavMode && <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/50" />}
                      <CategoryIcon className="h-3 w-3 shrink-0" />
                      <span className="flex-1 text-left">{group.label}</span>
                      {!editNavMode && (
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 transition-transform duration-200",
                            !isOpen && "-rotate-90",
                          )}
                        />
                      )}
                    </button>

                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300",
                        (isOpen || editNavMode)
                          ? "max-h-[31.25rem] opacity-100"
                          : "max-h-0 opacity-0",
                      )}
                    >
                      <div className="space-y-0.5 py-0.5">
                        {visibleItems.map((item) => {
                          const isActive = pathname === item.href;
                          const ItemIcon = getNavIcon(item.href);
                          const isItemDropTarget = navDropTarget?.type === "item" && navDropTarget.href === item.href;
                          return (
                            <div key={item.href} className="relative">
                              {isItemDropTarget && navDropTarget.pos === "before" && (
                                <div className="absolute top-0 left-2 right-2 h-[2px] bg-blue-400 rounded-full z-10" />
                              )}
                              <Link
                                href={editNavMode ? "#" : item.href}
                                onClick={(e) => { if (editNavMode) e.preventDefault(); else setSidebarOpen(false); }}
                                draggable={editNavMode}
                                onDragStart={(e) => onNavItemDragStart(e, item.href)}
                                onDragOver={(e) => onNavItemDragOver(e, group.id, item.href)}
                                onDragEnd={cleanupNavDrag}
                                className={cn(
                                  "relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm",
                                  isActive
                                    ? cn("text-foreground", meta.activeColor)
                                    : "text-muted-foreground",
                                  editNavMode && "cursor-grab active:cursor-grabbing",
                                )}
                                style={{
                                  transition: "all 0.3s ease",
                                  ...(isActive ? {
                                    background: `${glow}15`,
                                    boxShadow: `0 0 8px ${glow}40, inset 0 0 12px ${glow}10`,
                                  } : {}),
                                }}
                                onMouseEnter={(e) => {
                                  if (!isActive && !editNavMode) {
                                    e.currentTarget.style.boxShadow = `0 0 10px ${glow}50, inset 0 0 10px ${glow}08`;
                                    e.currentTarget.style.background = `${glow}10`;
                                    e.currentTarget.style.color = glow;
                                    e.currentTarget.style.transform = "scale(1.03)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isActive && !editNavMode) {
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.color = "";
                                    e.currentTarget.style.transform = "scale(1)";
                                  }
                                }}
                              >
                                {editNavMode && <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/50" />}
                                <ItemIcon className="h-4 w-4 shrink-0" />
                                <span className="truncate">{item.label}</span>
                                {isActive && !editNavMode && (
                                  <motion.div
                                    layoutId="activeNavIndicator"
                                    className="ml-auto h-1.5 w-1.5 rounded-full"
                                    style={{
                                      backgroundColor: glow,
                                      boxShadow: `0 0 6px ${glow}, 0 0 12px ${glow}80`,
                                    }}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                  />
                                )}
                              </Link>
                              {isItemDropTarget && navDropTarget.pos === "after" && (
                                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-400 rounded-full z-10" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {isGroupDropTarget && navDropTarget.pos === "after" && (
                      <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-400 rounded-full z-10" />
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </nav>

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
              isResizingSplit ? "bg-blue-400/50" : "bg-foreground/[0.06] hover:bg-foreground/[0.2]",
            )} />
          </div>
        )}

        {/* Conversations */}
        {!collapsed && (
          <>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-base font-semibold text-foreground">
                Chats
              </span>
              <button
                onClick={() => setEditChatsMode(!editChatsMode)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all",
                  editChatsMode
                    ? "text-blue-400 bg-blue-500/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]",
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
                className="flex items-center gap-3 w-full rounded-xl border border-foreground/[0.08] px-4 py-3 text-left transition-all hover:bg-foreground/[0.04] hover:border-foreground/[0.15]"
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 10px rgba(59,130,246,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
              >
                <MessageSquarePlus className="h-5 w-5 text-blue-400" />
                <span className="text-sm font-medium">New Chat</span>
              </button>
              <button
                onClick={handleNewFolder}
                className="flex items-center gap-3 w-full rounded-xl border border-foreground/[0.08] px-4 py-3 text-left transition-all hover:bg-foreground/[0.04] hover:border-foreground/[0.15]"
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 10px rgba(139,92,246,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
              >
                <FolderPlus className="h-5 w-5 text-violet-400" />
                <span className="text-sm font-medium">New Folder</span>
              </button>
            </div>

            {/* New chat agent picker dropdown */}
            {newChatOpen && (
              <div className="mx-3 mb-3 rounded-xl border border-foreground/[0.08] glass-strong overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-foreground/[0.04]">
                  <span className="text-sm font-medium text-muted-foreground">Pick an agent</span>
                  <button onClick={() => setNewChatOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="py-1">
                  {agents.filter((a) => a.is_active).map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => handleNewChat(agent.id)}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-foreground/[0.04] transition-colors"
                    >
                      <div className={cn("flex h-5 w-5 items-center justify-center rounded-md text-[0.5rem] font-medium text-white", getAvatarColor(agent.id))}>
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
                        className={cn(
                          "group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03] transition-all duration-200",
                          dropFolderId === folder.id && "ring-1 ring-blue-400/50 bg-blue-400/5",
                        )}
                        onClick={() => toggleFolder(folder.id)}
                        onDragOver={(e) => onDragOverFolder(e, folder.id)}
                        onDragLeave={() => setDropFolderId(null)}
                        onDrop={(e) => onDropFolder(e, folder.id)}
                      >
                        <FolderIcon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate text-sm font-medium">
                          {folder.name}
                        </span>
                        <span className="text-sm text-muted-foreground group-hover:hidden">
                          {folderConvs.length}
                        </span>
                        <button
                          className="hidden group-hover:flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                          title="Delete folder"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isOpen && "rotate-90",
                          )}
                        />
                      </div>
                      {isOpen && (
                        <div className="ml-2 border-l border-foreground/[0.06] pl-1 space-y-0.5">
                          {folderConvs.length === 0 ? (
                            <p className="px-2 py-1 text-xs text-muted-foreground">
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
                                onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ convId: conv.id, x: e.clientX, y: e.clientY }); setCtxSubmenu(false); }}
                                editMode={editChatsMode}
                                isRenaming={renamingConvId === conv.id}
                                renameValue={renameValue}
                                onRenameChange={setRenameValue}
                                onRenameSubmit={() => handleRenameSubmit(conv.id)}
                                onDragStart={() => onDragStart(conv.id)}
                                onDragOver={(e) => onDragOverConv(e, conv.id)}
                                onDrop={onDropConv}
                                dropIndicator={dropTarget?.id === conv.id ? dropTarget.pos : null}
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
                      <span className="text-xs font-medium uppercase text-muted-foreground">
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
                    onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ convId: conv.id, x: e.clientX, y: e.clientY }); setCtxSubmenu(false); }}
                    editMode={editChatsMode}
                    isRenaming={renamingConvId === conv.id}
                    renameValue={renameValue}
                    onRenameChange={setRenameValue}
                    onRenameSubmit={() => handleRenameSubmit(conv.id)}
                    onDragStart={() => onDragStart(conv.id)}
                    onDragOver={(e) => onDragOverConv(e, conv.id)}
                    onDrop={onDropConv}
                    dropIndicator={dropTarget?.id === conv.id ? dropTarget.pos : null}
                  />
                ))}

                {conversations.length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">
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

        {/* Bottom spacer */}
        <div className="shrink-0 h-2" />

        {/* Right edge resize handle - inside aside, extends beyond */}
        {!collapsed && (
          <div
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsResizingSidebar(true); }}
            style={{ cursor: "col-resize" }}
            className="absolute top-0 bottom-0 -right-[5px] w-[10px] z-[60]"
          >
            <div className={cn(
              "absolute top-0 bottom-0 left-1/2 -translate-x-1/2 transition-all",
              isResizingSidebar ? "w-[3px] bg-blue-400/60" : "w-[1px] bg-transparent hover:w-[3px] hover:bg-foreground/30",
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
      {/* Context menu */}
      {ctxMenu && (
        <div
          ref={ctxMenuRef}
          className="fixed z-[100] min-w-[180px] rounded-xl border border-foreground/[0.1] bg-popover/95 backdrop-blur-xl shadow-xl py-1 animate-fade-in"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-foreground/[0.06] transition-colors"
            onClick={() => handleCtxRename(ctxMenu.convId)}
          >
            <Pencil className="h-3.5 w-3.5" /> Rename
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-foreground/[0.06] transition-colors"
            onClick={() => handleCtxPin(ctxMenu.convId)}
          >
            <Pin className="h-3.5 w-3.5" />
            {conversations.find((c) => c.id === ctxMenu.convId)?.is_pinned ? "Unpin" : "Pin to top"}
          </button>
          <div
            className="relative"
            onMouseEnter={() => setCtxSubmenu(true)}
            onMouseLeave={() => setCtxSubmenu(false)}
          >
            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-foreground/[0.06] transition-colors">
              <FolderOpen className="h-3.5 w-3.5" /> Move to folder
              <ArrowRight className="h-3 w-3 ml-auto" />
            </button>
            {ctxSubmenu && (
              <div className="absolute left-full top-0 ml-1 min-w-[10rem] rounded-xl border border-foreground/[0.1] bg-popover/95 backdrop-blur-xl shadow-xl py-1">
                {folders.map((f) => (
                  <button
                    key={f.id}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-foreground/[0.06] transition-colors"
                    onClick={() => handleCtxMoveToFolder(ctxMenu.convId, f.id)}
                  >
                    <FolderClosed className="h-3.5 w-3.5" /> {f.name}
                  </button>
                ))}
                {folders.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No folders yet</p>
                )}
                <div className="border-t border-foreground/[0.06] mt-1 pt-1">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
                    onClick={() => handleCtxMoveToFolder(ctxMenu.convId, null)}
                  >
                    Remove from folder
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-foreground/[0.06] transition-colors"
            onClick={() => handleCtxExport(ctxMenu.convId)}
          >
            <Download className="h-3.5 w-3.5" /> Export chat
          </button>
          <div className="border-t border-foreground/[0.06] my-1" />
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            onClick={() => handleCtxDelete(ctxMenu.convId)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
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
  onContextMenu,
  editMode,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onDragStart,
  onDragOver,
  onDrop,
  dropIndicator,
}: {
  conv: ConversationWithDetails;
  isActive: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClick: () => void;
  onOpenAgent: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  editMode: boolean;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (val: string) => void;
  onRenameSubmit: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dropIndicator: "before" | "after" | null;
}) {
  const agent = conv.agents[0];

  return (
    <div className="relative">
      {dropIndicator === "before" && (
        <div className="absolute top-0 left-2 right-2 h-[2px] bg-blue-400 rounded-full z-10" />
      )}
      <Link
        href={`/chat/${conv.id}`}
        onClick={onClick}
        onMouseEnter={() => onHover(conv.id)}
        onMouseLeave={() => onHover(null)}
        onContextMenu={onContextMenu}
        draggable={editMode}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={() => {}}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
          isActive
            ? "bg-foreground/[0.06] text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03]",
          editMode && "cursor-grab active:cursor-grabbing",
        )}
      >
        {editMode && (
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
        )}

        {agent ? (
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[0.625rem] font-semibold text-white",
              getAvatarColor(agent.id),
            )}
          >
            {getInitials(agent.name)}
          </div>
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05]">
            {conv.type === "group" ? (
              <Users className="h-4 w-4" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onBlur={onRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRenameSubmit();
                if (e.key === "Escape") onRenameSubmit();
              }}
              onClick={(e) => e.preventDefault()}
              className="w-full bg-foreground/[0.06] border border-foreground/[0.12] rounded px-1.5 py-0.5 text-sm font-medium text-foreground outline-none focus:border-blue-400/50"
            />
          ) : (
            <>
              <div className="flex items-center gap-1 truncate text-sm font-medium">
                {conv.is_pinned && <Pin className="h-3 w-3 shrink-0 text-amber-400" />}
                <span className="truncate">{conv.name}</span>
              </div>
              {conv.last_message && (
                <div className="truncate text-xs text-muted-foreground">
                  {conv.last_message.content.slice(0, 35)}
                </div>
              )}
            </>
          )}
        </div>

        {!editMode && agent && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAgent();
            }}
            className="rounded-sm p-0.5 opacity-0 group-hover:opacity-100 hover:bg-foreground/10 transition-opacity"
            title={`View ${agent.name} profile`}
          >
            <UserCircle className="h-3 w-3" />
          </button>
        )}

        {!editMode && isHovered && (
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
      {dropIndicator === "after" && (
        <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-400 rounded-full z-10" />
      )}
    </div>
  );
}
