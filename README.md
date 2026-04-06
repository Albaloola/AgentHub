# AgentHub

A multi-agent orchestration dashboard for connecting to, chatting with, and managing autonomous AI agents through their independent gateways.

AgentHub is a **pure presentation and routing layer**. It does not run models, manage LLM API keys, or handle inference. It connects to agent gateways (Hermes, OpenClaw, or any adapter-compatible system), routes messages, and displays results in a unified interface.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app seeds itself with a **Hermes** agent (localhost:8080), an **OpenClaw** agent (localhost:8090), and a **Mock Echo Bot** for testing.

### Docker

```bash
docker compose up
```

## Features

### Chat and Communication
- **Unified Chat** with SSE streaming, markdown rendering, syntax-highlighted code blocks with line numbers, copy button, and collapsible long outputs
- **Message Editing** on user messages with inline editor and automatic re-send
- **Message Regeneration** on agent messages with retry button
- **Group Chat** with discussion (sequential), parallel, or targeted response modes
- **Agent Handoff Protocol** for seamless agent-to-agent task transfer within conversations
- **Message Threading** for Slack-style replies to specific messages
- **Message Pinning** to preserve important messages during context compaction
- **Message Voting** (thumbs up/down) for feedback collection
- **File Attachments** with drag-and-drop upload and gateway-specific handling
- **Commands Menu** per gateway, triggered with `/`
- **Behavior Modes** per conversation: default, debug, creative, concise, teaching, production

### Agent Management
- **Agent CRUD** with adapter protocol (Hermes, OpenClaw, OpenAI-compatible, WebSocket, Mock)
- **Personas Library** with 9 categories (engineering, devops, research, creative, QA, security, data, management, general) and apply-to-agent functionality
- **Capability Weights** per agent for intelligent routing based on message content
- **Fallback Chains** defining backup agents when primaries are down
- **Adaptive Timeouts** that learn from agent response time history
- **Agent Versioning** with canary traffic splitting for safe rollouts
- **Health Checks** with latency tracking and availability toggling
- **Agent Fleet Dashboard** showing all agents with health scores, sparkline latency, anomaly timeline, and fallback relationship map

### Observability and Tracing
- **Trace Viewer** with span waterfall visualization (color-coded by type: routing, adapter, tool call, subagent, response, guardrail)
- **Extended Thinking Panel** showing agent reasoning (toggleable, Anthropic-style)
- **Subagent Tree** visualizing hierarchical agent spawning
- **Tool Call Inspection** sidebar with input/output JSON for every tool invocation
- **Performance Snapshots** recorded after every agent response for degradation detection
- **Anomaly Detection** with severity levels (info, warning, critical) and resolve toggle

### Prompt Engineering
- **Prompt Playground** with split-pane editor and streaming response viewer
- **Prompt Versioning** with version history, environment labels (dev/staging/production), and one-click activation
- **Prompt Diff** view for comparing versions side by side

### Knowledge and Memory
- **Knowledge Base** with document upload (TXT, MD, PDF, JSON, CSV), automatic chunking, and management UI
- **Shared Memory** as a cross-agent knowledge store with categories, confidence scores, expiry, and access tracking
- **Smart Context Management** with conversation compaction, message pinning, and automatic pruning
- **Conversation Checkpoints** for save/revert/fork with timeline visualization

### Automation and Integration
- **Webhooks** with configurable triggers, rate limiting, event logs, and body transformation
- **Scheduled Tasks** with cron expressions, manual run, and status tracking
- **External API** with key management (SHA-256 hashing), rate limiting, and programmatic agent messaging
- **Native Integrations** panel supporting GitHub, GitLab, Jira, Slack, Discord, Telegram, Email, and custom endpoints
- **A2A Protocol** support with Agent Card publishing for cross-platform agent discovery

### Analytics and Insights
- **Analytics Dashboard** with agent performance tables, token distribution charts, and status overview
- **Topic Clustering** for understanding what agents are being used for
- **Agent Feedback Loop** aggregating positive/negative votes per agent per topic
- **Cost Tracking** per token, per request, and per conversation

### Evaluation and Quality
- **Arena** for head-to-head agent comparison with voting and leaderboard
- **Response Caching** with content hashing and TTL for deduplication

### Security and Governance
- **Guardrails** with 5 rule types (content filter, PII detection, injection detection, length limit, custom regex) and 4 actions (block, warn, redact, log)
- **Runtime Policy Enforcement** with action filters, data access controls, rate limits, tool restrictions, and output filters
- **Audit Log** with immutable records of all system actions
- **Users and RBAC** with admin, operator, and viewer roles
- **Ghost Mode** for observing conversations without triggering agent responses

### UI and Experience
- **25-item Sidebar** with conversation folders (create, expand/collapse, grouping)
- **Chat Tabs** for managing multiple conversations
- **Command Palette** (Ctrl+K) for quick navigation
- **Keyboard Shortcuts** with chord navigation (press `?` for help overlay, `g` then a letter to navigate)
- **Notification Center** with bell icon, unread count, and type-based icons
- **Theme Engine** with 6 presets, accent color picker, density settings, border radius, and custom CSS
- **Onboarding Wizard** for first-time users (5-step guided setup)
- **Artifacts Panel** that auto-detects HTML/SVG/JSX in agent responses and renders in a sandboxed iframe
- **Visual Workflow Builder** with drag-and-drop node canvas (agent, condition, delay, output nodes)
- **Conversation Branching** with fork and export (Markdown, JSON, HTML)
- **Global Search** across all conversations
- **Dark Theme** with professional styling, mobile responsive

## Architecture

```
External Events (GitHub, Jira, Webhooks, Cron, API calls)
                    |
                    v
    +-------------------------------+
    |     AgentHub Control Plane     |
    |                               |
    |  Routing  |  Guardrails       |
    |  Tracing  |  Knowledge        |
    |  Memory   |  Scheduling       |
    |  Cost     |  Policies         |
    +-------------------------------+
        |          |          |
        v          v          v
    +------+   +------+   +------+
    |Hermes|   |OpenCl|   |Agent | ...
    +------+   +------+   +------+
        |          |          |
        v          v          v
    (Independent gateways running
     their own models and inference)
```

### Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack) + TypeScript (strict)
- **Styling:** Tailwind CSS 4 + shadcn/ui (@base-ui/react primitives)
- **State:** Zustand
- **Database:** SQLite + better-sqlite3 (WAL mode, globalThis cached)
- **Streaming:** Server-Sent Events (SSE) for real-time chat
- **Rendering:** React Markdown + remark-gfm + react-syntax-highlighter (Prism, One Dark)
- **Icons:** Lucide React

### Project Structure

```
src/
├── app/
│   ├── (dashboard)/                # Route group with shared layout
│   │   ├── page.tsx                # Dashboard with stats and quick-chat
│   │   ├── layout.tsx              # Sidebar + tabs + notifications + shortcuts
│   │   ├── agents/                 # Agent management and detail pages
│   │   ├── chat/[id]/             # Chat interface with streaming
│   │   ├── groups/                 # Group chat creation
│   │   ├── personas/               # Persona library and apply-to-agent
│   │   ├── templates/              # Reusable conversation configurations
│   │   ├── workflows/              # Visual drag-and-drop pipeline builder
│   │   ├── arena/                  # Head-to-head agent comparison
│   │   ├── memory/                 # Cross-agent shared knowledge base
│   │   ├── knowledge/              # Document upload and RAG management
│   │   ├── playground/             # Prompt editor with streaming test
│   │   ├── webhooks/               # Webhook management and event logs
│   │   ├── integrations/           # Native service integrations
│   │   ├── scheduled-tasks/        # Cron-based agent task automation
│   │   ├── analytics/              # Performance metrics and token usage
│   │   ├── insights/               # Topics, feedback, and anomaly detection
│   │   ├── fleet/                  # Agent fleet health dashboard
│   │   ├── traces/                 # Execution trace viewer with span waterfall
│   │   ├── guardrails/             # Content filter and safety rules
│   │   ├── policies/               # Runtime policy enforcement
│   │   ├── a2a/                    # A2A protocol agent card publishing
│   │   ├── monitoring/             # Real-time agent status
│   │   ├── api-keys/               # External API key management
│   │   ├── admin/                  # Users, audit log, system config
│   │   ├── search/                 # Global search across conversations
│   │   └── settings/               # App configuration and export/import
│   └── api/                        # 81 API route files
│       ├── agents/                 # CRUD, health, behavior, routing, persona, versions
│       ├── conversations/          # CRUD, branch, checkpoints, compact, export, reset
│       ├── messages/               # Retrieval, editing, pinning, voting
│       ├── chat/                   # SSE streaming with multi-agent routing
│       ├── templates/              # Template CRUD
│       ├── workflows/              # Workflow CRUD
│       ├── arena/                  # Arena rounds, voting, leaderboard
│       ├── memory/                 # Shared memory CRUD
│       ├── knowledge/              # Knowledge bases and document chunking
│       ├── prompts/                # Prompt version management
│       ├── webhooks/               # Webhook CRUD, trigger, events
│       ├── integrations/           # Integration CRUD
│       ├── scheduled-tasks/        # Task CRUD and manual run
│       ├── notifications/          # Notification CRUD and mark-read
│       ├── traces/                 # Execution trace retrieval
│       ├── guardrails/             # Guardrail rule CRUD
│       ├── policies/               # Policy rule CRUD
│       ├── a2a/                    # A2A agent card CRUD
│       ├── users/                  # User CRUD for RBAC
│       ├── audit/                  # Audit log retrieval
│       ├── threads/                # Message thread replies
│       ├── topics/                 # Topic cluster listing
│       ├── feedback/               # Agent feedback insights
│       ├── anomalies/              # Anomaly event management
│       ├── folders/                # Conversation folder CRUD
│       ├── theme/                  # Theme preference management
│       ├── onboarding/             # Onboarding state tracking
│       ├── external/               # External API (keys, agent messaging)
│       ├── tags/                   # Conversation tags
│       ├── settings/               # Key-value settings
│       └── upload/                 # File upload handler
├── components/
│   ├── chat/                       # Message bubble, input, header, tools,
│   │                               # thinking panel, subagent tree, artifacts,
│   │                               # checkpoints, behavior modes, handoff, tabs
│   ├── agents/                     # Agent create/edit dialog
│   ├── conversation/               # Conversation actions (branch, export, pin)
│   ├── layout/                     # Sidebar with folders, theme provider
│   ├── search/                     # Global search, command palette
│   ├── notifications/              # Notification center dropdown
│   ├── onboarding/                 # Onboarding wizard modal
│   ├── theme/                      # Theme customizer with presets
│   ├── shortcuts/                  # Keyboard shortcuts system
│   └── ui/                         # 18 shadcn/ui base components
└── lib/
    ├── adapters/                   # Gateway adapter implementations
    │   ├── base.ts                 # GatewayAdapter interface + registry
    │   ├── hermes.ts               # Hermes gateway adapter
    │   ├── openclaw.ts             # OpenClaw gateway adapter
    │   ├── openai-compat.ts        # OpenAI-compatible adapter
    │   ├── websocket-adapter.ts    # WebSocket adapter
    │   └── mock.ts                 # Mock echo bot for testing
    ├── api.ts                      # Client-side API wrapper (80+ functions)
    ├── db.ts                       # SQLite schema (52 tables) + migrations + seeding
    ├── store.ts                    # Zustand state management (30+ state sections)
    ├── types.ts                    # TypeScript interfaces (50+ types)
    ├── hooks.ts                    # Utility hooks
    └── utils.ts                    # cn(), getInitials(), getAvatarColor(), timeAgo()
```

### Adapter Protocol

AgentHub communicates with agent gateways using a streaming protocol:

```typescript
// What AgentHub sends:
interface AgentMessage {
  conversation_id: string;
  content: string;
  history: { role: "user" | "assistant"; content: string; agent_id?: string }[];
  metadata?: { group_mode?: boolean; other_agents?: string[] };
}

// What gateways stream back (SSE events):
interface AgentResponseChunk {
  type: "content" | "tool_call" | "tool_result" | "error" | "done"
      | "thinking" | "thinking_end"
      | "subagent_spawned" | "subagent_completed" | "subagent_failed"
      | "handoff" | "agent_start";
  content?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: Record<string, unknown>;
  thinking?: string;
  subagent_id?: string;
  subagent_goal?: string;
  error?: string;
}
```

### Developing a New Adapter

1. Create a new file in `src/lib/adapters/`
2. Implement the `GatewayAdapter` interface (`sendMessage` as an async generator + `healthCheck`)
3. Register it with `registerAdapter()` in `src/lib/adapters/index.ts`

### Database

52 tables organized across the feature set:

**Core:** agents, conversations, conversation_agents, messages, tool_calls, attachments, subagents, tags, conversation_tags, settings

**Templates and Workflows:** templates, template_agents, workflows, workflow_runs

**Advanced Chat:** checkpoints, whiteboards, response_votes, message_threads, conversation_folders

**Knowledge:** knowledge_bases, documents, document_chunks, shared_memory, personas

**Automation:** webhooks, webhook_events, scheduled_tasks, api_keys, integrations

**Analytics:** performance_snapshots, traces, routing_log, arena_rounds, topic_clusters, conversation_topics, feedback_insights, anomaly_events

**Governance:** guardrail_rules, policy_rules, notifications, notification_rules, audit_log, a2a_agent_cards, agent_versions

**Users and Settings:** users, conversation_permissions, theme_preferences, custom_shortcuts, onboarding_state

## Configuration

| Variable | Description |
|----------|-------------|
| `DATABASE_PATH` | SQLite database path (default: `./data/agenthub.db`) |

## Project Stats

| Metric | Count |
|--------|-------|
| Pages | 27 |
| API Routes | 81 |
| Components | 43 |
| Database Tables | 52 |
| Source Files | 166 |
| Lines of Code | ~25,000 |

## License

Apache License 2.0
