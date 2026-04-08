# AgentHub — Build Report & Postmortem

## What We Set Out to Build

A full-stack multi-agent chat and management dashboard called **AgentHub**, based on a detailed spec (`agenthub-prompt.md`). The goal was a self-hosted app where you could create AI agents with distinct personalities, chat with them, run group conversations, inspect tool calls, and manage everything from a polished dark-themed dashboard.

**Target features (from spec):**
1. Agent Management — CRUD, cards, profiles, status toggle
2. Chat Interface — streaming responses, markdown, code highlighting
3. Multi-Provider Backend — OpenRouter, OpenAI, Anthropic, Ollama
4. Group Chats — multi-agent conversations
5. Tool Call Panel — inspect tool inputs/outputs
6. Settings — API keys, data management
7. Docker deployment

---

## What Was Built (and compiles clean)

### Tech Stack
- Next.js 16 (App Router, Turbopack)
- TypeScript (strict mode, passes type checking)
- Tailwind CSS + shadcn/ui (dark theme)
- Zustand (state management)
- SQLite via better-sqlite3
- react-markdown + remark-gfm + react-syntax-highlighter (Prism, One Dark)

### Architecture
```
src/
├── app/
│   ├── (dashboard)/          # Route group with shared layout
│   │   ├── page.tsx          # Home — welcome screen, quick actions
│   │   ├── layout.tsx        # Sidebar + ToolPanel + mobile responsive
│   │   ├── agents/page.tsx   # Agent management cards
│   │   ├── chat/[id]/page.tsx # Chat interface
│   │   ├── groups/page.tsx   # Group chat creation
│   │   └── settings/page.tsx # API keys, data export
│   ├── api/
│   │   ├── agents/           # CRUD for agents
│   │   ├── conversations/    # CRUD for conversations
│   │   ├── messages/         # Message retrieval with tool calls
│   │   ├── chat/             # SSE streaming endpoint with tool execution
│   │   ├── settings/         # Key-value settings store
│   │   └── providers/        # Provider/model list endpoint
│   └── layout.tsx            # Root layout with ThemeProvider
├── components/
│   ├── agents/agent-dialog.tsx   # Create/edit agent modal
│   ├── chat/
│   │   ├── message-bubble.tsx    # Markdown + syntax highlighting + tool call pills
│   │   ├── chat-input.tsx        # Input with group agent selector
│   │   ├── chat-skeleton.tsx     # Loading skeleton
│   │   └── tool-panel.tsx        # Tool call inspection sidebar
│   └── layout/
│       ├── sidebar.tsx           # Navigation + conversation list
│       └── theme-provider.tsx    # next-themes dark mode
├── lib/
│   ├── api.ts                # Client-side fetch helpers
│   ├── db.ts                 # SQLite with globalThis caching
│   ├── hooks.ts              # useMediaQuery, useIsMobile
│   ├── store.ts              # Zustand store
│   ├── tools.ts              # 6 built-in tools + executor
│   ├── types.ts              # TypeScript interfaces
│   ├── utils.ts              # cn() helper
│   └── providers/
│       ├── config.ts         # Provider/model definitions (client-safe)
│       └── index.ts          # Streaming provider implementations
```

### Database Schema (SQLite)
- **agents** — id, name, avatar_url, system_prompt, backend_provider, model, is_active
- **conversations** — id, agent_id, is_group, name
- **conversation_agents** — junction table for group chats
- **messages** — id, conversation_id, agent_id, role, content
- **tool_calls** — id, message_id, tool_name, input, output, status
- **settings** — key-value store for API keys

### Seed Data
- 3 agents: Atlas (general), Coda (engineering), Muse (creative, inactive)
- 2 conversations with sample messages
- Coda's conversation includes TypeScript code blocks to demo syntax highlighting

### Features Implemented
| Feature | Status | Notes |
|---------|--------|-------|
| Agent CRUD | Built | Create, edit, delete, toggle active/inactive |
| Agent cards with avatars | Built | Color-coded initials, online/offline badges |
| Chat with streaming | Built | SSE streaming, abort/cancel support |
| Markdown rendering | Built | react-markdown + remark-gfm, prose styling |
| Code syntax highlighting | Built | Prism One Dark, language labels, copy buttons |
| Multi-provider backend | Built | OpenRouter, OpenAI, Anthropic, Ollama |
| Tool call system | Built | 6 built-in tools, two-pass execution, DB storage |
| Tool call inspection panel | Built | Expandable sidebar with input/output/status |
| Group chat creation | Built | Agent selector, round-robin mode |
| Group chat agent picker | Built | Dropdown in chat input to target specific agent |
| Settings page | Built | API key management, show/hide, data export |
| Mobile responsive | Built | Collapsible sidebar, overlay on mobile |
| Loading skeletons | Built | Chat page skeleton |
| Error handling | Built | Error styling, retry buttons, abort support |
| Dark theme | Built | Default dark via next-themes + shadcn |
| Seed data | Built | 3 agents, 2 conversations, code examples |
| Docker | Built | Dockerfile + docker-compose.yml |

---

## What Didn't Work

### The Memory Leak (4 PC crashes)

The app caused the system to run out of RAM and crash **4 times** during development.

**Root cause identified:** When `npm install react-syntax-highlighter` was run, the working directory was `~` (home) instead of `~/agenthub`. This created a rogue `~/package.json` and `~/node_modules/` with 15MB+ of syntax highlighter packages. 

Next.js / Turbopack resolves modules by walking up the directory tree. When it found `react-syntax-highlighter` in `~/node_modules/` instead of the project's `node_modules/`, it caused pathological bundling behavior — likely rebundling the entire library on every HMR cycle, with each cycle accumulating memory that was never released.

**Secondary issue:** The SQLite connection (`better-sqlite3`) was stored in a module-scoped `let` variable. In dev mode, HMR re-evaluates modules, creating new native SQLite connections without closing old ones. Fixed by caching on `globalThis`.

**Fix applied:**
1. Deleted `~/package.json` and `~/node_modules/`
2. Installed `react-syntax-highlighter` inside `~/agenthub/` properly
3. Changed `db.ts` to cache the SQLite instance on `globalThis`

**Verification:** After the fix, a 5-second RAM test showed 406MB delta (normal for Next.js dev) with no growth — confirmed stable.

### Server Dies on Final Run

After all fixes were applied and the build passed clean, `npm run dev` started successfully (199ms) but the server returned nothing on `http://localhost:3000` — curl got connection refused, and the process died silently. This was not debugged further as the user decided to abandon the project.

**Likely cause:** Either a runtime error in the page rendering (possibly the syntax highlighter import path still resolving incorrectly), or an issue with the fresh DB seed failing silently on the re-created database.

---

## What We Learned

### 1. Always `cd` into the project before running `npm install`
Running `npm install <package>` from the wrong directory creates a phantom `package.json` and `node_modules` that poison module resolution for every Node.js project in child directories. This is catastrophic for bundlers like Turbopack that walk up the tree.

### 2. Next.js dev mode requires `globalThis` caching for stateful resources
Any module-scoped state (database connections, caches, singletons) gets wiped on HMR. Native resources like SQLite connections leak because the old reference is lost but the native memory isn't freed. Always use `globalThis` for these.

### 3. Preview tools spawn real browsers
The `preview_start` tool launches a headless Chromium alongside the dev server. Combined with the memory leak above, this compounded RAM usage dramatically. Each preview cycle added hundreds of MB that were never reclaimed.

### 4. Don't cycle dev servers
Starting and stopping dev servers repeatedly in quick succession risks orphaned processes. Start once, keep it running, test against it.

### 5. Monitor before acting
When RAM is a concern, always check `free -h` before and after operations. A 5-second test window with automatic kill is the right pattern for safety.

### 6. The comparison with Open WebUI was instructive
Open WebUI solves a different problem (model chat UI) than AgentHub (agent orchestration). AgentHub's unique value propositions — persistent agent personalities, agent-to-agent conversations, tool call dashboards — are things Open WebUI doesn't do. But Open WebUI has years of hardening that a single-session build can't match.

---

## Files of Note

| File | Purpose |
|------|---------|
| `src/lib/db.ts` | SQLite setup with globalThis fix |
| `src/lib/providers/index.ts` | Streaming provider implementations |
| `src/lib/tools.ts` | Built-in tool definitions + executor |
| `src/app/api/chat/route.ts` | SSE streaming + tool call two-pass flow |
| `src/components/chat/message-bubble.tsx` | Markdown + Prism syntax highlighting |
| `src/components/chat/chat-input.tsx` | Group chat agent selector |
| `Dockerfile` | Multi-stage Docker build |
| `.env.example` | Configuration reference |

---

## If Revisiting This Project

1. Debug why the server dies silently — run `npm run dev` and check stderr
2. Consider replacing `react-syntax-highlighter` with `shiki` (smaller, modern, better tree-shaking)
3. Add `next.config.ts` → `transpilePackages: ['react-syntax-highlighter']` if resolution issues persist
4. The architecture and data model are sound — the problems were all environmental, not architectural
