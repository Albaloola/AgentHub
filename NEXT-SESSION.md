# AgentHub Handoff - Next Session

## Project Location
`~/agenthub` - Next.js 16 App Router, TypeScript, Tailwind CSS 4, SQLite

## Current State
- Production running at http://localhost:3000 via systemd user service (`systemctl --user restart agenthub`)
- GitHub: https://github.com/Albaloola/AgentHub (latest commit: `622f410`)
- 3 agents online: Jerry (OpenClaw), Jamie (OpenClaw), Jake (Hermes CLI adapter)
- Build: TypeScript + production build both pass clean

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
- Theme class: `.dark` on `<html>` element, toggled by `src/components/ui/ui-prefs-applier.tsx`
- Glass glow: `--glass-glow-color`, `--agent-glow-color`, `--glass-glow-spread` CSS variables
- Theme-aware glass: `--glass-bg`, `--glass-border-color`, `--glass-inner-shadow`
- Theme-aware neon: `--neon-blue-shadow` (+ hover), `--neon-text-shadow`, etc.
- Fluid scaling: root font-size uses `clamp(14px, 0.625rem + 0.4vw, 22px)`, all sizes in rem

---

# WORK FOR THIS SESSION: FIX LIGHT THEME

A light theme was partially implemented last session. The CSS variable foundation is correct (`:root` has light values, `.dark` has dark values) and the theme toggle works (Settings > Dark/Light/System). But there are major visual issues when switching to light mode:

## PROBLEM 1: Root Starfield Background (THE BIG ONE)

**The full-page background is still a dark night sky in light mode.**

The app's background is NOT the `.starfield` CSS class in globals.css (which was updated). It's a React component:

**File: `src/components/ui/root-starfield.tsx`**

This component renders a `position: fixed` full-screen starfield with:
- Dark oklch gradient background (line 115-118): `oklch(0.10 0.008 260)` to `oklch(0.07 0.005 260)`
- Nebula blobs with dark colors (lines 128-155)
- White/blue star dots (lines 175-195)
- Meteors, lens flares, lightning, noise overlay
- All hardcoded dark-mode colors in embedded `<style>` JSX

**Rendered in** `src/app/layout.tsx` (line 5: `import { RootStarfield }`) as the app's background layer.

### Fix needed:
The component needs to be theme-aware. Options:
1. **Conditional rendering**: Hide entirely in light mode (simplest — check for `.dark` class or pass a prop), show a light alternative (subtle dot grid, soft gradient blobs, or just the plain `var(--background)`)
2. **Theme-aware colors**: Swap oklch values for CSS custom properties that change per theme (complex, the component has ~50 hardcoded color values in `<style>` JSX)

The `showStarfield` toggle already exists in uiPrefs. The component likely already respects it. But even with starfield off, the dark gradient background layer persists.

## PROBLEM 2: Inline Style Glow Colors (12 files)

Many components use `onMouseEnter`/`onMouseLeave` to set inline `style.boxShadow` with hardcoded `rgba(59,130,246,...)` glow values. These look fine in dark mode but are too intense/wrong in light mode.

**Files with hardcoded inline glow styles:**
1. `src/app/(dashboard)/agents/page.tsx` — agent card hover glows, button hover glows (6+ handlers)
2. `src/components/layout/sidebar.tsx` — nav item hover glows (2 handlers)
3. `src/components/chat/chat-input.tsx` — input hover glow
4. `src/components/chat/message-bubble.tsx` — message hover effects
5. `src/components/chat/empty-chat-state.tsx` — planet/suggestion card styles
6. `src/components/chat/floating-stats.tsx` — stats panel glow
7. `src/components/chat/inline-thinking.tsx` — thinking panel glow
8. `src/components/settings/settings-modal.tsx` — tab hover glows, slider thumb
9. `src/components/ui/hud-panel.tsx` — dashboard panel glow
10. `src/components/ui/living-avatar.tsx` — avatar glow
11. `src/app/(dashboard)/layout.tsx` — settings button glow
12. `src/app/(dashboard)/error.tsx` + `src/app/(dashboard)/chat/[id]/error.tsx` — hardcoded `bg-[#050507]`

### Fix strategy:
Replace inline `onMouseEnter`/`onMouseLeave` style manipulation with CSS classes using the existing neon variable system. The CSS already has theme-aware `--neon-blue-shadow`, `--neon-violet-shadow`, etc. variables (defined in globals.css).

For each inline handler like:
```tsx
onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 12px rgba(59,130,246,0.6), 0 0 30px rgba(59,130,246,0.25)"; }}
onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; }}
```
Replace with a CSS `hover:` class or use the existing neon classes:
```tsx
className="hover:shadow-[var(--neon-blue-shadow-hover)]"
// or just use the existing class:
className="neon-blue"
```

Or define new hover utility classes in globals.css that use the theme-aware variables.

## PROBLEM 3: Settings Panel Contrast

**File: `src/components/settings/settings-modal.tsx`**

Issues in light mode:
- Tab hover effects use inline `rgba(59,130,246,0.08)` background (line 198) — invisible in dark, but should be visible in light too
- Slider thumb is `bg-white` (line 573) — invisible on light background. Should be `bg-primary` or have a border
- Glow color preset dots (lines 724-730) — these are glow color values that need to be visible on light backgrounds
- Shadow `0 0 30px rgba(0,0,0,0.4)` on popover (line 156) — fine for dark, too harsh for light

## PROBLEM 4: Error Pages Hardcoded Dark

**Files:**
- `src/app/(dashboard)/error.tsx` — `bg-[#050507] starfield`
- `src/app/(dashboard)/chat/[id]/error.tsx` — `bg-[#050507] starfield`

Replace `bg-[#050507]` with `bg-background`.

## PROBLEM 5: Remaining Hardcoded Colors

- `src/components/ui/switch.tsx` — `rgba(255,255,255,...)` in inline styles for the switch trail effect
- `src/components/ui/slider.tsx` — `rgba(255,255,255,...)` for milestone markers
- `src/components/chat/artifacts-panel.tsx` — `bg-[#1a1a1c]` hardcoded
- `text-gray-400`, `text-slate-400` etc. in 6 page files (should be `text-muted-foreground`)

---

## Priority Order
1. **Root Starfield** — this is 90% of the visual problem. Hide or adapt for light mode
2. **Error pages** — quick fix, `bg-[#050507]` → `bg-background`
3. **Settings modal** — high visibility, user interacts with it to change theme
4. **Inline glow handlers** — systematic sweep of 12 files
5. **Switch/slider/artifacts** — minor visual polish

---

## What Was Built Last Session (Context)

### Light Theme Foundation (Done, needs fixes above)
- CSS variable system: `:root` has light values, `.dark` has dark values for all 30+ semantic tokens
- Glass morphism variables: `--glass-bg`, `--glass-border-color`, `--glass-inner-shadow`
- Neon lighting variables: 7 color pairs with theme-aware shadows
- Starfield CSS class adapted (but root-starfield.tsx component was missed)
- Theme toggle wired in ui-prefs-applier.tsx (dark/light/system with OS listener)
- 100+ `white/[opacity]` Tailwind classes replaced with `foreground/[opacity]`

### Phase 2: Backend UIs (Complete)
- Agent performance dashboard with sparkline charts (agents/[id] page)
- Agent version manager with traffic sliders (agents/[id] page)
- Prompt engineering workspace with diff view (playground page)
- Compact conversation button in chat header
- System settings page (model, tokens, rate limit, maintenance mode)
- Cost tracking on insights page
- Health score dots on dashboard fleet cards
- Agent fallback chain editor
- Conversation replay timeline with playback controls
- Response cache management on monitoring page
- Conversation sharing/permissions dialog

### Phase 3: Polish (Complete)
- Skeleton loaders on dashboard, agents, fleet, chat
- 50+ aria-label, aria-live, aria-expanded, role attributes
- Focus-visible keyboard navigation styles
- Button loading states on forms
- Delete confirmation dialogs (AlertDialog component)

## Key Files Reference
| File | Purpose |
|------|---------|
| src/components/ui/root-starfield.tsx | **ROOT CAUSE** — full-page starfield background with hardcoded dark colors |
| src/app/globals.css | CSS variables, glass, neon, starfield CSS class, light/dark theme |
| src/app/layout.tsx | Root layout, renders RootStarfield, has `className="dark"` default |
| src/components/ui/ui-prefs-applier.tsx | Applies theme class + all UI prefs to DOM |
| src/components/settings/settings-modal.tsx | Settings with theme toggle + inline glow styles |
| src/lib/store.ts | Zustand store (uiPrefs.theme: "dark"/"light"/"system") |
| src/components/layout/sidebar.tsx | Sidebar with inline glow handlers |
| src/app/(dashboard)/agents/page.tsx | Agent cards with inline glow handlers |
| src/components/chat/chat-input.tsx | Chat input with inline glow |
| src/components/chat/message-bubble.tsx | Message rendering with inline hover |
| src/components/chat/empty-chat-state.tsx | Planet avatar with inline styles |
| src/components/ui/switch.tsx | Toggle with rgba(255,255,255) trail |
| src/components/ui/slider.tsx | Slider with rgba(255,255,255) milestones |
| src/lib/api.ts | 70+ API client functions |
| src/lib/types.ts | All TypeScript interfaces |
| src/lib/db.ts | SQLite schema (52 tables) |

## Execution Strategy
1. Fix root-starfield.tsx first — hide in light mode or show light alternative
2. Fix error pages (2 min)
3. Fix settings modal contrast issues
4. Sweep inline glow handlers across 12 files — replace with CSS classes
5. Fix switch/slider/artifacts hardcoded colors
6. Build and restart: `npm run build && systemctl --user restart agenthub`
7. NEVER start a dev server — the app has a memory leak that crashes the PC
