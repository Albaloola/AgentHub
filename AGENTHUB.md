# AgentHub

Multi-agent dashboard for connecting to, chatting with, and orchestrating autonomous AI agents via gateway adapters.

## Key Architecture

- **Not a model frontend**: AgentHub does NOT call LLM APIs directly. It routes messages to agent gateways.
- **Adapter pattern**: `src/lib/adapters/` — each adapter implements `GatewayAdapter` (sendMessage + healthCheck)
- **SSE streaming**: Chat endpoint (`/api/chat`) uses Server-Sent Events for real-time streaming
- **SQLite**: `better-sqlite3` with WAL mode, cached on `globalThis` to survive HMR
- **Base-nova shadcn**: Uses `@base-ui/react` primitives — no `asChild` prop on components

## Dev Notes

- `params` are Promises in Next.js 16 route handlers — must `await params`
- Select `onValueChange` receives `string | null`, not `string`
- Don't install packages from `~` — always `cd` to project first (caused prior RAM crashes)
- Don't leave multiple dev servers running (memory concern)
