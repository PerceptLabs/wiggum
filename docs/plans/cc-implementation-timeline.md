# Wiggum CC Implementation Timeline

> Quick reference: what to build, what order, which docs to feed Claude Code.
> Each step = one or more CC sessions. Feed CC the listed docs + wiggum-master.md (always).

---

## Phase A: Foundation (no dependencies)

### A1 — Theme Generator
- **Feed CC:** `cc-theme-generato_updatedr.md` (entire doc IS the CC prompt)
- **Why first:** Everything downstream consumes CSS variables. Master doc calls it "priority item."
- **Output:** `theme` shell command, OKLCH engine, presets

### A2 — Mega Plan Cleanup
- **Feed CC:** The 14-step mega plan (not in project files — from prior chats)
- **Why now:** Stale descriptions, dead code (`commands/ralph/` 48K), new shell commands. Cleaner foundation for everything after.
- **Output:** Clean codebase, updated command descriptions, glob expansion

### A3 — Power-up 5A: Component Decision Tree
- **Feed CC:** `wiggum-powerup-plan.md` → Phase 5A section only (~30 min)
- **Why now:** "Can ship immediately, even before Phase 1." Pure knowledge file, no build changes. Gumdrops recipes will reference these same boundaries.
- **Output:** `skills/ralph/extended-libraries/SKILL.md`

---

## Phase B: Recipe Content (depends on A1, benefits from A3)

### B1 — Gumdrops Ecosystem: Infrastructure
- **Feed CC:** `gumdrops-ecosystem-design.md` → Architecture + File Structure + Recipe Format sections
- **What:** Create `skills/gumdrops/` directory, `SKILL.md` index, composition rules, update `creativity/SKILL.md` → redirect to gumdrops
- **Output:** Directory structure, index file, Orama integration for `grep skill`

### B2 — Gumdrops Ecosystem: Priority UI Recipes (10)
- **Feed CC:** `gumdrops-ecosystem-design.md` → Phase 2 recipes (hero through file-upload)
- **What:** Write hero.md, features.md, pricing.md, stats-dashboard.md, data-table.md, auth-login.md, form-layout.md, dialog-modal.md, sidebar-nav.md, file-upload.md
- **Output:** 10 recipe files, each ~30 lines, indexed in Orama. Ralph has Mode 1 immediately.

### B3 — Gumdrops Ecosystem: Remaining UI + Content + Interactive Recipes
- **Feed CC:** `gumdrops-ecosystem-design.md` → Domains 1-4 remaining recipes
- **What:** Remaining 28 UI/content/interactive recipes
- **Output:** Full recipe coverage across marketing, app, content, interactive domains

### B4 — Power-up 5B: Personality Brief System
- **Feed CC:** `wiggum-powerup-plan.md` → Phase 5B section + `cc-theme-generato_updatedr.md` (for theme output format)
- **Depends on:** A1 (theme generator exists). Plan says this explicitly.
- **Output:** Per-project design personality extending theme output

---

## Phase C: Build Infrastructure (parallel with Phase B)

### C1 — Power-up Phase 1: PWA Precache
- **Feed CC:** `wiggum-powerup-plan.md` → Layer 1 + Phase 1 section
- **What:** Workbox precache for IDE shell
- **Output:** Offline-capable IDE, ~2 hrs

### C2 — Power-up Phase 2: ESM Module Cache + Package Registry
- **Feed CC:** `wiggum-powerup-plan.md` → Layer 2 + Phase 2 section
- **What:** Runtime caching for esm.sh, `grep package` command, registry skill
- **Output:** Faster builds, package discovery, ~6-7 hrs

### C3 — Power-up Phase 3: Build Intelligence
- **Feed CC:** `wiggum-powerup-plan.md` → Layer 3 + Phase 3 section
- **What:** Content-hash caching, incremental builds, dependency graph
- **Output:** Smarter rebuilds, ~4 hrs

### C4 — Power-up Phase 4: Browser Tailwind
- **Feed CC:** `wiggum-powerup-plan.md` → Layer 4 + Phase 4 section
- **Depends on:** C3 (build pipeline)
- **Output:** oxide-wasm Tailwind compilation, ~3 hrs

---

## Phase D: Full-Stack (depends on A1, benefits from B1-B3)

### D1 — Hono Phase 0: Spike
- **Feed CC:** `hono-fullstack-plan.md` → sections 1-4 + Risk Assessment
- **What:** Validate Service Worker architecture in Wiggum's environment
- **Output:** Working proof-of-concept, kill switch if it fails

### D2 — ZenFS Phase 0-1: Spike + Adapter Swap
- **Feed CC:** `zenfs-migration-plan.md` → Prompts 1-2
- **What:** Verify ZenFS works, swap LightningFS adapter behind JSRuntimeFS interface
- **Output:** ZenFS running, LightningFS gone

### D3 — Hono Phase 1: @wiggum/api Package + Build
- **Feed CC:** `hono-fullstack-plan.md` → Prompt 1 + Prompt 2
- **What:** Create `packages/api/`, add second esbuild pass for backend
- **Output:** @wiggum/api package, backend build pipeline

### D4 — Hono Phase 2: Shell Commands
- **Feed CC:** `hono-fullstack-plan.md` → Prompt 3
- **What:** `api init`, `api route`, `api schema` shell commands
- **Output:** Ralph can scaffold full-stack projects

### D5 — Gumdrops Ecosystem: API Recipes (6)
- **Feed CC:** `gumdrops-ecosystem-design.md` → Phase 3 (crud-resource through realtime-messaging) + `hono-fullstack-plan.md` → @wiggum/api conventions
- **Depends on:** D3-D4 (API patterns exist to write recipes for)
- **What:** crud-resource.md, auth-session.md, file-upload-api.md, pagination-api.md, search-query.md, realtime-messaging.md
- **Output:** Ralph has dual-tier data patterns for all 13 stateful gumdrops + 6 API recipes

### D6 — ZenFS Phase 2: Kill Preview Cache
- **Feed CC:** `zenfs-migration-plan.md` → Prompt 3
- **What:** Delete preview-cache.ts, serve preview from ZenFS directly
- **Output:** One filesystem, three consumers

### D7 — Hono Phases 3-4: Skills + Export
- **Feed CC:** `hono-fullstack-plan.md` → Prompts 4-5
- **What:** API skill for Ralph, full-stack export system
- **Output:** Ralph knows Hono conventions, users can export deployable apps

---

## Phase E: Composition Engine (depends on B2+ running in production)

### E1 — Manifesto: Structure + Atom Set YAML
- **Feed CC:** `gumdrops-manifesto.md` → Three Primitives + Composition section
- **What:** Formalize spatial patterns from Mode 1 reflection data into YAML
- **Output:** ~10 structure YAMLs, ~15 atom set YAMLs

### E2 — Manifesto: Compose Command + WFC Solver
- **Feed CC:** `gumdrops-manifesto.md` → Compose Command + WFC walkthrough + Weight normalization
- **What:** `compose` shell command, WFC solver (~80-100 lines TS), Mode 2
- **Output:** Ralph can request compositions, ~21-29 hrs total for E1-E4

### E3 — Manifesto: Harness Integration (Mode 3)
- **Feed CC:** `gumdrops-manifesto.md` → Harness Integration + Two-Phase Loop section
- **What:** Plan detection, auto-compose, scaffold injection, intervention check in loop.ts
- **Output:** Mode 3 — harness composes, Ralph implements

### E4 — Manifesto: Affinity Scoring + Reflection
- **Feed CC:** `gumdrops-manifesto.md` → Affinity Scoring + Reflection Data sections
- **Depends on:** Mode 1-3 reflection data from production use
- **What:** Tune WFC weights from observed pairings
- **Output:** Solver gets smarter over time

---

## Phase F: Conversational Planner (independent, most useful after D+E)

### F1 — Chief Phase 1: Coordinator + Hook
- **Feed CC:** `chief-implementation-plan.md` → Prompts 1-3
- **What:** Coordinator class, Chief tools, useChiefChat hook

### F2 — Chief Phase 2: Tab UI
- **Feed CC:** `chief-implementation-plan.md` → Prompt 4
- **What:** Two-tab interface, Chief ↔ Ralph tab switching

### F3 — Chief Phase 3: Cross-Tab Intelligence
- **Feed CC:** `chief-implementation-plan.md` → Prompt 5
- **What:** Chief reads Ralph's output, suggests improvements, handles iteration flow

---

## Parallelism Map

```
Week 1-2:  A1 ──→ A2 ──→ A3
                          ↓
Week 2-4:  B1 → B2 → B3 → B4      (recipe content)
           C1 → C2 → C3 → C4      (build infra, parallel)

Week 4-6:  D1 → D2 → D3 → D4 → D5 → D6 → D7  (full-stack)

Week 6-8:  E1 → E2 → E3 → E4      (composition engine, needs Mode 1 data)

Anytime after D:  F1 → F2 → F3     (Chief, independent)
```

---

## Workflow: Two-Model Review Loop

Every step follows this loop. Don't skip it. CC is good at typing code but bad at catching its own architectural mistakes.

### The Loop

```
┌─────────────────────────────────────────────────────────┐
│  1. UPDATE CLAUDE.md                                    │
│     Set current phase + which docs CC should read       │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  2. CC: PLAN (don't code yet)                           │
│     "Read the spec. Read the codebase. Make your own    │
│      implementation plan. Don't start coding."          │
│                                                         │
│     CC explores files, finds tight coupling issues,     │
│     proposes its own sequencing, flags concerns.        │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  3. REVIEW in Claude.ai                                 │
│     Bring CC's plan here. This chat catches:            │
│     - Wrong layer / wrong abstraction                   │
│     - Missing edge cases                                │
│     - "Already done" laziness (CC declaring victory     │
│       after one minor fix)                              │
│     - Code too close to reference implementations       │
│     - Conflicts with other plans CC hasn't read         │
│     - Misunderstanding of Wiggum philosophy             │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  4. SEND CORRECTIONS back to CC                         │
│     Specific, numbered, no ambiguity.                   │
│     "Revise the plan with these corrections: ..."       │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  5. CC: EXECUTE                                         │
│     Now it codes. Phase by phase, test between phases.  │
│     Stop after each phase and confirm it works.         │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  6. SNAPSHOT                                            │
│     git add -A && git commit && git branch snapshot-... │
│     Push before moving to next step.                    │
└─────────────────────────────────────────────────────────┘
```

### CLAUDE.md Template

Update this block at the start of each step:

```markdown
# CLAUDE.md

## Current Phase: [phase ID] — [phase name]

Read `docs/plans/cc-implementation-timeline.md` for full roadmap.

For this phase, read ONLY:
- `docs/plans/wiggum-master.md` (always)
- `docs/plans/[specific plan for this phase]`

Do NOT read other plan files unless explicitly asked.
Do NOT edit files without asking first.
Explore the codebase, make your own implementation plan, and present it
before writing any code.
```

### CC Planning Prompt (reuse per step)

```
Read the spec docs listed in CLAUDE.md for this phase.
Explore the relevant parts of the codebase.

Then:
1. Make your own implementation plan based on the spec + what you see in the code
2. Flag anything in the spec that doesn't match the codebase as it exists today
3. Flag any tighter coupling, missing files, or surprises you found
4. Propose your commit sequence
5. List every file you'll create, edit, or delete

Do NOT start coding. Show me the plan first.
```

### What This Chat Catches (that CC misses)

From prior sessions, the pattern is consistent:

| CC mistake | Example | How this chat caught it |
|-----------|---------|------------------------|
| Wrong layer | Data connectivity in WFC atom sets | Ecosystem design already handles it at recipe layer |
| Premature "done" | Preview system "fixed" after one binary decode bug | Flagged that whole system was broken, not just images |
| Wrong context | activeDirectory in LayoutContext | Should be in useFileTree — layout ≠ file navigation |
| Missing edge cases | No handling for non-previewable projects | Added isPreviewable check, default to code mode |
| Code too close to source | Plan snippets resembling Shakespeare AGPL | Revised to prose-only specs for clean room |
| Forgetting prior decisions | Missing shell commands from earlier chats | Surfaced diff/curl/date conversation |

### Per-Session Doc Rules

Always feed CC:
1. `wiggum-master.md` (architecture context — always)
2. The specific plan doc(s) listed for that step
3. This timeline (for context on where the step fits)

Never feed CC all plan docs at once. One concern per session.

Never let CC skip the planning step. "Read and execute" produces worse results than "read, plan, get reviewed, then execute." The planning step is where CC discovers codebase realities the specs didn't anticipate. That's the whole point.
