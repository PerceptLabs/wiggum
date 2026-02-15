# Wiggum — Master Reference Document

> **Last updated:** 2026-02-11
> **Purpose:** Compaction-surviving reference for all Claude instances working on Wiggum.
> **Rule:** NEVER edit files on the user's local machine unless explicitly asked. Read-only by default. Ask permission before edits. List all changes after.

---

## 1. What Is Wiggum?

Wiggum is a **fully browser-based AI coding IDE** built for AI agents, not retrofitted for them. Unlike traditional AI chat interfaces, Wiggum takes a task and runs with it autonomously through the **Ralph loop** — an iterative execution system where each iteration gets fresh context, reading state from files rather than accumulating conversation history.

**Tagline:** *"Oops! It's All Loops."* (Ralph Wiggum / The Simpsons)

**Core insight:** Traditional AI coding tools suffer from the "malloc without free" problem — context grows monotonically until it overflows. Ralph solves this by treating files as memory and starting each iteration clean.

**License:** MIT

---

## 2. Architecture Overview

### Monorepo Structure

```
wiggum/
├── apps/
│   └── ide/                    # @wiggum/ide — the main application
│       ├── src/
│       │   ├── App.tsx         # Routes: /, /project/:id, /settings/*
│       │   ├── main.tsx        # Entry point, imports neobrutalist theme
│       │   ├── index.css       # Wiggum IDE's own styles
│       │   ├── components/
│       │   │   ├── chat/       # ChatPane, ChatInput, MessageList, AssistantMessage,
│       │   │   │               # UserMessage, StreamingMessage, ToolCallDisplay, ChatContext
│       │   │   ├── files/      # FileTree, FileEditor, CodeEditorPane, PreviewPane
│       │   │   ├── layout/     # AppLayout, Header, LayoutContext, LogsPanel
│       │   │   └── preview/    # ExportButton
│       │   ├── contexts/       # FSContext, AIContext, SessionContext, ProjectContext
│       │   ├── hooks/          # useAIChat, useFileTree, useFileContent, usePreview,
│       │   │                   # useGit, useLocalStorage, useTheme
│       │   ├── lib/
│       │   │   ├── ralph/      # THE CORE — loop, state, gates, skills, gaps, reflection
│       │   │   ├── shell/      # Virtual shell — executor, parser, write-guard, 37 commands
│       │   │   ├── build/      # esbuild-wasm compilation, esm.sh plugin, lockfile resolution
│       │   │   ├── preview/    # chobitsu-bridge, error-collector, console-collector,
│       │   │   │               # structure-collector, console-store
│       │   │   ├── llm/        # OpenAI-compatible client (plain fetch, no SDK)
│       │   │   ├── fs/         # LightningFS adapter (JSRuntimeFS interface)
│       │   │   ├── git/        # isomorphic-git wrapper
│       │   │   ├── search/     # Orama full-text search
│       │   │   ├── skills/     # Skill parser, loader, registry, types
│       │   │   ├── logger/     # LogTape with "fingers crossed" buffering
│       │   │   └── types/      # observability.ts — shared types
│       │   ├── pages/          # Home, Workspace, Settings (General/Integrations/Advanced)
│       │   ├── skills/         # SKILL.md files — frontend-design, code-quality,
│       │   │                   # creativity, theming, ralph (with references/)
│       │   └── test/           # Test utilities
│       └── package.json
├── packages/
│   └── stack/                  # @wiggum/stack — shared UI component library
│       ├── src/
│       │   ├── components/ui/  # 53 shadcn/ui components on Radix primitives
│       │   ├── hooks/          # 8 shared hooks (click-outside, debounce, disclosure, etc.)
│       │   ├── lib/            # cn() utility (clsx + tailwind-merge)
│       │   └── styles/
│       │       ├── globals.css
│       │       └── themes/neobrutalist.css
│       ├── SKILL.md            # Authoritative component documentation
│       ├── tokens.json         # Design tokens
│       └── registry.json       # Component registry
├── docs/                       # Architecture, getting-started, ralph-loop, skills, stack
│   └── plans/                  # skill-consolidation-and-grep.md
├── scripts/
│   └── bundle-stack.ts         # Pre-bundles @wiggum/stack for the IDE
├── tmp/                        # 12 curated theme presets (JSON)
├── CLAUDE.md                   # Git snapshot workflow instructions for Claude Code
├── MODEL_TESTING_FINDINGS.md   # LLM compatibility testing results
└── package.json                # Monorepo root (pnpm workspaces)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build (IDE) | Vite 7 |
| Build (Preview) | esbuild-wasm (in-browser compilation) |
| Styling | Tailwind CSS 4 + CSS variables |
| State | @tanstack/react-query |
| Components | 53 shadcn/ui components (Radix primitives) |
| Filesystem | LightningFS + IndexedDB persistence |
| Version Control | isomorphic-git |
| Dependencies | esm.sh (no node_modules in user projects) |
| Search | Orama (BM25 + typo tolerance) |
| Logging | LogTape with fingers-crossed sink |
| Runtime Errors | Chobitsu (Chrome DevTools protocol in-browser) |
| LLM Client | Plain fetch, OpenAI-compatible (works with OpenAI, Anthropic proxy, Ollama, etc.) |
| Package Manager | pnpm 9 (monorepo workspaces) |

---

## 3. The Ralph Loop — Core Engine

### How It Works

1. **Task capture** → User message becomes `.ralph/task.md`
2. **Iteration** → LLM reads task + progress from files, executes via shell tool
3. **Fresh context** → Each iteration starts clean (no conversation history accumulation)
4. **Completion** → LLM writes `"complete"` to `.ralph/status.txt`, triggers quality gates
5. **Gate feedback** → If gates fail, feedback written to `.ralph/feedback.md`, loop retries
6. **Reflection** → Optional post-task LLM survey captures harness friction data

### The .ralph/ Directory (Files as Memory)

```
.ralph/
├── origin.md       # Immutable project concept (harness-written, Ralph reads only)
├── task.md         # Current task (reset each loop)
├── intent.md       # Ralph writes: what it's building
├── plan.md         # Ralph writes: design direction + implementation steps
├── summary.md      # Ralph writes: what was built (REQUIRED before completion)
├── feedback.md     # Harness writes: gate failure details
├── status.txt      # "running" | "complete" | "waiting"
├── iteration.txt   # Current iteration number
├── errors.md       # Auto-captured runtime errors
├── build-errors.md # Auto-captured build errors
├── console.md      # Auto-captured console output
├── output/index.html      # Static render HTML (written by preview command + quality gate)
├── reflections.jsonl      # Post-task reflection data
└── gaps.jsonl             # Command-not-found tracking
```

### Key Constants

- `MAX_ITERATIONS`: 20
- `MAX_TOOL_CALLS_PER_ITERATION`: 50
- `MAX_CONSECUTIVE_GATE_FAILURES`: 3

### Quality Gates (in order)

1. **app-exists** — `src/App.tsx` must exist
2. **css-no-tailwind-directives** — No `@tailwind` in CSS (browsers can't process them)
3. **css-has-variables** — `:root` must define `--primary`, `--background`, etc. (auto-fix available after 2 failures)
4. **build-succeeds** — esbuild compilation passes (enhanced error messages for lucide/stack imports)
5. **app-has-content** — App.tsx is not unchanged scaffold; has stack imports or 3+ JSX components
6. **has-summary** — `.ralph/summary.md` exists with 20+ chars
7. **runtime-errors** — No runtime JS errors (via error collector / chobitsu)
8. **console-capture** — Informational, always passes, writes `.ralph/console.md`
9. **rendered-structure** — Informational, always passes, writes static render to `.ralph/output/index.html`

### Write Guard (Harness Enforcement)

Hard blocks enforced at the shell level (not suggestions to the LLM):
- **index.html is LOCKED** — Cannot modify (contains Tailwind CDN config)
- **No .html/.htm files** — React-only environment
- **CSS must be in src/** — No root-level CSS
- **Only .tsx, .ts, .css, .json** allowed in src/
- **No @import url()** in CSS — Use `/* @fonts: FontName:wght@400;500 */` comment syntax
- **No @tailwind directives** — Tailwind utilities work via CDN, directives don't

### Text-in-Response Detection

The harness detects when LLMs write shell commands in prose instead of making tool calls (common with models like Cogito). Patterns detected: JSON tool calls in text, heredocs in text, redirects in text, 3+ commands in code blocks. Triggers retry with tool-usage feedback, does NOT count as gate failure.

---

## 4. Shell System

### Architecture

`ShellExecutor` manages command registration and execution with:
- **Piping** (`cmd1 | cmd2`)
- **Chaining** (`cmd1 && cmd2`, `cmd1 || cmd2`)
- **Redirects** (`cmd > file`, `cmd >> file`)
- **Heredocs** (`cat > file << 'EOF'...EOF`)
- **Glob expansion** (picomatch)
- **Path normalization** (strips `/tmp/`, converts absolute to relative)
- **Command redirects** (helpful alternatives for npm, node, curl, python, etc.)
- **Gap tracking** (records command-not-found for analysis)

### 37 Registered Commands

**File I/O:** cat, echo, touch, mkdir, rm, rmdir, cp, mv
**Navigation:** ls, pwd, tree, find, basename, dirname, paths
**Text Processing:** grep, head, tail, wc, sort, uniq, diff, sed, cut, tr, tac
**Search/Replace:** grep (3 modes: skill/code/regex), replace (exact literal swap)
**Version Control:** git
**System:** date, env, whoami, which, true, false, clear, stat
**Preview:** console, preview (builds project + captures DOM)

### grep Modes

- `grep skill "<query>"` — Semantic search across skills (Orama-indexed)
- `grep code "<query>"` — Semantic search across project files
- `grep "<pattern>" <file>` — Standard regex match on file

### Special Commands

- `cat @wiggum/stack` — Lists all available components and hooks
- `replace src/file.tsx "old" "new"` — Exact literal string swap (no escaping)
- `replace -w` — Whitespace-tolerant matching
- `sed -w` — Whitespace-tolerant matching
- `preview` — Builds project and captures rendered DOM snapshot
- `paths` — Shows writable directories and allowed extensions

---

## 5. @wiggum/stack — Component Library

53 production UI components built on Radix primitives, theme-agnostic via CSS variables.

### Components (alphabetical)

Accordion, AlertDialog, Alert, AspectRatio, Avatar, Badge, Breadcrumb, ButtonGroup, Button, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Command, ContextMenu, Dialog, Drawer, DropdownMenu, Empty, Field, Form, HoverCard, InputGroup, InputOTP, Input, Item, Kbd, Label, Menubar, NavigationMenu, Pagination, Popover, Progress, RadioGroup, Resizable, ScrollArea, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Sonner (toast), Spinner, Switch, Table, Tabs, Textarea, ToggleGroup, Toggle, Tooltip

### Shared Hooks

use-click-outside, use-copy-to-clipboard, use-debounce, use-disclosure, use-local-storage, use-media-query, use-mobile, use-mounted

### Key Dependencies

Radix UI (16 primitives), @tanstack/react-table, @tanstack/react-virtual, react-hook-form + zod, class-variance-authority, clsx + tailwind-merge, cmdk (command palette), embla-carousel, react-day-picker, recharts, sonner, vaul (drawer)

### Design Philosophy

- **Theme-agnostic** — Components consume CSS variables, never hardcode colors
- **Style-agnostic** — No baked-in neobrutalism; Wiggum IDE uses it, user projects don't
- **Ralph NEVER writes raw HTML** when a stack component exists (`<Button>` not `<button>`)

---

## 6. Skills System

Skills are curated expert knowledge files in Anthropic's SKILL.md format. They're **bundled at build time** via Vite's `?raw` import and written to `.skills/` on each Ralph initialization for `cat` access.

### Current Skills (priority order)

| ID | Topics | Priority |
|----|--------|----------|
| frontend-design | Design thinking, aesthetic direction, anti-slop philosophy | 0 |
| stack | Components, imports, project structure (from packages/stack/SKILL.md) | 1 |
| code-quality | React patterns, accessibility, dark mode, overlays | 2 |
| theming | CSS variables, colors, animations, dark mode | 3 |
| creativity | Layout patterns, design variety, motion | 4 |

### Key Change: Context Reduction

Skills were previously dumped into every prompt (~800 lines). Now they're searchable via `grep skill "<query>"` using Orama, with only a ~30-line summary table in the system prompt. This prevents Ralph from ignoring critical guidelines due to context overload.

---

## 7. Build System

### How Preview Works

1. **esbuild-wasm** compiles TSX/TS in-browser
2. **esm.sh plugin** resolves external imports (react, lucide-react, etc.)
3. **@wiggum/stack plugin** provides bundled stack components (pre-built by `scripts/bundle-stack.ts`)
4. **fsPlugin** reads from LightningFS virtual filesystem
5. **lockfile system** manages version resolution for esm.sh packages
6. **Tailwind CDN** loaded in index.html with CSS variable-aware config
7. **Preview iframe** renders the compiled output

### Font Loading

Ralph adds `/* @fonts: Inter:wght@400;500;600 */` comments in `src/index.css`. The preview system parses these and auto-injects `<link>` tags. `@import url()` is **blocked** because esbuild can't process external URLs.

### Import Validation

The build system validates imports against known packages and provides helpful error messages for common mistakes (wrong lucide icon names, missing stack exports, etc.).

---

## 8. Theming

### Current State (HSL, ~20 variables)

Ralph writes CSS variables in `src/index.css` of user projects. The base set:
`--background, --foreground, --primary, --primary-foreground, --secondary, --secondary-foreground, --muted, --muted-foreground, --accent, --accent-foreground, --destructive, --destructive-foreground, --card, --card-foreground, --popover, --popover-foreground, --border, --input, --ring, --radius`

### Planned: Sacred Geometry OKLCH Theme Generator

A `theme` shell command that produces **50+ CSS variables** per theme using OKLCH color science with guaranteed WCAG AA contrast ratios. This replaces the 20-variable HSL system with comprehensive design personality control covering colors, fonts, shadows, spacing, and layout properties.

**12 curated theme presets** in `tmp/`:
bubblegum, caffeine, catppuccin, cyberpunk, doom-64, elegant-luxury, mocha-mousse, mono, northern-lights, retro-arcade, soft-pop, tangerine

These demonstrate the creative range: Doom-64 has harsh shadows (0.4 opacity) with zero border-radius for industrial aesthetics, while Soft-pop uses gentle shadows (0.05 opacity) with 1rem radius for bubbly friendliness.

---

## 9. Observability

### Gap Tracking

Records when Ralph tries commands that don't exist (command-not-found errors) to `.ralph/gaps.jsonl`. Aggregates by command for analysis. Helps identify missing shell capabilities.

### Reflection Capture

After successful tasks (optional, configurable), a separate LLM call gathers structured feedback:
- Difficulty ratings (overall, finding commands, file ops, debugging) — 1-5 scale
- Friction points (command that caused friction, expected vs actual, suggestion)
- Wished-for capabilities
- Confusing parts
- Workarounds used
- Would-recommend boolean
- Freeform comments

Stored in `.ralph/reflections.jsonl`.

### Error Collection

- **Runtime errors** — Chobitsu bridge intercepts preview iframe JS errors
- **Build errors** — Enhanced with actionable suggestions (lucide icon alternatives, stack component fixes)
- **Console capture** — Errors, warnings, and context breadcrumbs
- **DOM structure** — Rendered tree snapshot for verification

---

## 10. LLM Client

Minimal OpenAI-compatible client using plain `fetch`. No SDK dependency.

**Supports:** OpenAI, Anthropic (via proxy), Ollama, and any OpenAI-compatible endpoint.

**Features:**
- Retry with exponential backoff (3 retries, 1s initial delay, 2x multiplier, jitter)
- Retryable status codes: 429, 500, 502, 503, 504
- Respects Retry-After header
- Streaming explicitly disabled (`stream: false`) — required for Ollama compatibility
- AbortSignal support for cancellation

---

## 11. Model Testing Findings

Tested models and key observations:

| Model | Completed | Key Issue |
|-------|-----------|-----------|
| GLM 4.7 | ✅ | Dropped command verbs mid-session, heredoc-heavy |
| Kimi K2.5 | ✅ | Cleanest run, discovered `\|\| echo` pattern independently |
| Qwen3-Coder | ✅ | Dir/file confusion, cleanup loops |
| Gemini 2.5 Pro | ❌ | Loop death spiral, burned 20 requests on grep loops |
| MiniMax M2.1c | ✅ | Tried natural language commands |

Common wishes across models: preview/rendered output, grep across files, sed, better editing, npm/yarn alternative.

---

## 12. Development Workflow

### For Claude Code (CC)

CC prompts describe **patterns, concepts, and files to edit** — not copied code. This is clean room implementation to avoid licensing issues (e.g., AGPL). File editing requires explicit permission.

### Git Workflow

From CLAUDE.md: "push" / "snapshot" / "checkpoint" means:
1. `git add -A`
2. `git commit -m "Snapshot: <description>"`
3. `git branch snapshot-YYYY-MM-DD-<short-description>` (WITHOUT switching)
4. `git push origin snapshot-YYYY-MM-DD-<short-description>`
5. Stay on current branch

---

## 13. Known Dead Code & Pending Work

### Dead Code
- **RalphContext.tsx** — Nothing imports it. Live path is `useAIChat.ts` which wires `gateContext={errorCollector, structureCollector}` correctly. Should be deleted.

### Pending Plans
- **14-step CC mega plan** — Covers stale descriptions cleanup, dead code removal, 11 new shell commands (sed already done, Orama integration pending), glob expansion improvements. NOTHING executed yet.
- **Sacred geometry theme generator** — CC prompt `cc-theme-generator.md` ready. Priority item.
- **Wiggum powerup plan** — 5-phase plan covering PWA shell precaching, ESM module caching, build intelligence, browser Tailwind compilation, design intelligence systems.
- **Package registry** — Orama-indexed, searchable via `grep package "drag and drop"`
- **Pre-packaged documentation** — `/mnt/docs/` structure for React, shadcn/ui, Hono reference materials

### Future Architectural Considerations
- OPFS migration from LightningFS for better performance
- Multi-agent orchestration via separate "Hive" product
- Full-stack capabilities using Hono as backend framework
- Enhanced preview system for multi-file apps
- Browser-based Tailwind compilation via oxide-wasm

---

## 14. Core Principles

1. **Explicit over magic** — Hidden framework magic confuses AI agents. Explicit patterns enable better code generation.
2. **Fresh context per iteration** — Prevents context bloat. State lives in files, not conversation history.
3. **Browser-native** — LightningFS, IndexedDB, esm.sh. Sandboxed execution, virtual filesystems, direct dependency visibility.
4. **Skills as grep-searchable knowledge** — Not dumped into prompts. Semantic search via Orama.
5. **Harness controls, not suggestions** — Write guards, quality gates, and completion validation are hard blocks, not LLM-honoring requests.
6. **Theme-agnostic components** — @wiggum/stack never bakes in aesthetic opinions. Ralph styles apps through CSS variables.
7. **One tool: shell** — Ralph's entire interface. Every file read, write, search, and build flows through it.
