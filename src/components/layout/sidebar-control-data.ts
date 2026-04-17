"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  Clock3,
  FileText,
  FlaskConical,
  Globe,
  Hammer,
  KeyRound,
  Layers3,
  Lightbulb,
  Network,
  Plug,
  ScanSearch,
  Search,
  Settings2,
  Shield,
  Swords,
  Users,
  Waypoints,
  Workflow,
} from "lucide-react";
import type { NavGroupConfig } from "./nav-config-panel";

export interface SidebarControlItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface SidebarControlGroup {
  id: string;
  label: string;
  description: string;
  accent: string;
  icon: LucideIcon;
  items: SidebarControlItem[];
}

export const SIDEBAR_CONTROL_GROUPS: SidebarControlGroup[] = [
  {
    id: "core",
    label: "Core",
    description: "Mission control, search, and agent entrypoints.",
    accent: "var(--accent-blue)",
    icon: Activity,
    items: [
      { href: "/", label: "Mission Control", description: "Cockpit overview and launch deck", icon: Activity },
      { href: "/search", label: "Search", description: "Global search across conversations and assets", icon: Search },
      { href: "/agents", label: "Agents", description: "Manage connected agent gateways", icon: Bot },
      { href: "/groups", label: "Groups", description: "Shared multi-agent conversations", icon: Users },
    ],
  },
  {
    id: "build",
    label: "Build",
    description: "Design, workflow, and experiment surfaces.",
    accent: "var(--accent-violet)",
    icon: Hammer,
    items: [
      { href: "/templates", label: "Templates", description: "Reusable conversation and routing blueprints", icon: FileText },
      { href: "/workflows", label: "Workflows", description: "Agent workflow builder and orchestration", icon: Workflow },
      { href: "/playground", label: "Playground", description: "Prompt and response experimentation", icon: FlaskConical },
      { href: "/personas", label: "Personas", description: "Agent voice and persona controls", icon: Brain },
    ],
  },
  {
    id: "intelligence",
    label: "Knowledge",
    description: "Memory, knowledge, and evaluation lanes.",
    accent: "var(--accent-cyan)",
    icon: BookOpen,
    items: [
      { href: "/knowledge", label: "Knowledge", description: "Knowledge bases and attached documents", icon: BookOpen },
      { href: "/memory", label: "Memory", description: "Shared memory and recall surfaces", icon: Brain },
      { href: "/insights", label: "Insights", description: "Derived observations and summaries", icon: Lightbulb },
      { href: "/arena", label: "Arena", description: "Head-to-head comparisons and evaluations", icon: Swords },
    ],
  },
  {
    id: "automation",
    label: "Automation",
    description: "Background work, triggers, and integrations.",
    accent: "var(--accent-amber)",
    icon: Waypoints,
    items: [
      { href: "/scheduled-tasks", label: "Scheduled Tasks", description: "Cron-driven and recurring runs", icon: Clock3 },
      { href: "/webhooks", label: "Webhooks", description: "Incoming triggers and event endpoints", icon: Waypoints },
      { href: "/integrations", label: "Integrations", description: "External systems and service links", icon: Plug },
      { href: "/api-keys", label: "API Keys", description: "Credentials for external access and automations", icon: KeyRound },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    description: "Monitoring, traces, and network-wide health.",
    accent: "var(--accent-emerald)",
    icon: Network,
    items: [
      { href: "/analytics", label: "Analytics", description: "Usage, throughput, and performance metrics", icon: BarChart3 },
      { href: "/fleet", label: "Fleet", description: "System-wide agent overview", icon: Network },
      { href: "/monitoring", label: "Monitoring", description: "Runtime status and operational watch", icon: Activity },
      { href: "/traces", label: "Traces", description: "Detailed execution traces and audits", icon: ScanSearch },
    ],
  },
  {
    id: "security",
    label: "Safety",
    description: "Governance, guardrails, and policy surfaces.",
    accent: "var(--accent-rose)",
    icon: Shield,
    items: [
      { href: "/guardrails", label: "Guardrails", description: "Behavioral rules and safety rails", icon: Shield },
      { href: "/policies", label: "Policies", description: "Operational and governance policy rules", icon: FileText },
      { href: "/a2a", label: "A2A", description: "Agent-to-agent surfaces and protocol view", icon: Globe },
      { href: "/admin", label: "Admin", description: "Backend and platform-level controls", icon: Layers3 },
    ],
  },
  {
    id: "settings",
    label: "Workspace",
    description: "Preferences and canonical settings surfaces.",
    accent: "var(--theme-accent)",
    icon: Settings2,
    items: [
      { href: "/settings", label: "Settings", description: "Workspace preferences and runtime visuals", icon: Settings2 },
    ],
  },
];

export const SIDEBAR_CONTROL_ITEM_MAP = new Map(
  SIDEBAR_CONTROL_GROUPS.flatMap((group) =>
    group.items.map((item) => [item.href, item] as const),
  ),
);

export const DEFAULT_CONTROL_GROUP_CONFIG: NavGroupConfig[] = SIDEBAR_CONTROL_GROUPS.map((group) => ({
  id: group.id,
  label: group.label,
  collapsed: false,
  items: group.items.map((item) => ({
    href: item.href,
    label: item.label,
    visible: true,
  })),
}));

export function isSidebarRouteActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
