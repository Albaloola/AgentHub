# AgentHub — Complete UI Enhancement Brief

You are a world-class frontend designer and engineer. You have been brought in to elevate an already-functional multi-agent dashboard app into something that feels premium, alive, and delightful to use. The bones are solid — your job is to make every pixel sing.

---

## Project Overview

**AgentHub** is a multi-agent AI dashboard built with:
- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS v4** (uses `@theme inline` in globals.css, no tailwind.config)
- **shadcn/ui** (base-nova style, component files in `src/components/ui/`)
- **Zustand** for state (`src/lib/store.ts`)
- **framer-motion** (already installed)
- **better-sqlite3** backend with API routes in `src/app/api/`
- Animation config already exists: `src/lib/animation.ts` (easing curves, spring presets, duration scales)
- Motion primitives exist: `src/components/ui/motion-primitives.tsx`

**6 themes** — 3 dark, 3 light. Defined in `src/lib/themes.ts`, CSS variables in `src/app/globals.css`:
- **Midnight** (dark) — deep space, blue-violet accents, starfield background with meteors
- **Emerald Terminal** (dark) — hacker/terminal, signal green, circuit-grid background
- **Obsidian** (dark) — monochrome, restrained, minimal fog background
- **Daylight** (light) — warm white, blue-violet accents, caustic light background
- **Paper** (light) — cream, amber-gold accents, golden dust motes background
- **Arctic** (light) — crisp white, ice-blue accents, aurora + ice crystal background

The CSS variable system in `globals.css` is extensive — per-theme neon shadows (`--neon-*-shadow`, `--neon-*-shadow-hover`), glass morphism (`--glass-bg`, `--glass-border-color`, `--glass-inner-shadow`), switch trails (`--switch-trail`), slider fills, ambient blobs, starfield tokens, hover-lift shadows, light-sweep tokens. USE these tokens for all colours and effects — never hardcode hex values.

---

## Your Mission

Enhance every visual and interactive element in the app. When you're done, someone should be able to switch between the 6 themes and feel like each one is a distinct, polished product — not a colour swap on the same template.

**This is a FULLY AUTONOMOUS run. Complete ALL sections (1 through 8) without stopping, without asking for confirmation, without waiting for input. Do not pause between sections. Proceed from each section directly into the next. Only stop at the Final Verification at the very end.**

Read the design skill: `/mnt/skills/public/frontend-design/SKILL.md`
Read the animation config: `src/lib/animation.ts`
Read the theme CSS: `src/app/globals.css`

Then work through the following areas. Do ALL of them autonomously without stopping.

---

## 1. The Chat Experience — The Heart of the App

The chat page is where users spend most of their time. It must feel exceptional.

### 1A. Chatbox Positioning & Animation

**Empty chat (welcome screen)**:
- The chat input starts in the **vertical centre** of the content area (not the bottom)
- Above it: the agent's avatar (with its animated ring/particles), the agent's greeting, and suggestion cards
- Below it: nothing — just the background
- The whole composition is centred, like a landing page

**When the user sends their first message**:
- The input smoothly **animates downward** to its permanent position at the bottom of the viewport (use framer-motion `layout` animation or `animate={{ y }}` with a spring transition, ~400ms)
- The welcome content (avatar, greeting, suggestion cards) fades out and scales down slightly as the input descends
- The first user message appears at the top of the now-scrollable message area
- This transition should feel like the app is "opening up" — going from a greeting mode to a working mode

**During active chat**:
- Input is pinned at the bottom. It NEVER moves again after the initial animation.
- Layout: `flex flex-col h-full` → `flex-1 overflow-y-auto min-h-0` (messages) → `flex-shrink-0` (input)
- Auto-scroll to newest message on send and on new agent response
- New messages animate in: user messages slide in from the right, agent messages slide in from the left, both with subtle fade + translateX (±20px) over 200ms

### 1B. Chat Input Redesign

The input area layout:
```
[icon]  [                                          ]  [send]
[icon]  [     textarea — min-height: 120px         ]  [    ]
[icon]  [     grows with content up to 300px       ]  [    ]
```

- Left side: utility icons (upload, formatting, expand) stacked **vertically** in a column
- Centre: a proper `<textarea>` with `min-h-[120px]`, grows with content, `max-h-[300px]` then scrolls internally
- Right side: send button, vertically centred, with a satisfying press animation (scale 0.9 + glow pulse on click)
- The entire input area has `backdrop-blur`, `--glass-bg` background, `--glass-border-color` border, and `--panel-shadow`
- On focus: border transitions to `var(--ring)`, subtle outer glow `0 0 0 3px var(--theme-accent-soft)`

### 1C. Message Bubbles

- User messages: right-aligned, use `--chat-user-bg` gradient, `--chat-user-border`, `--chat-user-shadow`
- Agent messages: left-aligned, use `--panel-bg` with `--panel-border`
- Both: rounded corners (`--radius-lg`), smooth entrance animation
- Agent avatar shows next to their messages with the existing `living-avatar` component
- Timestamps: subtle, `--muted-foreground`, fade in on hover over the message
- Markdown rendering in agent responses must be clean — proper code blocks using `--code-surface` and `--code-border`, proper lists, proper headings

---

## 2. Sidebar — Redesigned and Reimagined

The sidebar is the primary navigation. It should feel like a command centre's instrument panel.

### 2A. Structure

```
[Logo + App Name]
[Configure button]
─────────────────
CORE (section label)
  Dashboard
  Search
  Agents
  Group Chats
─────────────────
BUILD (section label)
  Personas
  Templates
  Workflows
  Playground
─────────────────
INTELLIGENCE (section label)
  Arena
  Memory
  Knowledge
  Insights
─────────────────
Chats (section)
  [New Chat] [New Folder]
  [chat list items...]
```

### 2B. Visual Treatment

- Background: `--sidebar` with a subtle inner glass effect (`backdrop-filter: blur(8px)`)
- Section labels (CORE, BUILD, INTELLIGENCE): tiny, `--muted-foreground`, letter-spacing 0.08em, uppercase
- Nav items: `padding: 8px 12px`, `border-radius: var(--radius-md)`, icon + label in a row
- **Active item**: background `var(--sidebar-accent)`, left accent bar (3px wide, `var(--sidebar-primary)`, rounded, animates in with spring). The accent bar should use `motion.div` with `layoutId` so it slides between items when navigation changes.
- **Hover**: background `var(--surface-hover)`, smooth 150ms transition
- **Icons**: must have `min-w-[20px]` and `flex-shrink-0` so they're never cropped. The sidebar container needs `px-3` minimum padding. No `overflow: hidden` on any sidebar parent that would clip icons.
- **Chat list items**: show agent avatar (16px), agent name, last message preview (truncated, `--muted-foreground`). Active chat has the same accent treatment as active nav item.

### 2C. Sidebar Animations

- On app load: sidebar items stagger in (opacity + translateX from -10px, 30ms per item)
- Section collapses: smooth height animation with `framer-motion` `animate={{ height: "auto" }}`
- Chat list: new chats animate in (slide + fade from top), deleted chats slide out and fade

---

## 3. Dropdown Menus & Select Components — Properly Beautiful

The current dropdowns are broken — they render as oversized dark rectangles. Fix every single one.

### 3A. `src/components/ui/select.tsx` — SelectContent & SelectItem

```css
SelectContent:
  background: var(--glass-bg)
  backdrop-filter: blur(12px)
  border: 1px solid var(--glass-border-color)
  border-radius: var(--radius-lg)
  box-shadow: var(--panel-shadow)
  padding: 4px
  max-height: 300px
  overflow-y: auto

SelectItem:
  border-radius: var(--radius-md)
  padding: 8px 12px
  color: var(--foreground)
  cursor: pointer
  
  &:hover — background: var(--surface-hover)
  &[data-selected] — background: var(--accent)
```

### 3B. Opening Animation

- Container: `scale(0.95) → 1`, `opacity 0 → 1`, 200ms with smooth easing
- Items: stagger in, each `translateY(4px) → 0` + opacity, 25ms per item
- A sliding hover highlight (single `motion.div` with `layout` that follows the hovered item) instead of each item independently changing background

### 3C. Closing Animation

- Items stagger OUT in reverse order (last first), 20ms per item
- Container: fades + scales to 0.97 after items are gone
- Particle dispersion on close: 5-6 tiny circles (`var(--theme-accent)` at 30% opacity, 3-6px) burst outward from the dropdown centre and fade over 350ms

### 3D. Audit All Selects

Run `grep -rn '<select\b' src/` — replace any native HTML `<select>` with the shadcn component. Run `grep -rn 'SelectContent\|DropdownMenuContent' src/` — ensure all instances have proper styling.

---

## 4. Toggle Switches — Properly Aligned and Gorgeous

The current switch component has alignment issues — the thumb circle and the track trail don't line up correctly.

### 4A. Rebuild the Switch (`src/components/ui/switch.tsx`)

- **Track**: height `24px`, width `44px`, `border-radius: 9999px` (fully rounded pill)
- **Thumb**: `20px × 20px` circle, `2px` inset from the track edge
- **Unchecked**: thumb on the left, track uses `--muted` background, thumb shadow `--thumb-unchecked-shadow`
- **Checked**: thumb slides to the right with `spring.bouncy` (framer-motion, overshoot), track fills with `--switch-trail` gradient (animated sweep from left to right, not instant), thumb shadow `--thumb-checked-shadow`
- **The trail animation**: when toggling ON, the `--switch-trail` gradient sweeps from left to right over 250ms (animate `background-position` or `background-size`). When toggling OFF, it sweeps back.
- **Particle burst on toggle ON**: spawn 4-6 tiny circles (3-5px, `var(--theme-accent)`) from the thumb's final position, they expand outward 15-25px in random radial directions and fade out over 300ms
- **Alignment**: the thumb MUST be perfectly vertically centred in the track. Use `position: absolute; top: 2px;` with `left: 2px` (unchecked) or `left: calc(100% - 22px)` (checked). No flexbox alignment guessing.

### 4B. Test on all themes

The switch must look correct on all 6 themes. The track gradient, thumb colour, and shadows all use CSS custom properties that change per theme — verify each one.

---

## 5. Theme Backgrounds — Alive and Vibrant

Each theme has an animated background. Some are good (Midnight), others are nearly invisible. Enhance all of them.

### CRITICAL OPACITY RULES
- Dark themes: effects at 0.15-0.40 opacity are clearly visible
- Light themes: effects need **3-4× more opacity** than dark themes. An element at 0.05 on white is invisible. At 0.20 it starts to register. At 0.30 it's clearly present.
- **If you squint and can barely see the effect, DOUBLE the opacity.**
- **It's easier to tone things down later than to increase them for the fifth time. Err on the side of MORE visible.**

### Midnight — Deep Space Observatory (ENHANCE)
Already the best. Make it even better:
- Meteors: one every **4-8 seconds** (more frequent). Vary brightness and speed. Add meteor shower bursts: 2-3 meteors in quick succession (200ms apart) every 30-45 seconds
- Bright twinkling stars: 4-5 stars that pulse noticeably from 0.3 to 1.0 opacity
- Nebula clouds: drift at the current pace, they're good
- Add occasional comet: a slower, brighter object with a wider tail, crossing the screen every 60-90 seconds

### Emerald Terminal — Digital Matrix (MORE ACTIVITY)
- Pulse traces along grid lines: fire every **1-2 seconds**, **4-6 active** at any time. Bright heads at 0.5 opacity, trails at 0.3
- Node flares: fire every **1-3 seconds**, **5-8 active**. Peak brightness 0.6
- Rising data particles (squares): **30-50 particles**, **0.25-0.35 opacity**
- Grid lines: **0.08 opacity** minimum
- The overall feel should be a BUSY active circuit board

### Obsidian — Quiet Void (VISIBLE, not empty)
- Fog patches: **0.06-0.10 opacity**. Clearly visible as lighter/darker regions shifting slowly. Like mist in a dark room.
- 2-3 static faint points of light (2px, 0.15 opacity) — like distant city lights through fog
- Breathing vignette: corners darken to **0.12-0.15 opacity**, breathing over 6 seconds
- Grain: **0.03-0.04 opacity**

### Daylight — Soft Light Caustics (MUCH MORE VISIBLE)
- Caustic blobs: **30-50vw diameter**, **0.15-0.20 opacity**, 4-5 overlapping blobs. Think swimming pool light patterns on a white wall.
- Floating orbs: **30-60px**, **0.18-0.25 opacity**
- Prismatic flash: actual rainbow gradient (blue → violet → pink → orange), **0.10 opacity**, diagonal sweep
- If it looks like a plain white page, the effects are too faint

### Paper — Sunlit Study (GOLDEN WARMTH)
- Dust motes: **25-40 particles**, **0.30-0.40 baseline opacity**, **0.6-0.7 when catching light**. These are the hero element — clearly visible golden particles.
- Light shaft: diagonal warm band at **0.12-0.15 opacity**
- Warm tint: radial gradient of `--theme-accent` at 0.06 in the lower-right, slowly drifting
- Should feel noticeably WARMER than a plain cream background

### Arctic — Frozen Aurora (VISIBLE MOVEMENT)
- Aurora bands: **0.12-0.18 opacity**, upper **40%** of viewport, tall ribbons (100-200px), gently waving
- Ice crystals: **15-25 particles**, **0.20-0.30 opacity**, **4-8px**, falling at 20-30px/second
- Frost gradient: top 20% of viewport, 0.08 opacity
- Breath fog: 100-150px blobs, every 8-12 seconds
- Must look distinctly different from Daylight

---

## 6. Micro-Interactions on ALL Components

### 6A. Buttons (`src/components/ui/button.tsx`)
- Hover: `scale(1.03)`, shadow deepens to `--hover-lift-shadow`
- Press: `scale(0.97)`, shadow compresses, `filter: brightness(0.95)`
- Primary variant hover: light-sweep `::after` — diagonal highlight slides across using `--light-sweep-color`
- Loading: shimmer sweep animation
- Focus: animated conic-gradient border rotating (fallback: pulsing box-shadow with `--ring`)

### 6B. Cards (`src/components/ui/card.tsx`)
- 3D hover tilt: mouse-tracked `rotateX/Y` (max ±2.5°), `perspective: 800px`, spring back on leave
- Shadow: `--panel-shadow` → `--panel-shadow-hover` on hover
- Entrance: staggered opacity + translateY when cards appear in groups

### 6C. Dialogs (`src/components/ui/dialog.tsx`)
- Open: overlay blur 0→8px, panel `scale(0.92)→1` with spring, content staggers in, frosted glass surface
- Close: content fades, panel drifts down 8px + fades, overlay reverses

### 6D. Tooltips (`src/components/ui/tooltip.tsx`)
- Enter: `scale(0.85)→1` with spring bounce, directional translateY
- Exit: shrink + fade, 120ms

### 6E. Tabs (`src/components/ui/tabs.tsx`)
- Sliding active indicator: `motion.div` with `layoutId`, colour `var(--theme-accent)`
- Content: `AnimatePresence mode="wait"`, crossfade with directional slide

### 6F. Collapsibles (`src/components/ui/collapsible.tsx`)
- Expand: `height: "auto"` with spring, content fades in 80ms after
- Collapse: content fades first, then height to 0
- Chevron: smooth 180° rotation

### 6G. HUD Panels (`src/components/ui/hud-panel.tsx`)
- Entrance: slide with spring overshoot (~8px)
- Top accent line: width 0%→100% on mount (600ms), `--theme-accent-line`
- Dark themes: breathing glow on border (shadow pulses every 4s, very subtle)

### 6H. Badges (`src/components/ui/badge.tsx`)
- Mount: popIn (scale 0.8→1 with spring)
- Hover: scale 1.05 + shadow lift

### 6I. Skeleton (`src/components/ui/skeleton.tsx`)
- Replace pulse with shimmer sweep: diagonal light band, CSS `background-position` animation, `--light-sweep-color`

### 6J. Scroll Areas (`src/components/ui/scroll-area.tsx`)
- Scrollbar thumb: fades in on scroll, fades out 1s after stop
- Scroll shadows: top/bottom gradient overlays on overflow

### 6K. Inputs and Textareas
- Focus: border → `var(--ring)`, glow `0 0 0 3px var(--theme-accent-soft)`, shadow intensifies

---

## 7. Theme Switching Ceremony

When the user switches themes:
1. A radial colour burst (new theme's `--theme-accent` at 0.15 opacity) expands from the theme selector outward across the viewport over 500ms
2. All surface colours transition smoothly (500ms) — ensure this CSS exists:
```css
body, .sidebar, [class*="HudPanel"], .card, [role="dialog"] {
  transition: background-color 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              color 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
```
3. The background crossfades (old fades out, new fades in, 600ms)

---

## 8. Scroll Reveals & List Animations

- Major page sections: fade + slide into view on scroll (IntersectionObserver, once)
- All lists (agent fleet, chat list, dashboard cards): staggered entrance
- New items: animate in. Removed items: scale down + fade out.
- Toast notifications (Sonner): spring entrance from bottom-right, quick slide-fade exit

---

## Technical Constraints

1. **GPU-only animation**: transform and opacity only. Never animate width, height, top, left, margin, padding.
2. **prefers-reduced-motion**: check `useReducedMotion()` — disable decorative animations (particles, meteors, tilt, wash), keep functional ones (tab indicator, accordion height, layout transitions).
3. **Theme-aware**: ALL colours use CSS custom properties from globals.css. Zero hardcoded hex.
4. **framer-motion** is the only animation library. CSS animations for repeating effects (shimmer, drift, grain). Framer-motion for interactive/entrance animations.
5. **Canvas performance**: `requestAnimationFrame`, pause on `document.hidden`, keep backgrounds under 2ms per frame.
6. **Don't restructure** the project. Don't rename files. Don't change the theme system. Enhance what exists.
7. **Don't touch backend/API routes.** This is frontend only.
8. **Fluid scaling**: The app uses a fluid scaling system — `font-size: clamp(14px, 0.625rem + 0.4vw, 22px)` on `:root`, fluid text utilities (`.text-fluid-*`), fluid spacing (`.p-fluid`, `.gap-fluid`), and fluid content widths (`.fluid-content-width`, `.fluid-narrow-width`, `.fluid-wide-width`). ALL sizing must use `rem` or the existing fluid classes — never hardcoded `px` for layout dimensions, font sizes, or spacing. This ensures the UI scales correctly from 1080p to 4K. The only exceptions are fine details like border widths (1px), icon sizes, and box-shadow values.

---

## Final Verification

After all work is complete:
1. `npm run build` — zero errors
2. Switch through all 6 themes — each background must be clearly visible and animated
3. Open a chat — input starts centred, animates down on first message, stays pinned after
4. Open every dropdown/select in the app — all must be glassmorphic, animated, no oversized rectangles
5. Toggle every switch — thumb and track aligned, trail animation works, particle burst fires
6. Navigate the sidebar — icons fully visible, active indicator slides, sections collapse smoothly
7. Hover over cards, buttons, badges — micro-interactions fire
8. Switch themes — colour wash effect plays, smooth colour transition, background crossfades
