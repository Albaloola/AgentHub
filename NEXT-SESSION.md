# AgentHub Handoff - Next Session

## Project Location
`~/agenthub` - Next.js 16 App Router, TypeScript, Tailwind CSS 4, SQLite

## Current State
- 180+ source files, ~28K lines of code
- Production running at http://localhost:3000 via systemd user service (`systemctl --user restart agenthub`)
- GitHub: https://github.com/Albaloola/AgentHub
- 3 agents online: Jerry (OpenClaw), Jamie (OpenClaw), Jake (Hermes CLI adapter)
- Build: TypeScript + production build both pass clean

## What Was Built Across Sessions
- Full 8-phase feature build (27 pages, 81 API routes, 52 DB tables)
- VoltAgent-inspired design system with starfield background, neon lighting, glass morphism
- Living avatars with state animations, planet avatar with orbital rings
- Inline thinking panel, terminal viewer for tool calls, floating stats bubble
- Message queue with stop button, message virtualization (100+ msgs)
- Settings modal with save/preview/revert, custom color picker, custom slider
- Resizable sidebar with nav/chats split, nav config panel, drag-to-reorder nav items
- Right-click context menus on conversations (rename, pin, move, export, delete)
- Conversation drag-to-reorder with folder support
- Draggable/resizable dashboard grid (react-grid-layout v2) with lock/unlock, all 8 resize handles
- Agent Fleet grid/list view toggle
- In-conversation search with prev/next navigation
- Token count in chat input
- Page transition animations
- Zustand selector optimization across all 30 components (useShallow where 4+ fields)
- Fluid viewport-aware scaling system (root font-size clamp, all px converted to rem)
- Dead code cleanup (16 files removed), next-themes removed (hardcoded dark in Sonner)

## Environment
- OpenClaw gateway: localhost:18789 with token auth (in .env.local as OPENCLAW_API_KEY)
- Hermes: CLI-based via ~/.hermes/hermes-agent/venv/bin/python
- Port 8080 is UniFi controller (NOT Hermes)
- systemd service at ~/.config/systemd/user/agenthub.service loads .env.local

## CRITICAL: Dev Server Warning
Do NOT start dev servers (`npm run dev`, `preview_start`, or any server process). The app has a memory leak triggered when a browser connects that fills RAM in ~5 seconds and crashes the PC. Only do file edits and `npm run build`. The user runs the production server via systemd.

## Design Reference
- ~/agenthub/DESIGN.md - VoltAgent design system
- Color palette: Abyss Black #050507, Carbon Surface #101010, Warm Charcoal #3d3a39, Snow White #f2f2f2
- Glass glow controlled by --glass-glow-color, --agent-glow-color, --glass-glow-spread CSS variables
- Fluid scaling: root font-size uses clamp(14px, 0.625rem + 0.4vw, 22px), all sizes in rem

---

# WORK FOR THIS SESSION

You have a massive, ambitious feature list. Attack it with parallel subagents. Don't stop until everything builds clean. Use `npm run build` to verify (never `npm run dev`). Restart production with `systemctl --user restart agenthub`.

---

## PHASE 1: LIGHT THEME (Highest Priority)

The app is dark-only. The infrastructure is 80% ready (CSS variables exist, Settings modal has Dark/Light/System buttons, theme field in Zustand store and DB). What's missing is the actual light-mode CSS values and ~100 hardcoded dark colors scattered across components.

### 1A. CSS Variable Foundation
**File: `src/app/globals.css`**

Move current dark values from `:root` into `.dark` block. Define light-mode values in `:root`:

| Role | Dark (current) | Light (new :root) |
|------|---------------|-------------------|
| --background | #050507 | #fafaf9 (warm off-white) |
| --foreground | #f2f2f2 | #1c1917 (stone-900) |
| --card | #101010 | #ffffff |
| --card-foreground | #f2f2f2 | #1c1917 |
| --popover | #101010 | #ffffff |
| --popover-foreground | #f2f2f2 | #1c1917 |
| --primary | #f2f2f2 | #1c1917 |
| --primary-foreground | #101010 | #ffffff |
| --secondary | #1a1a1c | #f5f5f4 (stone-100) |
| --secondary-foreground | #f2f2f2 | #1c1917 |
| --muted | #1a1a1c | #f5f5f4 |
| --muted-foreground | #8b949e | #78716c (stone-500) |
| --accent | #1a1a1c | #f5f5f4 |
| --accent-foreground | #f2f2f2 | #1c1917 |
| --destructive | #fb565b | #dc2626 |
| --border | #3d3a39 | #d6d3d1 (stone-300) |
| --input | #1a1a1c | #f5f5f4 |
| --ring | #3b82f6 | #3b82f6 |
| --sidebar | #080809 | #f7f7f6 |
| --sidebar-foreground | #f2f2f2 | #1c1917 |
| --sidebar-border | #3d3a39 | #e7e5e4 |

### 1B. Glass Morphism Light Mode
Add theme-aware CSS custom properties for glass:
```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.6);
  --glass-border-color: rgba(0, 0, 0, 0.08);
  --glass-inner-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
}
.dark {
  --glass-bg: rgba(16, 16, 16, 0.5);
  --glass-border-color: var(--glass-glow-color, rgba(59,130,246,0.3));
  --glass-inner-shadow: inset 0 0 calc(var(--glass-glow-spread, 20) * 1px) var(--glass-glow-color, rgba(59,130,246,0.08));
}
```
Update `.glass`, `.glass-strong`, `.glass-bubble`, `.glass-bubble-user` to use these variables.

### 1C. Neon Lighting in Light Mode
Dark mode: `box-shadow: 0 0 6px rgba(59,130,246,0.4), 0 0 20px rgba(59,130,246,0.15)`
Light mode: `box-shadow: 0 2px 8px rgba(59,130,246,0.15), 0 0 0 1px rgba(59,130,246,0.2)` (tinted drop-shadow + colored ring)

Add `--neon-shadow-blue`, `--neon-shadow-violet`, etc. that change per theme. Each `.neon-*` class uses the variable.

For `.text-neon-*` classes: dark keeps text-shadow glow, light uses stronger saturated color with no shadow.

### 1D. Starfield Light Mode Alternative
- Light mode: replace starfield with subtle dot-grid pattern (`radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)`) or soft ambient gradient blobs
- Respect the existing `showStarfield` toggle in uiPrefs
- Meteor animation: replace with subtle shimmer sweep in light mode, or hide

### 1E. Theme Switching Infrastructure
**File: `src/components/ui/ui-prefs-applier.tsx`**
- When `uiPrefs.theme === "dark"`, add `.dark` class to `<html>`. When "light", remove it. When "system", use `matchMedia('(prefers-color-scheme: dark)')`
- The Settings modal already has Dark/Light/System buttons wired to `setPref("theme", value)` -- just needs the class toggle

### 1F. Hardcoded Color Sweep
~100+ instances of hardcoded colors in components that won't respond to theme changes:
- `bg-white/[0.02]`, `bg-white/[0.05]`, `bg-white/[0.08]` etc. -- these are fine in dark but invisible in light. Replace with `bg-foreground/[0.02]` etc.
- `border-white/[0.06]` -- same issue, replace with `border-foreground/[0.06]`
- `text-white` on buttons -- replace with `text-primary-foreground`
- `rgba(255,255,255,...)` in inline styles -- add CSS variables or conditional logic
- Inline `style={{ boxShadow: ... }}` with hardcoded rgba -- these need theme-aware alternatives
- `hover:bg-white/[0.04]` patterns -- replace with `hover:bg-foreground/[0.04]`

Key files with the most hardcoded colors:
- `src/app/globals.css` (neon system, starfield, glass classes)
- `src/components/layout/sidebar.tsx` (glow colors in inline styles)
- `src/components/chat/chat-input.tsx` (hover glow inline styles)
- `src/components/chat/empty-chat-state.tsx` (planet gradient colors)
- `src/components/chat/message-bubble.tsx` (neon hover colors)
- `src/components/settings/settings-modal.tsx` (tab hover inline styles)
- `src/app/(dashboard)/page.tsx` (dashboard card hovers)
- All 27 page files use `border-white/[0.06]` and `bg-white/[0.02]` patterns

Strategy: Use find-and-replace for the most common patterns:
- `bg-white/[0.02]` -> `bg-foreground/[0.02]`
- `bg-white/[0.04]` -> `bg-foreground/[0.04]`
- `bg-white/[0.05]` -> `bg-foreground/[0.05]`
- `bg-white/[0.08]` -> `bg-foreground/[0.08]`
- `border-white/[0.04]` -> `border-foreground/[0.04]`
- `border-white/[0.06]` -> `border-foreground/[0.06]`
- `border-white/[0.08]` -> `border-foreground/[0.08]`
- `border-white/[0.1]` -> `border-foreground/[0.1]`
- `border-white/[0.12]` -> `border-foreground/[0.12]`
- `border-white/[0.15]` -> `border-foreground/[0.15]`
- `hover:bg-white/[0.04]` -> `hover:bg-foreground/[0.04]`
- `hover:bg-white/[0.05]` -> `hover:bg-foreground/[0.05]`
- `text-white` on colored backgrounds -> `text-primary-foreground` (be careful, some text-white is correct like on gradient buttons)

For inline styles with hardcoded rgba values in onMouseEnter/onMouseLeave handlers, the cleanest approach is to define CSS classes with `hover:` variants instead. Or use CSS custom properties: `var(--neon-hover-blue)` that changes per theme.

---

## PHASE 2: ORPHANED BACKEND FEATURES (8 Missing UIs)

The backend has 18 orphaned API endpoints. Build UIs for the highest-value ones:

### 2A. Agent Performance Dashboard
- **API**: GET /api/agents/{id}/performance (returns 7-day/1-day latency, error rates, trends)
- **Where**: Add a "Performance" tab or section to the agent detail page, or a new /performance page
- **UI**: Line charts for latency over time, error rate gauge, trend indicators
- **Note**: No charting library installed. Consider lightweight options: use CSS-based sparklines, or install `recharts`

### 2B. Agent Version Manager (Canary Deployments)
- **API**: POST/PATCH/DELETE /api/agents/{id}/versions (traffic allocation 0-100%)
- **Where**: Add "Versions" section to agent detail page
- **UI**: List of versions with traffic % sliders, "Create Snapshot" button, active/inactive badges

### 2C. Prompt Engineering Page
- **API**: GET/POST /api/prompts, PATCH /api/prompts/{id} (activate, test)
- **Where**: New page at /prompts, or add to existing /playground
- **UI**: Version list with diff view, environment toggle (dev/prod), "Test" button that runs prompt against agent, variable substitution editor

### 2D. Conversation Compacting Button
- **API**: POST /api/conversations/{id}/compact
- **Where**: Chat header, next to Reset button
- **UI**: Simple button with confirmation: "Compact? Keeps first message, pinned messages, and last 20. Reduces token usage."

### 2E. Message Editing
- **API**: PATCH /api/messages/{id}
- **Where**: Message bubble action bar (already has Pencil icon wired to editing state!)
- **Note**: Actually check — the edit button may already be partially wired in message-bubble.tsx. The `editMessage` function exists in lib/api.ts. Verify and complete the wiring.

### 2F. System Settings Page
- **API**: GET/POST /api/settings (key-value store)
- **Where**: Enhance existing /settings page (currently just a redirect hint)
- **UI**: System-wide config: default model, max tokens, rate limits, maintenance mode toggle

### 2G. Cost Tracking Dashboard
- **DB**: agents.cost_per_token, agents.cost_per_request, conversations.total_cost
- **Where**: Add to /analytics page or new /billing section
- **UI**: Total spend, per-agent cost breakdown, cost-per-conversation chart

### 2H. Agent Health Score Display
- **DB**: agents.health_score field exists
- **Where**: Agent Fleet panel on dashboard, agent cards everywhere
- **UI**: Small health indicator (colored dot or ring) showing reliability score

---

## PHASE 3: POLISH & ACCESSIBILITY

### 3A. Skeleton Loaders
Replace plain `<Loader2>` spinners with skeleton screens on all pages. Use pulsing gray rectangles that match the layout shape. Key pages: Dashboard, Agents, Chat loading state, Analytics.

### 3B. Accessibility Pass
- Add `aria-label` to all icon-only buttons (50+ instances across codebase)
- Add `aria-live="polite"` regions for streaming content and toast notifications
- Ensure all modals trap focus (Settings modal has partial support, others don't)
- Add `aria-expanded` to all collapsible sections
- Keyboard navigation: ensure all inline-styled hover effects also trigger on `:focus-visible`

### 3C. Button Loading States
When forms submit, show a spinner inside the button (replace text with Loader2 icon). Currently buttons just disable without visual feedback. Affects: all dialog forms across 15+ pages.

### 3D. Delete Confirmation Dialogs
Most delete operations use optimistic removal with undo toast. Add proper confirmation dialogs for destructive actions: agent deletion, knowledge base deletion, workflow deletion.

---

## PHASE 4: REMAINING UI FEATURES

### 4A. Conversation Replay / Timeline
- **DB**: replay_snapshots table exists
- **UI**: Timeline scrubber showing conversation state at any point in time

### 4B. Agent Fallback Chain Editor
- **DB**: agents.fallback_chain (JSON array of agent IDs)
- **API**: updateFallbackChain() exists in lib/api.ts
- **UI**: Drag-and-drop list of agents in priority order for failover

### 4C. Conversation Permissions
- **DB**: conversation_permissions table with user_id, permission_level
- **UI**: "Share" button on conversations, permission dropdown per user

### 4D. Response Cache Management
- **DB**: response_cache table with hit_count, expires_at
- **UI**: Cache stats view, clear cache button, TTL configuration per agent

---

## Key Files Reference
| File | Purpose |
|------|---------|
| src/lib/store.ts | Zustand store (uiPrefs system with save/revert) |
| src/lib/db.ts | SQLite schema (52 tables) |
| src/lib/api.ts | 60+ API client functions |
| src/app/globals.css | VoltAgent design system, glass, neon, starfield, fluid scaling |
| src/components/layout/sidebar.tsx | Sidebar with categories, resize, config, DnD |
| src/components/settings/settings-modal.tsx | Settings with save/revert, theme toggle |
| src/components/chat/message-bubble.tsx | Message rendering |
| src/components/chat/empty-chat-state.tsx | Planet avatar + suggestions |
| src/components/ui/ui-prefs-applier.tsx | Applies all UI prefs to DOM |
| src/components/ui/switch.tsx | Toggle with white trail (uses rem for fluid scaling) |
| src/components/ui/slider.tsx | Custom slider with milestones |
| src/components/ui/color-picker.tsx | HSL gradient picker |
| src/components/ui/hud-panel.tsx | Dashboard panel with drag header |
| src/lib/adapters/hermes.ts | CLI subprocess adapter |
| src/lib/adapters/openclaw.ts | OpenAI-compat HTTP adapter |

## Execution Strategy
1. Start with Phase 1 (light theme) — it's the largest and most impactful
2. Use parallel subagents: one for CSS/globals, one for component color sweep, one for glass/neon adaptation
3. After light theme, do Phase 2 features (these are independent — can parallelize all of them)
4. Phase 3 polish can be done as a single sweep
5. Build and restart after each phase: `npm run build && systemctl --user restart agenthub`
6. NEVER start a dev server — the app has a memory leak that crashes the PC
