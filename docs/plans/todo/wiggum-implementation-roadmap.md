# Wiggum Implementation Roadmap

> Unified sequencing for all Wiggum enhancement specs. Maps every phase across every document into a dependency-aware build order, grouped into CC prompt batches.
>
> **Last updated:** 2026-02-22

---

## DOCUMENTS IN SCOPE

| # | Document | Short Name | Focus |
|---|----------|------------|-------|
| 1 | `toolkit-2_0.md` | **Toolkit** | Zod schemas, dual-mode shell commands, typed tools |
| 2 | `wiggum-jsx-planning-language.md` | **Planning** | plan.tsx as typed contract, validation, diffing |
| 3 | `wiggum-eslint-integration_upgraded.md` | **ESLint** | AST-aware source quality, browser linter |
| 4 | `llm-api-3_2.md` | **API** | Structured responses, streaming, context awareness |
| 5 | `wiggum-visual-review-plan.md` | **Visual** | DOM heuristics, contrast checking, vision LLM |
| 6 | `wiggum-task-lifecycle.md` | **Lifecycle** | Snapshots, task parser, plan mutation, scope gates |
| 7 | `mcp-the-wiggum-way.md` | **MCP** | External tool access via Model Context Protocol |
| 8 | `zenfs-migration-plan.md` | **ZenFS** | Filesystem migration, preview cache elimination |
| 9 | `hono-fullstack-plan.md` | **Hono** | Backend patterns, API routes, service worker |
| 10 | `chief-implementation-plan.md` | **Chief** | Coordinator, conversational planning agent |
| 11 | `preview-hardening-addendum.md` | **Preview** | SPA nav tracking, SW blocking, console hardening (ZenFS Ph 2 sub-tasks) |
| 12 | `jsonrpc-unified-protocol.md` | **RPC** | One wire protocol for all cross-context boundaries. Core library + transport adapters. |
| 13 | `wiggum-quality-pipeline-update.md` | **Pipeline** | Cross-system enforcement chains, mandatory skill lookup gate |
| 14 | `gumdrops-remix-implementation-plan-update.md` | **Gumdrops** | Gumdrop recipes, compositional patterns, anti-slop content |
| 15 | `wiggum-gateway-spec.md` | **Gateway** | CORS proxy for LLM provider calls |
| 16 | `wiggum-project-context-menu-spec.md` | **ContextMenu** | Project-level context menu UI |
| 17 | `dialog-modal-gumdrop.md` | **Dialog** | Product-detail showcase modal recipe (part of Gumdrops) |
| 18 | `cc-loop-ergonomics.md` | **Ergonomics** | Pre-stage quick fixes: gate retries, data URI, 2>/dev/null, build cmd, replace errors, snapshot file docs |
| 19 | `cc-kickoff-pre-stage.md` | **Kickoff** | CC prompt for pre-stage session |
| 20 | `cc-kickoff-template.md` | **Template** | Reusable CC kickoff prompt template for all roadmap steps |
| 21 | `cc-skills-tightening.md` | **Skills** | Delete dead skills, fix OKLCH refs, update moods 6→12, tokens/smart-merge docs, consolidate skill location |

---

## DEPENDENCY GRAPH

```
                    ┌──────────┐
                    │ Toolkit  │  ← Foundation: Zod schemas + dual-mode dispatch
                    │ Ph 0-1   │     Everything else benefits from typed commands
                    └────┬─────┘
                         │
          ┌──────────────┼──────────────────┐
          │              │                  │
          ▼              ▼                  ▼
   ┌────────────┐ ┌────────────┐    ┌────────────┐
   │ Toolkit    │ │ Planning   │    │ Lifecycle  │
   │ Ph 2       │ │ Ph 0-3    │    │ Ph 0-1    │
   │ (promote   │ │ (types,   │    │ (snapshot  │
   │  grep,     │ │  validate,│    │  command,  │
   │  write,    │ │  Ralph    │    │  auto-     │
   │  theme,    │ │  integr.) │    │  hooks)    │
   │  preview)  │ └─────┬─────┘    └─────┬─────┘
   └─────┬──────┘       │                │
         │              │                │
         │         ┌────┴────┐     ┌─────┴──────┐
         │         ▼         ▼     ▼            │
         │  ┌──────────┐ ┌────────────┐         │
         │  │ Planning │ │ Lifecycle  │         │
         │  │ Ph 4-6   │ │ Ph 2-3    │         │
         │  │ (theme,  │ │ (task     │         │
         │  │  chief,  │ │  parser,  │         │
         │  │  diff)   │ │  plan     │         │
         │  └────┬─────┘ │  mutation)│         │
         │       │       └─────┬────┘         │
         │       │             │               │
    ┌────┴───────┴─────────────┴───────────────┘
    │          Integration Layer
    ▼
┌─────────────────────────────────────────────┐
│  ESLint Ph 1-3  │  API Ph 1-3  │  ZenFS Ph 1│   ← Can run in PARALLEL
└────────┬────────┴──────┬───────┴──────┬─────┘
         │               │              │
         ▼               ▼              ▼
┌─────────────────────────────────────────────┐
│  Cross-Cutting Integration                   │
│                                              │
│  Planning Ph 7   (plan-aware ESLint)         │  ← needs ESLint Ph 1-2
│  Planning Ph 9   (plan as Toolkit command)   │  ← needs Toolkit Ph 2
│  Planning Ph 10  (context-scoped loading)    │  ← needs API Ph 5
│  Planning Ph 8   (plan-aware visual review)  │  ← needs Visual Ph 2
│  Lifecycle Ph 4  (scope-aware gates)         │  ← needs Planning Ph 6
│  Lifecycle Ph 5  (stall recovery)            │  ← needs API Ph 5
│  ESLint Ph 3-5   (Toolkit cmd, auto-lint,    │  ← needs Toolkit Ph 2
│                    oscillation)               │
│  API Ph 5        (preflight, budget, stall)  │  ← needs API Ph 1-3
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│  Visual Ph 1-5   │  MCP Ph 1-2  │  Chief   │  ← Later: output quality +
│  (probe, analyze,│  (client,    │  Ph 1-3  │     external tools +
│   orchestrate,   │   Ralph,     │  (coord, │     conversational planning
│   vision, gates) │   Chief)     │   tools, │
│                  │              │   stream) │
└──────────────────┴──────────────┴──────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│  Hono Full-Stack  │  ZenFS Ph 2  │  MCP 3  │  ← Future: backend, OPFS,
│  (API routes,     │  (kill       │  (OAuth, │     advanced integrations
│   schemas,        │   preview    │   filter │
│   SW backend)     │   cache)     │   tools) │
└──────────────────┴──────────────┴──────────┘
```

---

## BUILD ORDER: LINEAR SEQUENCE

Phases grouped into **stages**. Each stage can be one or more CC prompt sessions. Within a stage, items listed in recommended execution order. Items marked ⚡ can run in parallel if multiple CC sessions are available.

---

### PRE-STAGE — QUICK FIXES
*Goal: Ship independent ergonomics and skill fixes before main roadmap begins*

| Step | Spec | Phase | Description | Est. Time | Dependencies |
|------|------|-------|-------------|-----------|-------------|
| 0.1 | cc-loop-ergonomics.md | — | Gate retries 3→5, pre-work grace, data: URI fix, 2>/dev/null strip, build command, replace errors, snapshot file docs | 2-3 hrs | None |
| 0.2 | cc-skills-tightening.md | — | Delete dead skills (ralph, creativity), fix OKLCH refs, 12 moods, tokens/smart-merge docs, consolidate skills location, update skills.ts | 2-3 hrs | None |

**Pre-stage total: ~4-6 hours**
**CC prompts: 2** (use cc-kickoff-pre-stage.md for 0.1, paste cc-skills-tightening.md directly for 0.2)
**Deliverables:** More resilient loop, inline SVG textures enabled, fd redirect suppression, compile-only feedback, better replace errors, accurate skill content, no dead skills wasting tokens

---

### STAGE 1 — FOUNDATION
*Goal: Typed command infrastructure + basic state management*

| Step | Spec | Phase | Description | Est. Time | Dependencies |
|------|------|-------|-------------|-----------|--------------|
| 1.1 | Toolkit | Ph 0 | Add Zod dependency (if not present) | 15 min | None |
| 1.2 | Toolkit | Ph 1 | ShellCommand interface change, argsSchema, toolFromCommand adapter, buildShellDescription | 4-5 hrs | 1.1 |
| 1.3 | Lifecycle | Ph 0 | Snapshot shell command (save/list/rollback/diff/status) | 3-4 hrs | None (can use legacy string[] args) |
| 1.4 | Lifecycle | Ph 1 | Automatic task boundary snapshots, state cleanup, task-history.md | 2-3 hrs | 1.3 |

**Stage 1 total: ~10-12 hours**
**CC prompts: 3** (Toolkit Ph 0+1, Lifecycle Ph 0, Lifecycle Ph 1)
**Deliverables:** Zod-validated shell commands, snapshot infrastructure, clean task boundaries

---

### STAGE 2 — PLANNING CORE
*Goal: Typed plans + structured task intake*

| Step | Spec | Phase | Description | Est. Time | Dependencies |
|------|------|-------|-------------|-----------|--------------|
| 2.1 | Planning | Ph 0 | Type foundation: packages/planning with core types | 2-3 hrs | None |
| 2.2 | Planning | Ph 1 | Type auto-generation from source registries | 2-3 hrs | 2.1 |
| 2.3 | Planning | Ph 2 | Plan validation gate (plan-valid) | 3-4 hrs | 2.1 |
| 2.4 | Planning | Ph 3 | Ralph integration: iteration 0 = planning phase | 3-4 hrs | 2.3 |
| 2.5 | Lifecycle | Ph 2 | Task parser: raw text → structured task.md | 3-4 hrs | 1.4 |
| 2.6 | Lifecycle | Ph 3 | Plan mutation protocol: update path for existing plans | 3-4 hrs | 2.4, 2.5 |

**Stage 2 total: ~17-22 hours**
**CC prompts: 5** (Planning Ph 0, Ph 1, Ph 2, Ph 3, Lifecycle Ph 2+3 combined)
**Deliverables:** Typed plan.tsx, plan validation, structured tasks, plan mutation with change markers

---

### STAGE 3 — COMMAND PROMOTION + PLANNING COMPLETION
*Goal: Typed tools for models, theme/chief plan integration, plan diffing*

| Step | Spec | Phase | Description | Est. Time | Dependencies |
|------|------|-------|-------------|-----------|--------------|
| 3.1 | Toolkit | Ph 2 | Promote first commands: grep, replace, theme, preview | 4-5 hrs | 1.2 |
| 3.2 | Planning | Ph 4 | Theme command integration: output → plan.tsx `<Theme>` block | 2 hrs | 2.4, 3.1 (theme promoted) |
| 3.3 | Planning | Ph 5 | Chief integration: write_plan outputs plan.tsx | 2 hrs | 2.4 |
| 3.4 | Planning | Ph 6 | Plan-to-implementation diffing (plan-diff gate) | 3-4 hrs | 2.4 |
| 3.5 | Lifecycle | Ph 4 | Scope-aware quality gates (ADD/PRESERVE validation) | 2-3 hrs | 3.4, 1.4 |
| 3.6 | Toolkit | Ph 3 | Remaining command promotions: write, build, git, find, sed | 3-4 hrs | 3.1 |

**Stage 3 total: ~16-20 hours**
**CC prompts: 5** (Toolkit Ph 2, Planning Ph 4+5, Planning Ph 6, Lifecycle Ph 4, Toolkit Ph 3)
**Deliverables:** Full typed tool suite, theme→plan integration, scope-enforced diffing

---

### STAGE 4 — SOURCE QUALITY + RESPONSE INTELLIGENCE
*Goal: AST-aware linting, structured LLM responses, streaming*

⚡ ESLint and API tracks can run in parallel — they don't depend on each other.

| Step | Spec | Phase | Description | Est. Time | Dependencies |
|------|------|-------|-------------|-----------|--------------|
| 4.1 ⚡ | ESLint | Ph 1 | Rules package: no-hardcoded-colors, no-raw-html, no-placeholder, require-css-vars | 3-4 hrs | None |
| 4.2 ⚡ | ESLint | Ph 2 | Browser linter integration (eslint-linter-browserify) | 2-3 hrs | 4.1 |
| 4.3 ⚡ | API | Ph 1 | LLMResponse type, parseResponse, tool call validation, error recovery | 4-5 hrs | None |
| 4.4 ⚡ | API | Ph 2 | Streaming support (SSE consumption, ResponseAccumulator) for Chief | 4-5 hrs | 4.3 |
| 4.5 | ESLint | Ph 3 | Lint as Toolkit 2.0 command (`lint` shell command + discrete tool) | 1-2 hrs | 4.2, 3.1 |
| 4.6 | ESLint | Ph 3b | Auto-lint on write (write-guard integration) | 1-2 hrs | 4.2 |
| 4.7 | API | Ph 3 | Provider normalization, CORS proxy, image handling, prompt caching | 4-5 hrs | 4.4 |

**Stage 4 total: ~20-26 hours**
**CC prompts: 6** (ESLint Ph 1, Ph 2, Ph 3+3b, API Ph 1, Ph 2, Ph 3)
**Deliverables:** AST-aware lint enforcement, structured LLM responses, streaming for Chief, CORS proxy

---

### STAGE 5 — CROSS-CUTTING INTEGRATION
*Goal: Connect planning language to ESLint, Toolkit, API; stall recovery*

| Step | Spec | Phase | Description | Est. Time | Dependencies |
|------|------|-------|-------------|-----------|--------------|
| 5.1 | Planning | Ph 9 | Plan as Toolkit 2.0 command (plan validate/diff/show/lint-config) | 2-3 hrs | 3.1, 3.4 |
| 5.2 | Planning | Ph 7 | Plan-aware ESLint config (`<Rule>` → .ralph/lint-config.json) | 2-3 hrs | 4.2, 2.4 |
| 5.3 | API | Ph 5 | Context preflight, conversation budget, stall detection signal | 4-5 hrs | 4.7 |
| 5.4 | Lifecycle | Ph 5 | Stall-triggered recovery with snapshots + plan-aware prompts | 1-2 hrs | 5.3, 1.3 |
| 5.5 | ESLint | Ph 4 | System prompt update + feedback formatting for lint results | 1 hr | 4.6 |
| 5.6 | ESLint | Ph 5 | Oscillation detection (simple counter, ~20 LOC) | 1 hr | 4.6 |
| 5.7 | Toolkit | Ph 4 | Remove hand-written shell description, auto-generate from schemas | 1-2 hrs | 3.6 |
| 5.8 | Planning | Ph 7 (cleanup) | Delete intent.md, plan.md, design-brief.md. Migration complete. | 1-2 hrs | 3.4 |

**Stage 5 total: ~14-19 hours**
**CC prompts: 6** (Planning Ph 9, Ph 7, API Ph 5 + Lifecycle Ph 5, ESLint Ph 4+5, Toolkit Ph 4, Planning cleanup)
**Deliverables:** Fully connected quality pipeline, stall recovery, auto-generated tool descriptions

---

### STAGE 6 — OUTPUT QUALITY + EXTERNAL TOOLS
*Goal: Visual review, MCP integration, context-scoped plan loading*

⚡ Visual Review and MCP can run in parallel.

| Step | Spec | Phase | Description | Est. Time | Dependencies |
|------|------|-------|-------------|-----------|--------------|
| 6.1 ⚡ | Visual | Ph 1 | Enhanced probe + types (iframe DOM walker) | 2 days | None |
| 6.2 ⚡ | Visual | Ph 2 | Heuristic analyzer + contrast utility (17 checks) | 3 days | 6.1 |
| 6.3 ⚡ | Visual | Ph 3 | Orchestrator: probe → analyze → visual-review.md | 1 day | 6.2 |
| 6.4 ⚡ | MCP | Ph 0 | Spike: MCP SDK + StreamableHTTP in browser | 0.5 day | None |
| 6.5 ⚡ | MCP | Ph 1 | Core integration: MCPConnection, MCPRegistry, Ralph tools, settings UI | 2-3 days | 6.4 |
| 6.6 | Planning | Ph 8 | Plan-aware visual review thresholds (`<Rule>` → analyzer overrides) | 2-3 hrs | 6.2, 2.4 |
| 6.7 | Visual | Ph 4 | Vision provider slot (html2canvas + vision LLM call) | 2 days | 6.3 |
| 6.8 | Visual | Ph 5 | Quality gate integration (visual score in gate pipeline) | 1 day | 6.3 |
| 6.9 | Planning | Ph 10 | Context-scoped plan loading (per-screen excerpts, preflight-aware) | 2-3 hrs | 5.3, 2.4 |
| 6.10 | MCP | Ph 2 | Chief integration + polish | 1-2 days | 6.5, Chief Ph 1+ |

**Stage 6 total: ~12-16 days**
**CC prompts: ~8** (Visual Ph 1, Ph 2, Ph 3, Ph 4+5, MCP Ph 0+1, MCP Ph 2, Planning Ph 8, Ph 10)
**Deliverables:** DOM heuristic review, vision-based aesthetic checking, MCP external tools, optimized plan loading

---

### STAGE 7 — CONVERSATIONAL PLANNING + FILESYSTEM
*Goal: Chief as planning agent, ZenFS migration*

⚡ Chief and ZenFS are independent tracks.

| Step | Spec | Phase | Description | Est. Time | Dependencies |
|------|------|-------|-------------|-----------|--------------|
| 7.1 ⚡ | Chief | Ph 1 | Coordinator, useChiefChat, Chief tools (read/search/write_plan/send_to_ralph) | 3-4 days | 4.4 (streaming) |
| 7.2 ⚡ | Chief | Ph 2 | Chief UI panel, streaming display, tool call visualization | 2-3 days | 7.1 |
| 7.3 ⚡ | Chief | Ph 3 | Plan.tsx output from Chief (replaces .chief/plan.md) | 1-2 days | 7.2, 2.4 |
| 7.4 ⚡ | ZenFS | Ph 0 | Spike: ZenFS + isomorphic-git + esm.sh compatibility test | 1-2 hrs | None |
| 7.5 ⚡ | ZenFS | Ph 1 | ZenFSAdapter drop-in replacement, Git.ts type update | 0.5 day | 7.4 |
| 7.5a | RPC | — | Core JSON-RPC library: types, client, server, transport adapters (window, port, worker) | 3-4 hrs | None |
| 7.6 | ZenFS + Preview + RPC | Ph 2 | Kill preview cache: Port backend + SPA nav tracking + SW registration blocking + console hardening. Preview bridge rebuilt on JSON-RPC. | 1 day | 7.5, 7.5a |
| 7.7 | API | Ph 4 | Structured output mode (Zod schemas → response format) | 2-3 hrs | 4.7 |
| 7.8 | ESLint | Ph 6 | API 3.2 hooks: lint in tool output truncation, stall guidance | 1 hr | 5.3, 4.6 |

**Stage 7 total: ~9-13 days**
**CC prompts: ~6** (Chief Ph 1, Ph 2, Ph 3, ZenFS Ph 0+1, ZenFS Ph 2 + Preview hardening, API Ph 4 + ESLint Ph 6)
**Deliverables:** Chief conversational planning, ZenFS filesystem, preview cache eliminated, SPA route tracking, SW registration defense, console capture hardened

---

### STAGE 8 — FULL-STACK + ADVANCED
*Goal: Backend patterns, advanced MCP, remaining integrations*

| Step | Spec | Phase | Description | Est. Time | Dependencies |
|------|------|-------|-------------|-----------|--------------|
| 8.1 | Hono | Ph 0 | Spike: Hono in service worker | 1-2 hrs | 7.5 (ZenFS) |
| 8.2 | Hono | Ph 1 | @wiggum/api package, backend build, SW registration | 2-3 days | 8.1 |
| 8.3 | Hono | Ph 2 | API shell commands (api init/route/schema/client/status) | 1-2 days | 8.2, 3.1 |
| 8.4 | Hono | Ph 3 | API skills + quality gates | 1-2 days | 8.3 |
| 8.5 | MCP | Ph 3 | OAuth flows, SSE fallback, tool filtering | 2-3 days | 6.5 |
| 8.6 | Hono | Ph 4 | Export: Wrangler config, standalone deployment package | 1-2 days | 8.4 |

**Stage 8 total: ~8-13 days**
**CC prompts: ~5** (Hono Ph 0+1, Ph 2, Ph 3, Ph 4, MCP Ph 3)
**Deliverables:** Full-stack Hono backend, advanced MCP, project export

---

## TOTAL EFFORT ESTIMATE

| Stage | Focus | Est. Time | CC Prompts |
|-------|-------|-----------|------------|
| Pre | Quick Fixes + Skills Tightening | 4-6 hrs | 2 |
| 1 | Foundation (Toolkit + Snapshots) | 10-12 hrs | 3 |
| 2 | Planning Core + Task Parser | 17-22 hrs | 5 |
| 3 | Command Promotion + Plan Completion | 16-20 hrs | 5 |
| 4 | Source Quality + Response Intelligence | 20-26 hrs | 6 |
| 5 | Cross-Cutting Integration | 14-19 hrs | 6 |
| 6 | Output Quality + External Tools | 12-16 days | 8 |
| 7 | Chief + Filesystem + Preview Hardening | 9-13 days | 6 |
| 8 | Full-Stack + Advanced | 8-13 days | 5 |
| **Total** | | **~5-7 weeks** | **~46 prompts** |

Time estimates assume a single CC session. Parallel tracks (marked ⚡) can compress the timeline by ~30% with multiple sessions.

---

## CRITICAL PATH

The longest dependency chain determines minimum calendar time:

```
Toolkit Ph 0-1  →  Toolkit Ph 2  →  Planning Ph 9  →  Planning Ph 7
     │                                                       │
     └→  Planning Ph 0-3  →  Planning Ph 6  →  Lifecycle Ph 4
              │
              └→  Lifecycle Ph 2-3
                       │
     API Ph 1-3  →  API Ph 5  →  Lifecycle Ph 5
```

**Critical path: ~65-80 hours** (Stages 1-5 sequential, assuming no parallelism)

Stage 6+ items are largely independent of the critical path — Visual Review, MCP, Chief, and Hono can proceed as soon as their specific dependencies are met.

---

## MILESTONE CHECKPOINTS

### M0: "Ralph's rough edges smoothed" (end of Pre-Stage)
- ✅ 5 gate retries instead of 3
- ✅ Pre-work gate failures don't burn retry attempts
- ✅ Inline SVG data URIs work in CSS (noise textures, grain, patterns)
- ✅ `2>/dev/null` doesn't crash the shell parser
- ✅ `build` command for compile-only checks
- ✅ `replace` gives actionable errors for multi-line content
- ✅ Dead skills deleted (ralph, creativity) — no fiction in knowledge base
- ✅ OKLCH color references correct across all skills (no hsl wrappers)
- ✅ 12 moods documented, tokens/smart-merge docs added
- ✅ All skills consolidated under apps/ide/src/skills/
- **User-visible:** Ralph fails less on first attempts, richer visual textures, accurate skill knowledge

### M1: "Ralph doesn't lose state" (end of Stage 1)
- ✅ Snapshot save/rollback works
- ✅ Pre/post task snapshots automatic
- ✅ Stale .ralph/ state cleared between tasks
- ✅ task-history.md provides continuity
- **User-visible:** "Undo" button on failed tasks

### M2: "Ralph follows a contract" (end of Stage 2)
- ✅ plan.tsx created at iteration 0
- ✅ Plan validates gumdrops, moods, fonts
- ✅ Structured task.md with scope markers
- ✅ Plan mutation for iterative refinement
- **User-visible:** Plans visible in file tree, better first-attempt quality

### M3: "Ralph has typed tools" (end of Stage 3)
- ✅ 8-12 commands available as discrete typed tools
- ✅ Theme command writes to plan.tsx
- ✅ Plan-to-implementation diff catches structural drift
- ✅ Scope gates prevent "converted instead of added"
- **User-visible:** Faster tool calls, fewer malformed commands, scope enforcement

### M4: "Ralph catches mistakes at write time" (end of Stage 4)
- ✅ ESLint catches hardcoded colors, raw HTML, placeholders on write
- ✅ LLM responses fully parsed and validated
- ✅ Streaming works for Chief
- ✅ Provider quirks normalized
- **User-visible:** Fewer quality gate bounces, live Chief responses

### M5: "Full quality pipeline connected" (end of Stage 5)
- ✅ Plan → ESLint config → source enforcement
- ✅ Context preflight prevents overflow
- ✅ Stall detection with plan-aware recovery
- ✅ All tools auto-described from schemas
- **User-visible:** Rare multi-attempt completions, no context overflow crashes

### M6: "Eyes on the output" (end of Stage 6)
- ✅ Visual review catches contrast, overlap, sizing issues
- ✅ MCP enables external tool access (databases, APIs)
- ✅ Plan-aware visual thresholds from `<Rule>` elements
- **User-visible:** Better visual quality, plugin-like extensibility

### M7: "Conversational planning" (end of Stage 7)
- ✅ Chief builds plans interactively with streaming
- ✅ ZenFS eliminates preview cache duplication
- ✅ Faster I/O for snapshot operations
- ✅ Preview tracks SPA routes and reports to parent
- ✅ App SW registration blocked — preview pipeline protected
- ✅ Console capture handles Error stacks + unhandled rejections
- **User-visible:** Chat-based project planning, snappier preview, route-aware preview toolbar

### M8: "Full-stack capable" (end of Stage 8)
- ✅ Hono backend patterns with service worker
- ✅ MCP OAuth for authenticated services
- ✅ Exportable full-stack projects
- **User-visible:** Backend API generation, deployable projects

---

## STAGE-TO-DOCUMENT MAPPING

Quick reference: which documents are active in each stage.

| Stage | Toolkit | Planning | Lifecycle | ESLint | API | Visual | MCP | Chief | ZenFS | Hono |
|-------|---------|----------|-----------|--------|-----|--------|-----|-------|-------|------|
| 1 | ✅ Ph 0-1 | | ✅ Ph 0-1 | | | | | | | |
| 2 | | ✅ Ph 0-3 | ✅ Ph 2-3 | | | | | | | |
| 3 | ✅ Ph 2-3 | ✅ Ph 4-6 | ✅ Ph 4 | | | | | | | |
| 4 | | | | ✅ Ph 1-3b | ✅ Ph 1-3 | | | | | |
| 5 | ✅ Ph 4 | ✅ Ph 7,9 | ✅ Ph 5 | ✅ Ph 4-5 | ✅ Ph 5 | | | | | |
| 6 | | ✅ Ph 8,10 | | | | ✅ Ph 1-5 | ✅ Ph 0-2 | | | |
| 7 | | | | ✅ Ph 6 | ✅ Ph 4 | | | ✅ Ph 1-3 | ✅ Ph 0-2 | |
| 8 | | | | | | | ✅ Ph 3 | | | ✅ Ph 0-4 |

### Additional Documents (not column-tracked)

| Document | Active Stage | Notes |
|----------|-------------|-------|
| **Ergonomics** (cc-loop-ergonomics.md) | Pre-stage | 7 quick fixes to loop, shell, build plugin. CC session 1. |
| **Skills** (cc-skills-tightening.md) | Pre-stage | 10 changes across skill files + skills.ts. CC session 2. |
| **Preview** (preview-hardening-addendum.md) | 7 | Sub-tasks of ZenFS Ph 2. SPA nav, SW blocking, console hardening. |
| **RPC** (jsonrpc-unified-protocol.md) | 7 | Foundation utility, reused in Stages 7-8. |
| **Pipeline** (wiggum-quality-pipeline-update.md) | 3-5 | Cross-system enforcement chains. Implicitly active wherever multi-system integration happens. |
| **Gumdrops** (gumdrops-remix-implementation-plan-update.md) | Pre-stage | Content track. Recipes ship whenever skills content is authored — independent of infrastructure stages. |
| **Gateway** (wiggum-gateway-spec.md) | 4 | CORS proxy. Implements alongside API Ph 3 (provider normalization). |
| **ContextMenu** (wiggum-project-context-menu-spec.md) | 6+ | UI feature. Independent of infrastructure. Can ship after Chief Ph 1+ provides the coordination layer. |
| **Dialog** (dialog-modal-gumdrop.md) | Pre-stage | Single gumdrop recipe. Part of Gumdrops content track. |
| **Anti-AI Prose** (anti-ai-prose-rules.md) | Pre-stage | Skills content. Density-based prose checker rules. Ships with skills-tightening. |
| **Convergence** (convergence-based-design-decisions.md) | Pre-stage + 7 | Two tracks: (1) "Known Modes" subsections in every gumdrop recipe (ships with Gumdrops content), (2) Chief system prompt mode-awareness paragraph (ships with Chief Ph 1). Recipe prioritization order for highest-convergence gumdrops. |

---

## CC SESSION GUIDELINES

### Before Each Prompt

1. **Read the spec section** referenced in the step. CC prompts in each spec document are the primary reference.
2. **Read the relevant source files** listed in the spec's CC prompt. Every prompt says "Read X for Y."
3. **Check prerequisite steps** completed. Don't start Step 3.2 before Step 2.4.

### Prompt Batching

Group related phases into single CC sessions when they touch the same files:

| Good batch | Why |
|-----------|-----|
| Toolkit Ph 0 + Ph 1 | Same files: ShellCommand interface, executor |
| Planning Ph 0 + Ph 1 | Same package: packages/planning |
| Lifecycle Ph 0 + Ph 1 | Same integration point: useAIChat.ts |
| ESLint Ph 3 + Ph 3b | Both integrate with Toolkit and write-guard |
| ESLint Ph 4 + Ph 5 | Both touch system prompt and feedback formatting |
| API Ph 5 + Lifecycle Ph 5 | Stall detection → stall recovery (consumer pattern) |

| Bad batch | Why |
|----------|-----|
| Toolkit Ph 2 + Planning Ph 0 | Different packages, different concerns |
| ESLint Ph 1 + API Ph 1 | Completely independent, risk confusion |
| Visual Ph 1 + MCP Ph 1 | Unrelated systems |

### Snapshot Workflow

After each successful CC session:

```
git add -A
git commit -m "Snapshot: {stage}.{step} — {description}"
git branch snapshot-YYYY-MM-DD-{stage}-{step} (WITHOUT switching)
```

This aligns with the existing CLAUDE.md git workflow and provides rollback points for the implementation itself.

---

## RISK REGISTER

| Risk | Impact | Stage | Mitigation |
|------|--------|-------|------------|
| Zod bundle size (~50KB) adds to IDE weight | Low | 1 | Likely already needed for Hono; justified by validation value |
| Plan.tsx parsing requires TSX AST parser | Medium | 2 | Use existing esbuild-wasm or lightweight @babel/parser |
| Task parser LLM call adds latency to every message | Medium | 2 | Fast model + fallback template if call fails |
| Too many discrete tools confuse small models | Medium | 3 | Start with 3-4 promoted; shell catch-all as fallback |
| ESLint browserify bundle is large | Medium | 4 | Lazy-load; only instantiate when lint command runs or gate checks |
| Streaming SSE parsing edge cases per provider | High | 4 | Finalization guard from API 3.2 spec; test against 3+ providers |
| Visual probe iframe timing (DOMContentLoaded race) | Medium | 6 | Retry with exponential backoff; settle timeout |
| MCP CORS blocking for most existing servers | High | 6 | CORS proxy (Cloudflare Worker); document which servers need it |
| Chief conversation budget trimming loses context | Medium | 7 | Deterministic middle-drop; user can re-state lost context |
| ZenFS IndexedDB schema incompatible with LightningFS | Low | 7 | Clean break acceptable; projects are ephemeral in current state |
| Hono service worker scope conflicts with preview SW | Medium | 8 | Separate SW scopes; API SW at /api/, preview SW at /preview/ |

---

## WHAT TO BUILD FIRST

If time is limited, the **highest-impact, lowest-effort** sequence is:

1. **Pre-Stage** (Loop ergonomics + Skills tightening) — 4-6 hours. Immediate quality improvement for every subsequent Ralph run. Zero dependencies.

2. **Lifecycle Ph 0 + Ph 1** (Snapshots) — 5-7 hours. Immediate rollback capability. Zero dependencies on other specs. Users can undo bad tasks today.

3. **ESLint Ph 1 + Ph 2** (Lint rules + browser linter) — 5-7 hours. Catches hardcoded colors and raw HTML on write. Independent of everything else. Prevents the most common quality gate bounces.

4. **Planning Ph 0-3** (Core plan.tsx) — 11-14 hours. Typed plans with validation. The structural backbone for everything that follows.

5. **Lifecycle Ph 2 + Ph 3** (Task parser + plan mutation) — 6-8 hours. Structured task intake + iterative refinement. Addresses the exact failure mode from the VIBRANT ENERGY log.

These five items (~32-42 hours) deliver the most impactful fixes for the failures identified in the task durability analysis. Everything after Stage 3 is enhancement and integration on top of a working foundation.
