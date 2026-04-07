"use client";

import { create } from "zustand";
import type {
  Agent,
  AgentWithStatus,
  Conversation,
  ConversationWithDetails,
  MessageWithToolCalls,
  ToolCall,
  Subagent,
  Tag,
  Template,
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  Whiteboard,
  Checkpoint,
  Webhook,
  ArenaRound,
  SharedMemoryEntry,
  ScheduledTask,
  Notification,
  BehaviorMode,
  ConversationFolder,
  GuardrailRule,
  Trace,
  PromptVersion,
  KnowledgeBase,
} from "./types";

interface AppState {
  // Agents
  agents: AgentWithStatus[];
  setAgents: (agents: AgentWithStatus[]) => void;
  updateAgentStatus: (id: string, status: AgentWithStatus["status"], latency_ms?: number) => void;

  // Conversations
  conversations: ConversationWithDetails[];
  setConversations: (conversations: ConversationWithDetails[]) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  // Messages
  messages: MessageWithToolCalls[];
  setMessages: (messages: MessageWithToolCalls[]) => void;
  appendMessage: (message: MessageWithToolCalls) => void;
  updateLastAssistantMessage: (content: string) => void;
  appendToolCall: (messageId: string, toolCall: ToolCall) => void;
  updateToolCall: (messageId: string, toolCallId: string, updates: Partial<ToolCall>) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toolPanelOpen: boolean;
  setToolPanelOpen: (open: boolean) => void;
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  streamingAgentId: string | null;
  setStreamingAgentId: (id: string | null) => void;

  // Thinking Panel
  thinkingContent: string;
  thinkingComplete: boolean;
  setThinkingContent: (content: string, isComplete?: boolean) => void;

  // Subagent Tree
  subagents: Subagent[];
  addSubagent: (subagent: Subagent) => void;
  updateSubagent: (id: string, updates: Partial<Subagent>) => void;
  clearSubagents: () => void;

  // Tabs
  openTabs: { id: string; conversationId: string; title: string }[];
  activeTabId: string | null;
  setOpenTabs: (tabs: { id: string; conversationId: string; title: string }[]) => void;
  addTab: (tab: { id: string; conversationId: string; title: string }) => void;
  removeTab: (tabId: string) => void;
  setActiveTabId: (id: string | null) => void;

  // Tags
  tags: Tag[];
  setTags: (tags: Tag[]) => void;
  addTag: (tag: Tag) => void;

  // Templates
  templates: Template[];
  setTemplates: (templates: Template[]) => void;

  // Workflows
  workflows: Workflow[];
  setWorkflows: (workflows: Workflow[]) => void;
  activeWorkflow: Workflow | null;
  setActiveWorkflow: (wf: Workflow | null) => void;
  workflowNodes: WorkflowNode[];
  setWorkflowNodes: (nodes: WorkflowNode[]) => void;
  workflowEdges: WorkflowEdge[];
  setWorkflowEdges: (edges: WorkflowEdge[]) => void;

  // Whiteboard
  whiteboard: Whiteboard | null;
  setWhiteboard: (wb: Whiteboard | null) => void;

  // Analytics
  analytics: {
    totalTokens: number;
    totalMessages: number;
    avgResponseTime: number;
    agentStats: { agent_id: string; agent_name: string; messages: number; tokens: number; avg_time: number; errors: number }[];
  } | null;
  setAnalytics: (a: AppState["analytics"]) => void;

  // Checkpoints
  checkpoints: Checkpoint[];
  setCheckpoints: (c: Checkpoint[]) => void;

  // Webhooks
  webhooks: Webhook[];
  setWebhooks: (w: Webhook[]) => void;

  // Arena
  arenaRounds: ArenaRound[];
  setArenaRounds: (r: ArenaRound[]) => void;

  // Shared Memory
  sharedMemory: SharedMemoryEntry[];
  setSharedMemory: (m: SharedMemoryEntry[]) => void;

  // Scheduled Tasks
  scheduledTasks: ScheduledTask[];
  setScheduledTasks: (t: ScheduledTask[]) => void;

  // Notifications
  notifications: Notification[];
  setNotifications: (n: Notification[]) => void;
  unreadCount: number;
  setUnreadCount: (n: number) => void;

  // Behavior Mode
  activeBehaviorMode: BehaviorMode;
  setActiveBehaviorMode: (m: BehaviorMode) => void;

  // Folders
  folders: ConversationFolder[];
  setFolders: (f: ConversationFolder[]) => void;

  // Guardrails
  guardrailRules: GuardrailRule[];
  setGuardrailRules: (r: GuardrailRule[]) => void;

  // Traces
  traces: Trace[];
  setTraces: (t: Trace[]) => void;

  // Prompt Versions
  promptVersions: PromptVersion[];
  setPromptVersions: (p: PromptVersion[]) => void;

  // Knowledge Bases
  knowledgeBases: KnowledgeBase[];
  setKnowledgeBases: (k: KnowledgeBase[]) => void;

  // Editing
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;

  // Generation status
  generationStatus: "idle" | "generating" | "queued" | "no_response" | "done";
  setGenerationStatus: (s: "idle" | "generating" | "queued" | "no_response" | "done") => void;

  // Auto-approve agent permissions
  autoApprove: boolean;
  setAutoApprove: (v: boolean) => void;

  // Thinking timestamp (for "Thought for Xs")
  thinkingStartTime: number | null;
  setThinkingStartTime: (t: number | null) => void;

  // UI Preferences (persisted)
  uiPrefs: {
    density: "compact" | "comfortable" | "spacious";
    fontSize: number;
    zoom: number;
    fontFamily: string;
    sidebarCollapsed: boolean;
    ambientBackground: boolean;
    animationsEnabled: boolean;
    showStarfield: boolean;
    showMeteors: boolean;
    showAmbientGlow: boolean;
    navStyle: "pills" | "list";
    theme: string;
    accentColor: string;
    showTimestamps: boolean;
    showAvatars: boolean;
    markdownEnabled: boolean;
    autoScroll: boolean;
    notificationsEnabled: boolean;
    soundEffects: boolean;
    glowColor: string;
    agentGlowColor: string;
    glowIntensity: number;
    glowSpread: number;
  };
  setUiPref: <K extends keyof AppState["uiPrefs"]>(key: K, value: AppState["uiPrefs"][K]) => void;
  resetUiPrefs: () => void;
}

const DEFAULT_UI_PREFS: AppState["uiPrefs"] = {
  density: "spacious",
  fontSize: 16,
  zoom: 100,
  fontFamily: "geist",
  sidebarCollapsed: false,
  ambientBackground: true,
  animationsEnabled: true,
  showStarfield: true,
  showMeteors: true,
  showAmbientGlow: true,
  navStyle: "pills",
  theme: "dark",
  accentColor: "blue-violet",
  showTimestamps: true,
  showAvatars: true,
  markdownEnabled: true,
  autoScroll: true,
  notificationsEnabled: true,
  soundEffects: false,
  glowColor: "rgba(59,130,246,0.3)",
  agentGlowColor: "rgba(16,185,129,0.3)",
  glowIntensity: 0.5,
  glowSpread: 20,
};

function loadUiPrefs(): AppState["uiPrefs"] {
  try {
    const stored = localStorage.getItem("agenthub-ui-prefs-v4");
    if (stored) {
      return { ...DEFAULT_UI_PREFS, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...DEFAULT_UI_PREFS };
}

function saveUiPrefs(prefs: AppState["uiPrefs"]) {
  try {
    localStorage.setItem("agenthub-ui-prefs-v4", JSON.stringify(prefs));
  } catch {}
}

export const useStore = create<AppState>((set) => ({
  // Agents
  agents: [],
  setAgents: (agents) => set({ agents }),
  updateAgentStatus: (id, status, latency_ms) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, status, latency_ms: latency_ms ?? a.latency_ms } : a,
      ),
    })),

  // Conversations
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),

  // Messages
  messages: [],
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateLastAssistantMessage: (content) =>
    set((state) => {
      const msgs = [...state.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].sender_agent_id !== null) {
          msgs[i] = { ...msgs[i], content };
          break;
        }
      }
      return { messages: msgs };
    }),
  appendToolCall: (messageId, toolCall) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? { ...m, tool_calls: [...m.tool_calls, toolCall] }
          : m,
      ),
    })),
  updateToolCall: (messageId, toolCallId, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              tool_calls: m.tool_calls.map((tc) =>
                tc.id === toolCallId ? { ...tc, ...updates } : tc,
              ),
            }
          : m,
      ),
    })),

  // UI State
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toolPanelOpen: false,
  setToolPanelOpen: (open) => set({ toolPanelOpen: open }),
  isStreaming: false,
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  streamingAgentId: null,
  setStreamingAgentId: (id) => set({ streamingAgentId: id }),

  // Thinking Panel
  thinkingContent: "",
  thinkingComplete: false,
  setThinkingContent: (content, isComplete) =>
    set((state) => ({
      thinkingContent: state.thinkingContent + content,
      thinkingComplete: isComplete ?? state.thinkingComplete,
    })),

  // Subagent Tree
  subagents: [],
  addSubagent: (subagent) =>
    set((state) => ({ subagents: [...state.subagents, subagent] })),
  updateSubagent: (id, updates) =>
    set((state) => ({
      subagents: state.subagents.map((s) =>
        s.id === id ? { ...s, ...updates } : s,
      ),
    })),
  clearSubagents: () => set({ subagents: [] }),

  // Tabs
  openTabs: [],
  activeTabId: null,
  setOpenTabs: (tabs) => set({ openTabs: tabs }),
  addTab: (tab) =>
    set((state) => {
      const exists = state.openTabs.find((t) => t.conversationId === tab.conversationId);
      if (exists) return { openTabs: state.openTabs, activeTabId: exists.id };
      const newTabs = [...state.openTabs, tab];
      return { openTabs: newTabs, activeTabId: tab.id };
    }),
  removeTab: (tabId) =>
    set((state) => {
      const newTabs = state.openTabs.filter((t) => t.id !== tabId);
      const newActive =
        state.activeTabId === tabId
          ? newTabs.length > 0
            ? newTabs[newTabs.length - 1].id
            : null
          : state.activeTabId;
      return { openTabs: newTabs, activeTabId: newActive };
    }),
  setActiveTabId: (id) => set({ activeTabId: id }),

  // Tags
  tags: [],
  setTags: (tags) => set({ tags }),
  addTag: (tag) => set((state) => ({ tags: [...state.tags, tag] })),

  // Templates
  templates: [],
  setTemplates: (templates) => set({ templates }),

  // Workflows
  workflows: [],
  setWorkflows: (workflows) => set({ workflows }),
  activeWorkflow: null,
  setActiveWorkflow: (wf) => set({ activeWorkflow: wf }),
  workflowNodes: [],
  setWorkflowNodes: (nodes) => set({ workflowNodes: nodes }),
  workflowEdges: [],
  setWorkflowEdges: (edges) => set({ workflowEdges: edges }),

  // Whiteboard
  whiteboard: null,
  setWhiteboard: (wb) => set({ whiteboard: wb }),

  // Analytics
  analytics: null,
  setAnalytics: (a) => set({ analytics: a }),

  // Checkpoints
  checkpoints: [],
  setCheckpoints: (c) => set({ checkpoints: c }),

  // Webhooks
  webhooks: [],
  setWebhooks: (w) => set({ webhooks: w }),

  // Arena
  arenaRounds: [],
  setArenaRounds: (r) => set({ arenaRounds: r }),

  // Shared Memory
  sharedMemory: [],
  setSharedMemory: (m) => set({ sharedMemory: m }),

  // Scheduled Tasks
  scheduledTasks: [],
  setScheduledTasks: (t) => set({ scheduledTasks: t }),

  // Notifications
  notifications: [],
  setNotifications: (n) => set({ notifications: n }),
  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: n }),

  // Behavior Mode
  activeBehaviorMode: "default",
  setActiveBehaviorMode: (m) => set({ activeBehaviorMode: m }),

  // Folders
  folders: [],
  setFolders: (f) => set({ folders: f }),

  // Guardrails
  guardrailRules: [],
  setGuardrailRules: (r) => set({ guardrailRules: r }),

  // Traces
  traces: [],
  setTraces: (t) => set({ traces: t }),

  // Prompt Versions
  promptVersions: [],
  setPromptVersions: (p) => set({ promptVersions: p }),

  // Knowledge Bases
  knowledgeBases: [],
  setKnowledgeBases: (k) => set({ knowledgeBases: k }),

  // Editing
  editingMessageId: null,
  setEditingMessageId: (id) => set({ editingMessageId: id }),

  generationStatus: "idle",
  setGenerationStatus: (s) => set({ generationStatus: s }),

  autoApprove: false,
  setAutoApprove: (v) => set({ autoApprove: v }),

  thinkingStartTime: null,
  setThinkingStartTime: (t) => set({ thinkingStartTime: t }),

  // UI Preferences
  uiPrefs: loadUiPrefs(),
  setUiPref: (key, value) =>
    set((state) => {
      const next = { ...state.uiPrefs, [key]: value };
      saveUiPrefs(next);
      return { uiPrefs: next };
    }),
  resetUiPrefs: () => {
    saveUiPrefs(DEFAULT_UI_PREFS);
    set({ uiPrefs: { ...DEFAULT_UI_PREFS } });
  },
}));
