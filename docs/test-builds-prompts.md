# Wiggum Test Builds — 10 Prompts + Follow-ups

These prompts are designed to stress-test different subsystems of Wiggum's build pipeline, Ralph's autonomous loop, quality gates, module resolution, write guards, preview rendering, and edge cases discovered during codebase analysis.

---

## Prompt 1: Multi-component Layout with Third-party Dependencies

**Tests:** ESM plugin CDN resolution, module caching, `@wiggum/stack` usage, Tailwind class compilation

> **Prompt:** "Build a personal portfolio site with a hero section, a project grid showing 6 cards with images, and a contact form. Use framer-motion for scroll animations and lucide-react for icons."

**Follow-up:** "Add a dark mode toggle that persists across page reloads using localStorage."

### What to watch for in console:
- `[LLM]` logs: Does the model receive tools correctly? Is `finish_reason` consistently `tool_calls` or `stop`?
- ESM fetch logs: Do `framer-motion` and `lucide-react` resolve on esm.sh without 404s? Watch for redirect chains.
- Tailwind WASM: Does `tailwindcss-iso` compile all utility classes used by `@wiggum/stack` components? Look for unstyled elements in preview.
- Build cache: On the follow-up prompt, does the cache hit or miss? (Hash should change because files changed.)
- **Sticking point risk:** `lucide-react` icon names — Gate 5 (build-succeeds) has icon name suggestions (e.g., `Terminal2` → `Terminal`), but if Ralph picks an icon that doesn't exist in the esm.sh version, the build error enhancement may not cover it. Watch for unenhanced "export not found" errors.

---

## Prompt 2: CSS Theme Edge Cases

**Tests:** Gate 3 (css-theme-complete — 36 required vars), Gate 4 (no-hardcoded-colors), theme command, OKLCH generation

> **Prompt:** "Create a moody, dark cyberpunk dashboard with neon accent colors. I want glowing borders, a sidebar with navigation, and a main content area with stat cards."

**Follow-up:** "The neon colors aren't bright enough. Make the accents more vivid — almost painful to look at."

### What to watch for in console:
- Gate 3: Does Ralph generate all 36 CSS custom properties in both `:root` and `.dark` blocks? Missing sidebar vars (`--sidebar-*`) or chart vars (`--chart-*`) are a common miss.
- Gate 4: Does Ralph use hardcoded OKLCH/hex values directly in `.tsx` files instead of theme tokens? The regex at `color-gate.ts:9` catches `text-red-500` patterns, but custom OKLCH like `oklch(0.7 0.3 200)` inline should also be caught.
- Theme command: Does `theme generate` or `theme preset` work correctly? Watch for "command not found" if theme isn't registered properly.
- **Sticking point risk:** The follow-up asks for MORE vivid colors. Ralph might hardcode high-chroma OKLCH values directly in JSX instead of using `theme extend`. Gate 4 should catch this, but the feedback might not be specific enough about HOW to use theme extend for custom accent colors.

---

## Prompt 3: Multi-file Component Architecture

**Tests:** Write guards, file extension restrictions, directory creation, `mkdir -p` behavior, import resolution

> **Prompt:** "Build a task management app with these components in separate files: a TaskList, TaskCard, AddTaskForm, and a FilterBar. Use React state to manage tasks with add, delete, and filter by status (todo, in-progress, done)."

**Follow-up:** "Add drag-and-drop to reorder tasks within each column. Create a Kanban board layout."

### What to watch for in console:
- Write guards: Does `mkdir -p src/components/` succeed? Do all files get `.tsx` extensions? Watch for write guard rejections on unexpected extensions.
- FS plugin resolution: When `App.tsx` imports from `./components/TaskList`, does the FS plugin try `./components/TaskList.tsx`, `./components/TaskList/index.tsx`, etc.? Watch for "Could not resolve" errors.
- Build order: Does esbuild correctly bundle multiple files with circular-ish imports (e.g., `TaskCard` importing a type from `TaskList` and vice versa)?
- **Sticking point risk:** The follow-up asks for drag-and-drop, which typically requires a library like `@dnd-kit` or `react-beautiful-dnd`. These are heavy npm packages with complex module structures. The ESM plugin's redirect following may get tangled with packages that have many internal sub-imports. Watch for `esm.sh` resolution failures or "SyntaxError: Unexpected token" when the CDN returns an HTML error page instead of JS.

---

## Prompt 4: CSS-only Complexity (No New Components)

**Tests:** Gate 2 (css-no-tailwind-directives), write guards on CSS files, smart merge in executor, `src/index.css` content validation

> **Prompt:** "Don't change any components. Just restyle the existing app with a glassmorphism theme — frosted glass cards, blur backdrops, subtle gradients, and elegant shadows. Everything should feel like floating glass panels."

**Follow-up:** "Add a subtle animated gradient background that shifts colors slowly. Use CSS keyframes, not JavaScript."

### What to watch for in console:
- Gate 2: Does Ralph add `@tailwind` directives to `src/index.css`? The gate should block this, but the instruction "don't change components" might cause Ralph to focus entirely on CSS and accidentally add Tailwind directives.
- Content validation: `validateFileContent()` blocks `@import url()` in CSS. If Ralph tries to import a Google Font via CSS `@import`, it gets blocked. Watch for the write guard message.
- Smart merge: If `src/index.css` already has a `/* Generated by theme command */` block, the executor's smart merge logic kicks in. Watch for merge conflicts or lost theme variables.
- **Sticking point risk:** CSS `@keyframes` with custom properties might confuse the Tailwind WASM compiler if it tries to scan keyframe blocks for utility classes. Watch for Tailwind compilation warnings or missing animation styles in preview.

---

## Prompt 5: Error Recovery and Gate Failures

**Tests:** Gate failure escalation, auto-patch at 2+ failures, `feedback.md` loop, MAX_CONSECUTIVE_GATE_FAILURES

> **Prompt:** "Build a weather dashboard that fetches live data from a weather API. Show current temperature, humidity, wind speed, and a 5-day forecast with icons."

**Follow-up:** "The API calls are failing. Switch to mock data that looks realistic — random temperatures between 60-85°F, varying conditions."

### What to watch for in console:
- Gate 8 (runtime-errors): The initial prompt will likely cause runtime errors because `fetch()` to external APIs won't work from the preview iframe (CORS, sandbox restrictions). This should trigger Gate 8.
- Gate failure escalation: Watch `consecutiveGateFailures` increment. Does Ralph get the escalation text ("ACTION REQUIRED", "CRITICAL — ATTEMPT N OF 3")?
- Auto-patch: At 2+ failures, does the auto-patch system fix anything? Gate fixes are specific (create App.tsx, run theme preset), but runtime errors don't have auto-patches.
- **Sticking point risk:** The error collector's `waitForStable()` debounce. If the preview iframe keeps throwing CORS errors repeatedly, the error collector might never stabilize, causing Gate 8 to hang. Check if there's a timeout on `waitForStable()`. The follow-up prompt tests whether Ralph can pivot from a failing approach to mock data — this tests the `feedback.md` → re-read → fix cycle.

---

## Prompt 6: Write Guard Boundary Testing

**Tests:** Write guard rules, blocked paths, allowed extensions, `.ralph/` state writes

> **Prompt:** "Create a documentation site with multiple pages. I want an index page, an about page, a features page, and a getting-started guide. Use proper routing between them."

**Follow-up:** "Add a markdown renderer so I can write page content in .md files in a content/ directory."

### What to watch for in console:
- Write guards: Ralph might try to create `.html` files for pages (blocked by write guard rule 4). Watch for "HTML files are not allowed" rejection messages.
- Extension restrictions: Only `.tsx`, `.ts`, `.css`, `.json` are allowed in `src/`. If Ralph tries to create `.md` files in `src/content/`, the write guard should block with exit code 1.
- Path restrictions: Files outside `src/` are blocked (except `.ralph/` and `package.json`). If Ralph tries to create a `content/` directory at project root, it gets blocked.
- **Sticking point risk:** The follow-up specifically asks for `.md` files, which are NOT in the allowed extension list. Ralph needs to figure out an alternative (inline strings, JSON, or requesting a write guard exception). Watch whether the gate feedback explains this clearly enough for Ralph to pivot, or if it gets stuck in a loop trying to write `.md` files.

---

## Prompt 7: Large Build with Many Imports

**Tests:** ESM plugin caching, redirect cache, build performance, MAX_TOOL_CALLS_PER_ITERATION (50 limit)

> **Prompt:** "Build a full admin dashboard with: a sidebar navigation, a header with search and notifications, a data table with sorting and pagination, charts showing revenue and user growth, a user profile dropdown, and a settings page with form validation."

**Follow-up:** "Add a real-time notification system with a bell icon that shows unread count, a dropdown with notification cards, and toast notifications for new events."

### What to watch for in console:
- Tool call count: This is a large task. Does Ralph hit the MAX_TOOL_CALLS_PER_ITERATION (50) limit? If so, does the loop correctly break to the next iteration?
- ESM cache: Multiple chart libraries, form libraries, table libraries — each triggers ESM fetches. Watch for duplicate fetches of the same package (cache miss). The redirect cache should prevent re-fetching version ranges.
- Build time: With many files and external dependencies, esbuild compilation time increases. Watch for timeout-related issues.
- Iteration count: How many iterations does Ralph need? If it approaches MAX_ITERATIONS (20), something is wrong.
- **Sticking point risk:** If Ralph tries to install multiple npm packages (like `recharts`, `@tanstack/react-table`, `react-hook-form`), each one needs ESM resolution. Some packages have complex dependency trees that cause cascading esm.sh fetches. Watch for the "SyntaxError: Unexpected token" error when esm.sh returns an error page instead of JS.

---

## Prompt 8: Minimal Prompt (Ambiguity Handling)

**Tests:** Ralph's planning behavior, `intent.md` / `plan.md` writing, skill search, design brief creation

> **Prompt:** "Make something cool."

**Follow-up:** "I don't love the colors. Make it feel more premium."

### What to watch for in console:
- Skills search: Does Ralph `grep skill` to find inspiration? Watch for Orama search queries and results.
- Plan quality: Read `.ralph/plan.md` — does Ralph create a coherent plan from a vague prompt, or does it write a generic "I'll build a website" plan?
- Design brief: Does Ralph write a meaningful `design-brief.md` or skip it?
- Gate 6 (app-has-content): Does the result have genuine structure (sections, components, stack imports), or is it a minimal scaffold that barely passes?
- **Sticking point risk:** The follow-up "make it feel more premium" is purely aesthetic. Ralph needs to use `theme` commands and CSS changes, not restructure the app. Watch whether Ralph over-reacts and rebuilds everything, or makes targeted theme/style changes. Also watch if it hardcodes colors (Gate 4 violation) in trying to be "premium."

---

## Prompt 9: Build Error Cascade

**Tests:** Gate 5 (build-succeeds), build error enhancement, `build-errors.md` writing, error collector interaction

> **Prompt:** "Build a music player with a playlist sidebar, album art display, play/pause/skip controls, a progress bar, and a visualizer. Use the Web Audio API."

**Follow-up:** "Add a lyrics display that syncs with the current playback position. Show the current line highlighted."

### What to watch for in console:
- Build errors: `Web Audio API` types might not be available in the esbuild environment. Watch for TypeScript errors about `AudioContext`, `AnalyserNode`, etc.
- Error enhancement: Does `enhanceBuildError()` in gates.ts provide useful suggestions for Web Audio API type issues, or just show raw "Cannot find name 'AudioContext'"?
- Runtime errors (Gate 8): Even if build succeeds, the preview iframe sandbox may restrict `AudioContext` creation. Watch for `NotAllowedError` or `SecurityError` at runtime.
- File writes: The visualizer likely needs canvas or SVG. Watch whether Ralph creates helper files with proper extensions.
- **Sticking point risk:** The Web Audio API requires user gesture to start in modern browsers. The preview iframe probably can't trigger this. Ralph might get stuck in a gate loop where Gate 8 catches "AudioContext was not allowed to start" on every iteration. The follow-up adds complexity (time-synced lyrics) that requires precise state management — a good test of whether Ralph can handle multi-concern components.

---

## Prompt 10: State Persistence and Follow-up Context

**Tests:** Ralph's stateless loop (files are memory), `.ralph/` state management, iteration continuity, summary quality

> **Prompt:** "Build a habit tracker where users can add daily habits, mark them complete for today, and see a 7-day streak calendar for each habit. Store everything in localStorage."

**Follow-up 1:** "Add a statistics page that shows completion percentages, longest streaks, and a chart of daily completion rates over the last 30 days."

**Follow-up 2:** "The streak calendar is wrong — it's showing future dates. Fix it so it only shows today and the 6 previous days."

### What to watch for in console:
- Stateless design: Each follow-up is a fresh Ralph iteration. Does Ralph correctly read the existing codebase (via `cat`, `ls`, `find`) before making changes? Or does it overwrite files assuming a blank slate?
- `.ralph/task.md`: Does the follow-up correctly update the task file, or does it append? The harness controls this, not Ralph.
- Summary quality: Gate 7 (has-summary) requires `.ralph/summary.md` with 20+ characters. Does each iteration produce a meaningful summary?
- Bug fix behavior (Follow-up 2): This is a specific bug report. Does Ralph diagnose the date logic bug surgically, or does it rewrite the entire component? Watch for unnecessary file changes.
- **Sticking point risk:** The bug fix follow-up tests whether Ralph can read existing code, understand the date logic, and make a surgical fix. If Ralph rewrites the streak calendar from scratch, it might break other things (localStorage schema, component interfaces). Watch if the `filesChanged` array in shell results correctly tracks which files were modified.

---

## What to Observe Across All Tests

### Console Logs to Monitor

| Log prefix | What it tells you |
|-----------|-------------------|
| `[LLM]` | API request/response health, model, finish_reason |
| `[Ralph]` | Loop iteration, gate results, completion detection |
| `[Build]` | esbuild compilation, entry point discovery, plugin chain |
| `[ESM]` | CDN fetch, redirects, cache hits/misses |
| `[Tailwind]` | WASM compilation, class scanning, fallback status |
| `[Gate]` | Individual gate pass/fail, auto-patch attempts |
| `[WriteGuard]` | File write validations, blocked paths |

### Key Metrics to Track

1. **Iterations per task** — Healthy: 1-3. Concerning: 5+. Broken: hitting 20.
2. **Gate failure count** — Healthy: 0-1. Concerning: 2 (auto-patch triggers). Broken: 3 (abort).
3. **Tool calls per iteration** — Healthy: 5-20. Concerning: 30+. Broken: hitting 50 cap.
4. **ESM cache hit rate** — First build: all misses. Subsequent: should be mostly hits.
5. **Build time** — Should complete in seconds, not minutes.

---

## Powering Wiggum in a Secure Environment

### Current Architecture (Browser-Direct)

```
Browser → fetch() → LLM API (OpenAI/Anthropic/Ollama)
         ↑
         API key in localStorage (plaintext)
```

**Problems for secure deployment:**
- API keys exposed in browser memory and localStorage
- No server-side rate limiting or cost controls
- No multi-tenant isolation
- CORS restrictions limit which APIs can be called from browser
- No audit trail of API usage

### Recommended Architecture for Secure Deployment

```
Browser → Session Token → Wiggum Proxy (Hono/CF Worker) → LLM API
                              ↑
                          - API key vault (never sent to browser)
                          - Rate limiting per user
                          - Token counting & cost caps
                          - Audit logging
                          - Model allowlist
```

**Key changes needed:**

1. **Server-side proxy** (already spec'd in Phase D as "LLM proxy in Pro Mode"):
   - Hono route at `/api/chat` that forwards to configured LLM provider
   - API keys stored in environment variables or secrets manager, never in browser
   - User authenticates with session token; proxy maps to their org's API key

2. **Rate limiting & cost controls:**
   - Token counting middleware (count prompt + completion tokens per request)
   - Per-user daily/monthly budget caps
   - Model allowlist (e.g., only allow `gpt-4o-mini` for free tier, `claude-sonnet` for paid)

3. **Sandboxed execution:**
   - Preview iframe already runs in a sandbox (`sandbox` attribute on iframe)
   - esbuild runs in-browser via WASM (no server-side code execution)
   - File system is virtual (IndexedDB via LightningFS) — no real FS access
   - Shell commands are simulated, not real shell execution

4. **Multi-tenant isolation:**
   - Each user gets a separate IndexedDB namespace (already done via `projectId`)
   - API key per organization, not per user
   - Separate rate limits and cost tracking per tenant

5. **Audit trail:**
   - Log all LLM requests (prompt hash, token count, model, user) to a durable store
   - Track which files Ralph created/modified per session
   - `.ralph/reflections.jsonl` already captures post-task analysis — expose this to admins

### What's Already Safe

- **No server-side code execution** — all code runs in-browser WASM/JS
- **Virtual filesystem** — can't access real disk
- **Write guards** — prevent modification of critical files
- **Preview sandbox** — iframe isolation with CSP
- **Stateless loop** — each iteration starts fresh, no persistent memory leak vector
