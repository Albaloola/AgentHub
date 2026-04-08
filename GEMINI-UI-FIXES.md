# AgentHub UI Fix List

You already know this project. Here are all the UI issues I need you to fix. Work through them systematically, one section at a time. Test each change visually before moving on.

## 1. CHATBOX

**Files:** `src/components/chat/chat-input.tsx`, `src/app/(dashboard)/chat/[id]/page.tsx`

The chatbox has multiple problems:

- **Visibility when unfocused**: When I click away from the chatbox, it goes nearly invisible. It MUST always have a visible outline and a subtle ambient glow behind it (radial gradient, blurred, theme-accent colored). Never invisible.
- **Too tall**: The min-height of 120px is excessive. Bring it down to around 72-80px. Keep max-height 300px for expansion. Use `clamp()` for fluid scaling.
- **Too low on screen**: The chatbox sits too far down. When there's no conversation yet, the chatbox should be vertically centered in the viewport. Once the user sends the first message, animate it smoothly to the bottom using Framer Motion `layout` with spring.gentle. The background planet/particles should shift simultaneously.
- **Side buttons are rectangular and ugly**: The upload and expand buttons on the left side are rectangular and misaligned. Make them square with `h-10 w-10 rounded-xl`. Vertically center them with `items-center self-center`. Give them consistent hover glow matching the chatbox accent color.
- **Background glow**: Add a permanent subtle radial gradient glow behind the entire chatbox container. Theme-accent color, blur-3xl, low opacity.

## 2. SIDEBAR

**File:** `src/components/layout/sidebar.tsx`

- **Icons clipped on left edge**: In collapsed mode, the leftmost pixels of icons are being cut off. Increase left padding from `px-2` to `px-3` or adjust icon container margins. Everything needs to shift to the right slightly.
- **Expanded mode too**: Even in expanded mode, shift content right slightly. Add `pl-1` or increase padding.
- **Combine Reorder + Configure buttons**: Replace both buttons (~lines 856-878) with a SINGLE "Edit" / "Done" toggle button. When active: enable drag-and-drop on nav items. Items should be draggable with smooth snap animations -- drag an item and others reflow around it. This should work for both items within groups AND for reordering groups themselves. Visibility toggling (what shows/hides) should move to the Settings panel, not be on the sidebar.

## 3. DASHBOARD / MISSION CONTROL

**File:** `src/app/(dashboard)/page.tsx`

- **No scrolling**: The dashboard content overflows on smaller/minimized screens with no way to scroll. Change the container from `overflow-hidden` to `overflow-y-auto` with `scrollbar-thin scrollbar-thumb-rounded`.
- **Fluid scaling**: Reduce gaps and padding on smaller screens. Use `gap-3 sm:gap-4` on the stat cards grid. Use `p-4 md:p-6` for responsive padding.
- **Agent Status panel**: When there are many agents, add `max-h-[400px] overflow-y-auto` to the agent list so it scrolls within its card rather than pushing everything down.

## 4. AGENT CARD BUTTONS

**File:** `src/app/(dashboard)/agents/page.tsx`

- **Rectangular buttons are hideous**: The Chat, Health Check, Edit, and Delete buttons (~lines 399-409) are rectangular and poorly distributed. Fix:
  - Make ALL buttons `rounded-xl` with proper border radius
  - Icon-only buttons: `h-10 w-10 aspect-square rounded-xl`
  - Chat button with text: `rounded-xl px-4 h-10`
  - Center the entire button group: `flex items-center justify-center gap-2`
  - Equal spacing between all buttons
- **Fix animations**: Replace `hover:scale-105` with Framer Motion `whileHover={{ scale: 1.05 }}` and `whileTap={{ scale: 0.92 }}` for proper spring physics. Add stagger entrance when the card appears.

## 5. SETTINGS PANEL

**File:** `src/components/settings/settings-modal.tsx`

### Theme cards
- Not all theme cards are aligned. Ensure the grid uses consistent sizing with `items-stretch` so all cards are the same height. Fix any icon overflow issues with proper `shrink-0` and sizing.

### Toggles
**File:** `src/components/ui/switch.tsx`

- The toggles start with a strong accent color and turn faint after toggling. This is backwards. ALL toggles should use the faint/subtle accent color. The colored portion should appear at the END of the toggle track (trailing behind the thumb), not filling the whole track strongly.

### Layout panel
- **Font size slider**: Add more granular steps -- 1px increments with tick marks or number labels. Currently the jumps are too coarse.
- **Per-category font sizing**: Add SEPARATE font size controls for Title, UI elements, and Chat text below the global slider. Each should be independently adjustable.
- **Font family**: If there are per-category font pickers (Title, Chat), the global font family selector is redundant. Either remove it or make it a "default" that per-category overrides. Make sure ALL listed fonts actually load and look visually different from each other.
- **Compact / Comfortable / Spacious**: These three density options currently DO NOTHING. Wire them up:
  - Compact: tighter padding, smaller gaps, denser layout
  - Comfortable: current default spacing
  - Spacious: larger padding, more breathing room, generous gaps
  - Apply via CSS custom properties that cascade through the UI

### Reset button
- Currently sits in the sidebar tab navigation and auto-activates immediately on click. This is dangerous.
  - Move it INSIDE a tab (bottom of General tab)
  - On click: show a confirmation dialog: "Reset all settings to default? This cannot be undone."
  - Only reset AFTER user confirms

## 6. TITLE BAR

**File:** `src/components/layout/contextual-topbar.tsx`

- **Remove the dent**: There's a `clipPath: polygon(...)` creating a V-shaped dent in the center of the title bar. Remove it. Make it a solid bar. Keep the gradual transparency in the center compared to the edges.
- **Add date and time**: Display the current date and time centered in the title bar. Use system clock, update every minute. Use a clean monospace or sans-serif font.
- **Date format config**: Add a date/time format option to the Settings General tab -- DD/MM/YYYY vs MM/DD/YYYY. The clock should sync with the system automatically.

## 7. AGENTHUB ICON

**File:** `src/components/layout/sidebar.tsx` (~lines 809-814)

- Reimagine the AgentHub logo. The current one is just a generic `Bot` icon from lucide-react in a gradient box. Design a custom SVG that represents agent orchestration -- think interconnected nodes, a hub/spoke pattern, or a constellation motif. Keep the gradient background and glow shadow.

## 8. NOTIFICATION CENTER

**File:** `src/components/notifications/notification-center.tsx`

- The notification panel currently shows "No notifications" and doesn't receive any real events.
  - Wire it up to receive: agent errors, task completions, cron job results, webhook triggers, system messages (Next.js/Node errors)
  - Add a "Notifications" tab in the Settings panel where users can toggle each notification type on/off
  - Make the unread badge actually reflect real unread count

## ORDER OF OPERATIONS

Work through these in order: 1 > 2 > 3 > 4 > 5 > 6 > 7 > 8. Test each section visually before moving to the next. Don't skip ahead.
