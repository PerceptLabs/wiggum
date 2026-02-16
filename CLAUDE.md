# CLAUDE.md — Wiggum

## You Are Claude Code Working on Wiggum

Wiggum is a browser-native AI coding IDE. See the Architecture Quick Reference below for key file locations and structure. Read `docs/plans/wiggum-master.md` only when doing cross-cutting architectural changes — the quick reference covers daily work.

---

## Current Phase: C4 — Browser Tailwind (Complete)

**Hotfix applied:** Preview sandbox hardening (3-layer fix). IDE mount renamed to #ide-root, static render in Worker, bundle contamination guard.

<!-- AUTO-ADVANCE: When you complete a phase, update this block to the next -->
<!-- step from the Roadmap Overview below. Change the phase ID, title, and -->
<!-- doc list. Do NOT wait for a snapshot/push — do it as the last action -->
<!-- of every completed run. If I want to skip or reorder, I'll override. -->
<!-- See docs/plans/cc-implementation-timeline.md for the full roadmap. -->

**C4 complete.** Build-time Tailwind v4 via `tailwindcss-iso` (WASM). CDN stripped from all 5 HTML locations. Compiled CSS injected as `<style id="tailwind-build">`. `wasmFailed` cache for graceful fallback. OKLCH standardized.

**Do NOT read** other plan files in `docs/plans/` unless explicitly asked.

---

## How We Work

### The Rule

**Do NOT start coding immediately.** Every phase follows this process:

1. Read the spec docs listed above for the current phase
2. Explore the relevant parts of the codebase
3. **Make your own implementation plan** — don't just parrot the spec back
4. Flag anything in the spec that doesn't match the codebase as it exists today
5. Flag tighter coupling, missing files, or surprises you found
6. Propose your commit sequence and list every file you'll create, edit, or delete
7. **Present the plan and STOP. Wait for approval before writing code.**

The plan gets reviewed separately. Corrections come back to you. Then you execute.

### Questions & Suggestions

During planning, you SHOULD:
- Ask clarifying questions when the spec is ambiguous or conflicts with the codebase
- Suggest alternatives if you see a cleaner approach than what the spec describes
- Flag risks or tradeoffs the spec doesn't mention

You should NOT:
- Stall waiting for answers on things you can reason through yourself
- Ask permission for things already covered by the spec or this doc
- Turn every observation into a question — state your recommendation, note the alternative

### Why

The spec docs were written without your view of the codebase. Your job in the planning step is to find where the spec's assumptions don't match reality. Skipping to coding means missing those gaps.

### After Approval

Execute phase by phase. Test between phases. Stop after each phase and confirm it works before proceeding to the next.

### After Completing a Phase

As the last action of every completed run, update the "Current Phase" block at the top of this file:
- Change the phase ID and title to the next step from the Roadmap Overview
- Update the "Read for this phase" doc list to match the next phase
- This ensures the next session starts in the right place automatically

---

## Hard Rules

1. **Do NOT edit files without permission.** Default to exploring and reading. If edits are needed, propose them first. After making approved edits, list all files changed and what was modified.

   **Micro-edits allowed during planning (no approval needed):**
   - Typo fixes in comments or strings
   - Removing dead/unused imports
   - Adding TODO markers
   - Updating non-plan docs (README, CHANGELOG)

   **Still requires approval:** Any behavior change, new commands/gates, prompt changes, write-guard rules, or file creation.

2. **Explicit over magic.** Wiggum's core philosophy. No hidden framework conventions, no implicit behavior. If Ralph can't see it in the file system, it doesn't exist.

3. **One concern per session.** Don't start new initiatives outside the current phase. **Do fix necessary dependencies** to complete the current phase safely. Note unrelated issues, don't act on them.

4. **Never declare "done" after minimal work.** If the spec describes a multi-phase system and you only changed one file, you're probably not done. Verify every item in the phase spec's checklist. Run type check and tests.

---

## Architecture Quick Reference

### Monorepo Layout

```
wiggum/
├── apps/ide/          → Main IDE application (Vite + React)
├── packages/stack/    → @wiggum/stack component library (shadcn/ui + Radix)
├── docs/plans/        → Spec documents (feed to CC, not runtime)
└── scripts/           → Build helpers (bundle-stack.ts, etc.)
```

> All `src/` paths below are relative to `apps/ide/`. E.g. `src/lib/ralph/loop.ts` means `apps/ide/src/lib/ralph/loop.ts` from repo root.

### Key File Locations

| What | Where | Notes |
|------|-------|-------|
| Ralph loop | `src/lib/ralph/loop.ts` | Autonomous agent loop. 507 lines — read before editing, prefer surgical changes |
| Quality gates | `src/lib/ralph/gates.ts` | 9 gates, all run (no short-circuit). 435 lines — same caution |
| Shell executor | `src/lib/shell/executor.ts` | Piping, redirects, heredocs, glob expansion, write guards |
| Command registry | `src/lib/shell/commands/index.ts` | `registerAllCommands()` — add new commands here |
| Write guards | `src/lib/shell/write-guard.ts` | Hard blocks on forbidden paths/content. Order matters: `.ralph/` first |
| Live AI hook | `src/hooks/useAIChat.ts` | Wires gateContext, shell, and git. THIS is the live path (not RalphContext) |
| Skills system | `src/lib/ralph/skills.ts` | `?raw` imports, SKILLS array, Orama index |
| Build pipeline | `src/lib/build/esbuild.ts` → `esmPlugin` → preview cache | |
| FS layer | `JSRuntimeFS` interface → `LightningFSAdapter` → IndexedDB | |
| State files | `.ralph/` directory | task.md, plan.md, summary.md, iteration.txt, status.txt (5 of 13 — see wiggum-master.md §3 for full inventory incl. origin.md, intent.md, feedback.md, errors.md, etc.) |
| Skill files | `.skills/` directory | Written at init from bundled skills, readable via `cat .skills/X.md` |

### Build Flow

```
Source (src/) → esbuild-wasm → esmPlugin (resolves esm.sh) → preview-cache → iframe/tab
```

### Theme Flow

```
theme command → OKLCH vars to src/index.css → components consume via var(--primary) → Tailwind extends
Generator: seed + pattern → sacred geometry hues → OKLCH roles → contrast enforcement → CSS output
Presets: 12 curated themes (JSON) with light + dark + shared vars, ready to paste
```

---

## Coding Standards

### File Size Limits

| Threshold | Action |
|-----------|--------|
| 300 lines | Soft limit. Consider extracting helpers, types, or data. |
| 500 lines | Hard limit. Must split before adding more code. |

Large files already at or past limits (loop.ts 507, gates.ts 435): make surgical edits only. Do not rewrite entire files. When fixing a bug in these files, fix that bug — don't refactor adjacent code.

### Import Conventions

```typescript
// App layer (hooks, components, contexts, pages) — use @/ aliases
import { useFS } from '@/contexts'
import type { AIMessage } from '@/lib/llm'

// Lib internals (ralph/, shell/, build/, fs/) — use relative paths
import type { JSRuntimeFS } from '../fs/types'
import { resolvePath, basename } from './utils'

// External packages — import directly
import picomatch from 'picomatch'
import * as path from 'path-browserify'

// Skills — use ?raw suffix
import creativitySkill from '@/skills/ralph/creativity/SKILL.md?raw'

// Types — use `import type` when importing only types
import type { ShellCommand, ShellOptions, ShellResult } from '../types'
```

**Rule:** `@/` aliases resolve to `apps/ide/src/`. They work in app-layer code that Vite processes. Lib code uses relative paths because it's closer to the dependency (fewer hops to trace).

### Semicolons

No semicolons. Project convention.

### Error Handling in Shell Commands

```typescript
// CORRECT — propagate with context
errors.push(`mv: cannot move '${source}' to '${dest}': source not found`)

// CORRECT — conditional swallow (rm -f pattern)
if (!force) {
  errors.push(`rm: cannot remove '${target}': No such file or directory`)
}

// WRONG — silent swallow
} catch {
  // Nothing here — root cause hidden
}

// WRONG — generic dump
} catch (err) {
  errors.push(`command failed: ${err}`)  // Not helpful
}
```

If a catch block has no body, add a comment explaining WHY it's intentionally empty (e.g., `// File may not exist yet — expected for touch`).

### Utility Deduplication

Before writing a helper function, check if it already exists:

| Need | Use | Don't recreate |
|------|-----|---------------|
| Get filename from path | `basename()` from `commands/utils.ts` | Local `getBasename()` |
| Get directory from path | `dirname()` from `commands/utils.ts` | Local path splitting |
| Resolve relative path | `resolvePath()` from `commands/utils.ts` | Manual `cwd + '/' + path` |
| Glob matching | `picomatch` (already in deps) | Regex-based `matchGlob()` |
| Normalize path | `normalizePath()` from `commands/utils.ts` | Manual `.` and `..` resolution |

### Write Guard Requirement

**Every command that creates or modifies files MUST call `validateFileWrite()` before writing.** This includes: touch, cp, mv, sed, replace, and any new write commands. The executor handles guards for heredocs (`__write__`) and redirects (`>`/`>>`), but individual commands that call `fs.writeFile()` or `fs.rename()` directly must guard themselves.

```typescript
import { validateFileWrite, formatValidationError } from '../write-guard'

// Before any fs.writeFile() or fs.rename():
const validation = validateFileWrite(targetPath, cwd)
if (!validation.allowed) {
  return { exitCode: 1, stdout: '', stderr: formatValidationError(validation, targetName) }
}
```

### Parallel Await

```typescript
// CORRECT — parallel when operations are independent
const [fileA, fileB] = await Promise.all([
  fs.readFile(pathA, { encoding: 'utf8' }),
  fs.readFile(pathB, { encoding: 'utf8' }),
])

// WRONG — sequential when they don't need to be
const fileA = await fs.readFile(pathA, { encoding: 'utf8' })
const fileB = await fs.readFile(pathB, { encoding: 'utf8' })

// CORRECT — sequential when order matters (write then read)
await fs.writeFile(path, content)
const written = await fs.readFile(path, { encoding: 'utf8' })
```

---

## Test Requirements

### When to Write Tests

- New shell commands (test the `execute()` method)
- New quality gates (test the `check()` function)
- Complex logic in lib/ (parsers, validators, state management)
- Bug fixes (regression test before fixing)

### When to Skip Tests

- Simple UI components (unless they have complex logic)
- Template/scaffold changes
- Skills content (markdown files)
- One-off CC cleanup tasks

### Test Infrastructure

```
apps/ide/
├── vitest.config.ts         → Test runner config
├── src/lib/shell/__tests__/ → Shell command tests
└── src/lib/ralph/__tests__/ → Ralph system tests
```

Framework: Vitest + jsdom. FS mocking: `fake-indexeddb` for LightningFS. Pattern: AAA (Arrange, Act, Assert).

### Test Pattern for Shell Commands

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { YourCommand } from '../commands/yourcommand'

describe('YourCommand', () => {
  let cmd: YourCommand
  let fs: MockFS

  beforeEach(() => {
    cmd = new YourCommand()
    fs = createMockFS({
      '/project/src/App.tsx': 'export default function App() {}',
    })
  })

  it('does the expected thing', async () => {
    const result = await cmd.execute(['src/App.tsx'], {
      cwd: '/project', fs, stdin: undefined,
    })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('expected output')
  })

  it('returns error for missing file', async () => {
    const result = await cmd.execute(['nonexistent.tsx'], {
      cwd: '/project', fs, stdin: undefined,
    })
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('No such file')
  })
})
```

---

## Extension Points Guide

### Add a Shell Command

1. Create `src/lib/shell/commands/yourcommand.ts`
   - Implement `ShellCommand` interface (`name`, `description`, `execute`)
   - Import types from `../types`, utilities from `./utils`
   - If it writes files: import and use `validateFileWrite` from `../write-guard`
   - If it changes files: return `filesChanged` array in result

2. Register in `src/lib/shell/commands/index.ts`
   - Add import at top
   - Add `executor.registerCommand(new YourCommand())` in `registerAllCommands()`
   - Add command name to the `allCommandNames` array (for `which` command)
   - Add re-export at bottom

3. Update tool description in `src/lib/ralph/loop.ts`
   - Find the `SHELL_TOOL` definition
   - Add your command to the description string so Ralph knows it exists

### Add a Quality Gate

1. Edit `src/lib/ralph/gates.ts`
   - Add a new gate object to the `QUALITY_GATES` array
   - Each gate has: `name`, `description`, `check(fs, cwd, gateContext?)` → `GateResult`
   - All gates run every time (no short-circuit) — order doesn't matter for correctness, but put fast gates first

2. Gate results: `{ pass: true }` or `{ pass: false, message: '...' }`

### Add a Skill

1. Create `src/skills/ralph/yourdomain/SKILL.md`
   - Use YAML frontmatter: `name`, `description`, `triggers` (array of search terms)
   - Markdown body with guidance

2. Wire in `src/lib/ralph/skills.ts`
   - Add `?raw` import: `import yourSkill from '@/skills/ralph/yourdomain/SKILL.md?raw'`
   - Add to `SKILLS` array with `id`, `content`, `priority`

3. Skill is now searchable via `grep skill "query"` (Orama indexes frontmatter + content)

### Add an esbuild Plugin

1. Create plugin in `src/lib/build/plugins/`
2. Wire into `src/lib/build/esbuild.ts` in the plugins array
3. Plugin receives `build.onResolve` / `build.onLoad` hooks

### Extend Write Guards

1. Edit `src/lib/shell/write-guard.ts` → `validateFileWrite()`
2. **Order matters:** `.ralph/` check is FIRST (allows state writes). Add new rules after `.ralph/` but before the final `src/` enforcement.
3. `validateFileContent()` — for content-level blocks (e.g., `@tailwind` directives)

### Add a Context Provider

1. Create in `src/contexts/`
2. Add to the provider chain in `src/contexts/index.tsx`
3. **Order matters** — providers higher in the tree are available to all providers below

### Add a Package to Monorepo

1. Create `packages/yourpackage/`
2. Add to `pnpm-workspace.yaml`
3. Create `scripts/bundle-yourpackage.ts` if it needs pre-bundling
4. Reference from apps/ide as `@wiggum/yourpackage: "workspace:*"` in package.json

---

## Diagnostic Checklist

When something goes wrong, check in this order:

### Build Fails

1. Check `src/lib/build/esbuild.ts` errors — most common: bad import path
2. Check `esmPlugin` — common: esm.sh URL format wrong, missing `external` config
3. Check `src/index.css` — syntax errors in CSS variables break the entire build
4. `preview` command output — it runs the build and reports structured errors

### Preview Blank / White Screen

1. Check `error-collector.ts` output — runtime errors that happen after build
2. Check `preview-cache.ts` — stale cache from previous build
3. Check `src/main.tsx` — must render to `#root`
4. Check browser console — if preview tab is open, errors show there
5. Check `static-render.ts` — if "contaminated bundle" in console, esbuild raced with file writes. Retry build.

### Shell Command Not Found

1. Check `commands/index.ts` — is it registered in `registerAllCommands()`?
2. Check the `allCommandNames` array — is the name listed for `which`?
3. Check `executor.ts` `COMMAND_REDIRECTS` — is it intentionally redirected?

### Quality Gate Failing Unexpectedly

1. Check `gateContext` wiring in `useAIChat.ts` — error/structure collectors must be passed
2. Check `gates.ts` — the specific gate's `check()` function
3. Gates run on `status === 'complete'` — if Ralph never writes "complete" to status.txt, gates never run

### Skill Search Returns Nothing

1. Check `skills.ts` — is there BOTH a `?raw` import AND an entry in the `SKILLS` array?
2. Check the YAML frontmatter — `triggers` array must contain searchable terms
3. Check Orama indexing — `getSearchDb()` builds the index lazily on first search

### Write Guard Blocking Valid Path

1. Check `write-guard.ts` → `validateFileWrite()` — rules are checked TOP TO BOTTOM
2. `.ralph/` is allowed FIRST. Then `package.json`. Then `index.html` is BLOCKED.
3. Files outside `src/` are blocked last — this catches everything else
4. Allowed extensions in `src/`: `.tsx`, `.ts`, `.css`, `.json` only

---

## Feedback Loop

When you fix a bug caused by missing guidance in this file:

1. Fix the bug
2. Identify what CLAUDE.md should have said to prevent it
3. Propose a rule addition in your commit message or plan output
4. The rule gets added in the next session

**Format:** `FEEDBACK: [category] — [rule]`

Examples:
- `FEEDBACK: write-guard — All file-creating commands must call validateFileWrite()`
- `FEEDBACK: imports — Use basename from utils.ts, don't create local getBasename()`

Don't just fix the code — fix the guidance that allowed the code to go wrong.

---

## Git Workflow — Snapshots

When I say "push", "snapshot", or "checkpoint":

1. `git add -A`
2. `git commit -m "Snapshot: <description>"` — use context from recent work
3. Create snapshot branch using **today's actual date**:
   ```bash
   # Bash / Git Bash:
   git branch "snapshot-$(date +%Y-%m-%d)-<short-description>"
   # PowerShell:
   git branch "snapshot-$(Get-Date -Format yyyy-MM-dd)-<short-description>"
   ```
4. Push it:
   ```bash
   # Bash / Git Bash:
   git push origin "snapshot-$(date +%Y-%m-%d)-<short-description>"
   # PowerShell:
   git push origin "snapshot-$(Get-Date -Format yyyy-MM-dd)-<short-description>"
   ```
5. **Stay on current branch** — do NOT checkout the snapshot
6. Tell me: what was committed, the snapshot branch name, and confirm I'm still on my working branch

These are frozen checkpoints. I never switch to them. I keep working on main.

**Always use `$(date +%Y-%m-%d)` for the date. Never hardcode a date.**

**Example** — if I say "push - shell stuff done":
- Commit: `Snapshot: shell improvements complete`
- Branch: `snapshot-<TODAY>-shell-improvements` (where TODAY is the actual date from the command)
- Push it
- Stay on main

---

## System Prompt Editing Guide

The `BASE_SYSTEM_PROMPT` in `loop.ts` is Ralph's identity. It's ~350 lines of carefully tuned text.

### Structure (in order)

1. **Identity** — "You are Ralph..." + core tenets
2. **Environment** — Available tools (shell), filesystem layout, what's in `.ralph/`
3. **Workflow** — Plan → execute → validate → iterate
4. **Shell reference** — Available commands, patterns, examples
5. **Skills** — How to search and use skills
6. **Rules** — Hard constraints (no HTML, no @tailwind, etc.)
7. **Quality awareness** — What gates check, how to self-validate

### Safe to Change

- Adding new commands to the shell reference section
- Adding new skills references
- Updating examples
- Adding new rules to the rules section

### Dangerous to Change

- **Identity section** — tone and persona affect output quality significantly
- **Workflow section** — Ralph's loop depends on writing to specific files in specific order
- **Tool definitions** — changing the shell tool schema breaks action parsing

### Invariants (Never Break)

- Ralph MUST have exactly one tool (shell) — adding tools breaks the action schema
- The action format MUST be the discriminated union defined in the tool
- `.ralph/status.txt` values: `running`, `complete`, `waiting` — gates trigger on `complete`
- The prompt MUST reference `.ralph/plan.md` — Ralph writes plans here, reads them next iteration

---

## Hono Prep Rules

> Pre-established guardrails for Phase D (full-stack). Even before Hono work begins, these prevent architectural conflicts.

### Progressive Stack Model

Frontend-only is the DEFAULT. Backend is additive, never required. A Wiggum project with no `src/api/` directory must work exactly as it does today.

### Directory Conventions

```
src/
├── api/           → Backend routes (Hono). Only exists if project uses backend.
│   └── index.ts   → Entry point. Presence of this file triggers dual-build.
├── shared/        → Shared types/schemas between frontend and API
│   └── schemas.ts → Zod schemas. Single source of truth.
└── (existing)     → App.tsx, components, sections, index.css
```

### Build Rules

- Frontend build: always runs (existing esbuild pipeline)
- Backend build: CONDITIONAL — only if `src/api/index.ts` exists
- Two separate esbuild passes. Never merge them.
- Backend targets Service Worker, not Node.js

### Schema-First Development

Zod schemas in `src/shared/` are the single source of truth. Frontend and API both import from shared. Never duplicate type definitions.

---

## Chief Prep Rules

> Pre-established guardrails for Phase F (conversational planner).

### Coordinator Pattern

Chief uses a `Coordinator` class (singleton via React context), NOT a hook with internal state. The Coordinator manages multi-turn conversation, tool dispatch, and plan generation.

### Separation from Ralph

- `.chief/` and `.ralph/` directories do NOT cross. Chief doesn't read `.ralph/`, Ralph doesn't read `.chief/`.
- `useChiefChat.ts` parallels `useAIChat.ts` but for multi-turn conversation (not autonomous loop)
- Chief tools are inline dispatch (direct function calls), NOT ShellExecutor commands

### UI Integration

Chief gets a tab in the IDE — two chat panel instances (Chief for planning, Ralph for execution), not a single merged interface.

---

## Roadmap Overview

Full details in `docs/plans/cc-implementation-timeline.md`.

```
Phase 0: Codebase Consistency Pass
  0A  Safety & Deduplication    ← wiggum-claude-md-additions.md (Phase 0 section)
  0B  Consistency Polish        ← wiggum-claude-md-additions.md (Phase 0 section)

Phase A: Foundation
  A1  Theme Generator           ← cc-theme-generato_updatedr.md
  A1.5 Durable Theme Application ← cc-theme-apply-spec.md
  A2  Mega Plan Cleanup         ← 14-step mega plan (prior chats)
  A3  Component Decision Tree   ← wiggum-powerup-plan.md §5A

Phase B: Recipe Content (after A1)
  B1  Gumdrops Infrastructure   ← gumdrops-ecosystem-design.md
  B2  Priority UI Recipes (10)  ← gumdrops-ecosystem-design.md
  B3  Remaining Recipes (28)    ← gumdrops-ecosystem-design.md
  B4  Personality Briefs        ← wiggum-powerup-plan.md §5B

Phase C: Build Infrastructure (parallel with B)
  C1  PWA Precache              ← wiggum-powerup-plan.md §Layer1
  C2  ESM Module Cache          ← wiggum-powerup-plan.md §Layer2
  C3  Build Intelligence        ← wiggum-powerup-plan.md §Layer3
  C4  Browser Tailwind          ← wiggum-powerup-plan.md §Layer4

Phase D: Full-Stack (after A1)
  D1  Hono Spike                ← hono-fullstack-plan.md
  D2  ZenFS Spike + Swap        ← zenfs-migration-plan.md
  D3  @wiggum/api + Build       ← hono-fullstack-plan.md Prompts 1-2
  D4  API Shell Commands        ← hono-fullstack-plan.md Prompt 3
  D5  API Recipes (6)           ← gumdrops-ecosystem-design.md + hono plan
  D6  Kill Preview Cache        ← zenfs-migration-plan.md Prompt 3
  D7  API Skills + Export       ← hono-fullstack-plan.md Prompts 4-5

Phase E: Composition Engine (after B2+ in production)
  E1  Structure + Atom YAML     ← gumdrops-manifesto.md
  E2  Compose + WFC Solver      ← gumdrops-manifesto.md
  E3  Harness Mode 3            ← gumdrops-manifesto.md
  E4  Affinity Scoring          ← gumdrops-manifesto.md

Phase F: Conversational Planner (independent, after D)
  F1  Coordinator + Hook        ← chief-implementation-plan.md Prompts 1-3
  F2  Tab UI                    ← chief-implementation-plan.md Prompt 4
  F3  Cross-Tab Intelligence    ← chief-implementation-plan.md Prompt 5
```

**You are here: C4 (complete).** Do not read ahead or work on future phases.

---

## Plan Docs Index

All in `docs/plans/`:

| File | Covers |
|------|--------|
| `wiggum-master.md` | Architecture, file structure, core principles. Read when touching core systems (loop, gates, executor, FS, build). |
| `cc-implementation-timeline.md` | Roadmap + workflow process. |
| `cc-theme-generato_updatedr.md` | Sacred geometry OKLCH theme generator. Phase A1. |
| `cc-theme-apply-spec.md` | Durable theme application — v4 CDN, --apply, gate, preset fixes. Phase A1.5. |
| `gumdrops-ecosystem-design.md` | 50 compositional recipes, 5 domains. Phases B1-B3, D5. |
| `gumdrops-manifesto.md` | WFC solver, structures, atom sets, harness. Phase E. |
| `wiggum-powerup-plan.md` | PWA, ESM cache, build intel, Tailwind, design intel. Phases A3, B4, C1-C4. |
| `hono-fullstack-plan.md` | Hono backend, Service Worker, @wiggum/api. Phases D1, D3-D4, D7. |
| `zenfs-migration-plan.md` | LightningFS → ZenFS/OPFS migration. Phases D2, D6. |
| `chief-implementation-plan.md` | Conversational planner agent. Phase F. |
| `wiggum-claude-md-additions.md` | Phase 0 task spec + consistency audit findings. Phase 0. |

---

## Known Issues

> Living section. Update as issues are found and fixed. Delete entries when resolved.

| ID | Category | Issue | Status |
|----|----------|-------|--------|
| K8 | File size | loop.ts (507 lines), gates.ts (435 lines) exceed comfortable CC editing range | Monitor — surgical edits only |
| K9 | Preview | Static render executes in Worker — DO NOT move blob import() back to main window | Fixed |

**Resolved:**
- K1 (Dead code): `RalphContext.tsx` — already deleted in prior work. No file exists.
- K2 (Shell): Mega plan cleanup — completed in A2. `commands/ralph/` never existed (false alarm). Stale descriptions updated in loop.ts. Issues log fixes (TH-001 through TH-008) applied.