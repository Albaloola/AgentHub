Reusable React components. Organised by feature area so that "the code for X
feature" lives in one place.

```
components/
├── ui/              ← shadcn/base-ui primitives — the design-system layer.
│                     Button, Dialog, Tooltip, Select, Input, Toast, etc.
│                     AVOID app logic here. Pure visual primitives only.
│
├── layout/          ← The app shell — things visible on every page.
│                     sidebar.tsx, topbar.tsx, chat-tabs.tsx, etc.
│
├── chat/            ← The chat experience (used by /chat/[id]).
│                     Message list, composer, artifacts panel, trace panel,
│                     extended-thinking view, streaming indicators.
│
├── agents/          ← Agent management UI.
├── workflows/       ← Visual workflow canvas.
├── analytics/       ← Charts, stat cards, leaderboards.
├── settings/        ← Settings modal (large — has a TOC banner at the top).
├── search/          ← Command palette + global search.
├── shortcuts/       ← Keyboard shortcut registry + help dialog.
├── tags/            ← Tag picker and editor.
├── templates/       ← Template browser.
├── whiteboard/      ← Whiteboard editor.
└── notifications/   ← Notification center.
```

## Import conventions

```typescript
import { Button } from "@/components/ui/button";          // design system
import { Sidebar } from "@/components/layout/sidebar";    // shell
import { useStore } from "@/lib/frontend/store";          // state
import { getAgents } from "@/lib/frontend/api";           // backend calls
import { cn } from "@/lib/frontend/utils";                // class merging
```

Never:
- `import ... from "@/lib/backend/..."` — server-only, will break the bundle.
- Fetch directly with `fetch(...)` — use `@/lib/frontend/api` wrappers so every
  call gets the same error handling.

## Adding a new feature

1. Create `components/<feature>/` and put the components inside.
2. Add an entry for it here in this README so it's findable.
3. If it has a dedicated page, also create `app/(dashboard)/<slug>/page.tsx`
   and thread it through `sidebar.tsx → NAV_CATEGORIES`.
