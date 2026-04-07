# AgentHub Handoff - Next Session

## Project Location
`~/agenthub` - Next.js 16 App Router, TypeScript, Tailwind CSS 4, SQLite

## Current State
- 83 source files changed in last session (+5,932 / -2,817 lines)
- Production running at http://localhost:3000 via systemd user service (`systemctl --user restart agenthub`)
- GitHub: https://github.com/Albaloola/AgentHub (latest commit: `6835c64`)
- 3 agents online: Jerry (OpenClaw), Jamie (OpenClaw), Jake (Hermes CLI adapter)
- Build: TypeScript + production build both pass clean

## What Was Built This Session

### Phase 1: Light Theme (COMPLETE)
- **CSS Variable Foundation**: `:root` has light values, `.dark` has dark values. Full variable system for all 30+ semantic tokens
- **Glass Morphism**: `--glass-bg`, `--glass-border-color`, `--glass-inner-shadow` variables change per theme. `.glass`, `.glass-strong`, `.glass-bubble` all use variables
- **Neon Lighting**: 7 neon color pairs (`--neon-blue-shadow`, etc.) — dark uses glow, light uses tinted drop-shadow + ring. `.text-neon-*` uses `--neon-text-shadow`
- **Starfield**: Light mode shows dot-grid pattern + subtle color wash instead of stars. Meteors hidden in light. Uses `var(--background)` not hardcoded color
- **Theme Toggle**: `ui-prefs-applier.tsx` adds/removes `.dark` class on `<html>`. System mode uses `matchMedia` listener. Layout.tsx has `className="dark"` for default
- **Color Sweep**: 100+ `white/[opacity]` patterns replaced with `foreground/[opacity]` across 17+ files. Zero remaining
- **Light Mode Overrides**: Scrollbar, resize handles, light-sweep, nav-neon all adapted

### Phase 2: Orphaned Backend UIs (COMPLETE)
- **Agent Performance Dashboard** (`agents/[id]/page.tsx`): CSS sparkline latency chart, error timeline dots, 7d/1d stat cards with trend arrows
- **Agent Version Manager** (`agents/[id]/page.tsx`): Version list with traffic % sliders (range input), create form, active/inactive badges
- **Prompt Engineering** (`playground/page.tsx`): Enhanced with version management, auto-diff view against active version, environment selector, variables/model_params JSON editors, version badge
- **Compact Button** (`chat-header.tsx`): Minimize2 icon button with AlertDialog confirmation, calls compactConversation API, shows result toast
- **System Settings Page** (`settings/page.tsx`): Full form — default model, max tokens, rate limit, API base URL, maintenance mode toggle (uses Switch component)
- **Cost Tracking** (`insights/page.tsx`): New "Costs" tab with total cost card, per-agent cost breakdown with CSS bar visualization
- **Health Score** (`page.tsx` dashboard): Colored dot (green/yellow/red) next to agent names in fleet panel with title tooltip
- **Message Editing**: Was already fully wired (pencil icon, textarea, save/cancel, "(edited)" label) — verified, no changes needed

### Phase 3: Polish & Accessibility (COMPLETE)
- **Skeleton Loaders**: New `skeleton.tsx` component. `DashboardSkeleton`, `AgentCardSkeleton`, `FleetSkeleton`, `ChatSkeleton` replace Loader2 spinners on all major pages + route-level `loading.tsx` files
- **Accessibility**: 50+ `aria-label` on icon-only buttons across 12 files. `aria-live="polite"` on chat messages + streaming indicator. `aria-expanded` on all collapsibles (sidebar, thinking, terminal, floating stats, notifications). `role="main"`, `role="navigation"`, `role="complementary"`. Sidebar nav changed from `<div>` to `<nav>` element
- **Focus Visible**: Global `:focus-visible` ring with `var(--ring)` color, `:focus:not(:focus-visible)` suppression
- **Button Loading States**: Agent dialog save, chat header reset/compact buttons show Loader2 spinner while processing
- **Delete Confirmations**: New `alert-dialog.tsx` component. AlertDialogs on agents, knowledge, workflows, templates, webhooks delete actions

### Phase 4: Remaining Features (COMPLETE)
- **Conversation Replay** (`replay-panel.tsx`): Timeline scrubber (uses Slider), snapshot viewer with metadata (response time, tokens, model), playback controls (first/prev/play-pause/next/last), speed toggle (1x/2x/4x/8x), mini-timeline dots, keyboard shortcuts (Space, arrows, Home/End, Esc). API at `/api/conversations/[id]/replay` synthesizes snapshots from messages if none exist
- **Agent Fallback Chain** (`agents/[id]/page.tsx`): Ordered list with up/down reorder buttons, add via Select dropdown, remove via X button, save button (dirty state tracking), parses `fallback_chain` JSON from agent data
- **Response Cache Management** (`monitoring/page.tsx`): New API at `/api/cache`. Stats grid (total entries, hit rate, size, tokens). Recent entries list with agent name, hit count, response preview, TTL countdown. Clear cache button with AlertDialog
- **Conversation Permissions** (`share-dialog.tsx`): New API at `/api/conversations/[id]/permissions`. Share button in chat header. Dialog with user search (autocomplete from /api/users), permission level dropdown (viewer/editor/admin), inline permission editing, remove access button

### Bug Fix
- Agent cards click-outside-to-close: `useRef` + document `mousedown` listener collapses expanded card when clicking outside grid

## What Was Built Across ALL Sessions
- Full 8-phase feature build (27 pages, 81+ API routes, 52 DB tables)
- VoltAgent-inspired design system with starfield background, neon lighting, glass morphism
- **Full light/dark/system theme support** with CSS variable foundation
- Living avatars with state animations, planet avatar with orbital rings
- Inline thinking panel, terminal viewer for tool calls, floating stats bubble
- Message queue with stop button, message virtualization (100+ msgs)
- Settings modal with save/preview/revert, custom color picker, custom slider
- Resizable sidebar with nav/chats split, nav config panel, drag-to-reorder nav items
- Right-click context menus on conversations (rename, pin, move, export, delete)
- Conversation drag-to-reorder with folder support
- Draggable/resizable dashboard grid (react-grid-layout v2) with lock/unlock, all 8 resize handles
- Agent Fleet grid/list view toggle with health score indicators
- In-conversation search with prev/next navigation
- Token count in chat input
- Page transition animations
- Zustand selector optimization across all 30 components (useShallow where 4+ fields)
- Fluid viewport-aware scaling system (root font-size clamp, all px converted to rem)
- Dead code cleanup (16 files removed in prior session, more this session)
- Skeleton loaders, accessibility pass, button loading states, delete confirmations
- Agent performance dashboard, version manager, prompt engineering workspace
- Conversation replay timeline, fallback chain editor, cache management, sharing/permissions
- Compact conversation button, system settings page, cost tracking

## Environment
- OpenClaw gateway: localhost:18789 with token auth (in .env.local as OPENCLAW_API_KEY)
- Hermes: CLI-based via ~/.hermes/hermes-agent/venv/bin/python
- Port 8080 is UniFi controller (NOT Hermes)
- systemd service at ~/.config/systemd/user/agenthub.service loads .env.local

## CRITICAL: Dev Server Warning
Do NOT start dev servers (`npm run dev`, `preview_start`, or any server process). The app has a memory leak triggered when a browser connects that fills RAM in ~5 seconds and crashes the PC. Only do file edits and `npm run build`. The user runs the production server via systemd.

## Design Reference
- ~/agenthub/DESIGN.md - VoltAgent design system
- **Light palette**: Warm Off-White #fafaf9, White #ffffff, Stone-100 #f5f5f4, Stone-300 #d6d3d1, Stone-500 #78716c, Stone-900 #1c1917
- **Dark palette**: Abyss Black #050507, Carbon Surface #101010, Warm Charcoal #3d3a39, Snow White #f2f2f2
- Glass glow controlled by --glass-glow-color, --agent-glow-color, --glass-glow-spread CSS variables
- Theme-aware glass: --glass-bg, --glass-border-color, --glass-inner-shadow
- Theme-aware neon: --neon-blue-shadow (+ hover), --neon-text-shadow, etc.
- Fluid scaling: root font-size uses clamp(14px, 0.625rem + 0.4vw, 22px), all sizes in rem
- Theme class: `.dark` on `<html>` element, toggled by ui-prefs-applier.tsx

## Key Files Reference
| File | Purpose |
|------|---------|
| src/lib/store.ts | Zustand store (uiPrefs system with save/revert) |
| src/lib/db.ts | SQLite schema (52 tables) |
| src/lib/api.ts | 70+ API client functions |
| src/lib/types.ts | All TypeScript interfaces |
| src/app/globals.css | VoltAgent design system, glass, neon, starfield, fluid scaling, light/dark variables |
| src/app/layout.tsx | Root layout with `className="dark"` default |
| src/components/layout/sidebar.tsx | Sidebar with categories, resize, config, DnD |
| src/components/settings/settings-modal.tsx | Settings with save/revert, theme toggle |
| src/components/chat/message-bubble.tsx | Message rendering with edit support |
| src/components/chat/chat-header.tsx | Search, compact, reset, replay, share buttons |
| src/components/chat/replay-panel.tsx | Conversation replay timeline |
| src/components/chat/share-dialog.tsx | Conversation permissions dialog |
| src/components/chat/empty-chat-state.tsx | Planet avatar + suggestions |
| src/components/ui/ui-prefs-applier.tsx | Applies all UI prefs to DOM including theme |
| src/components/ui/skeleton.tsx | Reusable skeleton loader |
| src/components/ui/alert-dialog.tsx | Confirmation dialog component |
| src/components/ui/switch.tsx | Toggle with trail animation |
| src/components/ui/slider.tsx | Custom slider with milestones |
| src/components/ui/color-picker.tsx | HSL gradient picker |
| src/components/ui/hud-panel.tsx | Dashboard panel with drag header |
| src/app/(dashboard)/agents/[id]/page.tsx | Agent detail with performance, versions, fallback chain |
| src/app/(dashboard)/monitoring/page.tsx | Monitoring with response cache management |
| src/app/(dashboard)/insights/page.tsx | Analytics with cost tracking |
| src/app/(dashboard)/playground/page.tsx | Prompt engineering workspace |
| src/app/(dashboard)/settings/page.tsx | System settings (model, tokens, rate limit) |
| src/lib/adapters/hermes.ts | CLI subprocess adapter |
| src/lib/adapters/openclaw.ts | OpenAI-compat HTTP adapter |

## Known Issues / Potential Next Steps
- **Light theme visual QA**: The CSS foundation is done but inline styles with hardcoded `rgba(255,255,255,...)` in `onMouseEnter`/`onMouseLeave` handlers (sidebar, chat-input, settings-modal, agents page, dashboard) still assume dark background. These need replacing with CSS custom properties or Tailwind hover: classes
- **Inline style glow colors**: Many components use `e.currentTarget.style.boxShadow = "0 0 12px rgba(59,130,246,0.6)..."` for hover effects. These work fine in dark but may look too strong in light. Could add `--neon-hover-blue` etc. CSS variables and reference them
- **Memory leak**: The dev server memory leak hasn't been investigated. Root cause unknown — could be HMR, WebSocket, or a component effect loop
- **Mobile responsive**: No mobile testing has been done
- **E2E tests**: No test suite exists
- **Image/avatar uploads**: Upload UI exists but may need polish
