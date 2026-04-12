Frontend-only library code.

Everything in this folder runs in the **browser**. It is safe to import from
React components, Next.js client pages, and the rest of the frontend layer.

**Never import this folder from `backend/` or from server-side API route
handlers.** The `"use client"` pragma at the top of most files and the
dependency on browser globals (`fetch`, `window`) would break SSR or cause
hydration mismatches.

## Files

| File               | Responsibility                                                  |
|--------------------|-----------------------------------------------------------------|
| `api/`             | Typed fetch wrappers that call the `/api/*` endpoints.         |
| `store.ts`         | Global Zustand store — agents, conversations, UI state.        |
| `hooks.ts`         | Shared React hooks (debounced state, media queries, etc.).    |
| `themes.ts`        | Theme definitions and `applyTheme()` — writes CSS variables.   |
| `animation.ts`     | Framer-motion `Variants` presets and easing curves.            |
| `status-colors.ts` | Theme-aware colours for agent status pills (online/busy/etc.). |
| `use-canvas-bg.ts` | Hook for the animated canvas background on the dashboard.      |
| `utils.ts`         | `cn()` class merger + `getInitials`, `getAvatarColor`.         |
