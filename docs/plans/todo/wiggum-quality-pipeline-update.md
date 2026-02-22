# Wiggum Quality Pipeline — Cross-System Integration Spec

> How six independently-designed systems — Gumdrops Remix, JSX Planning Language, Toolkit 2.0, ESLint Integration, LLM API 3.2, and Visual Review — create enforcement loops that no single system achieves alone. This document owns the integration contracts, the mandatory enforcement gates, and the multiplication effects between systems. Each individual spec maintains its own scope; this document describes the wiring.

---

## TABLE OF CONTENTS

1. [Why This Document Exists](#1-why-this-document-exists)
2. [The Six Systems](#2-the-six-systems)
3. [The Full Enforcement Chain](#3-the-full-enforcement-chain)
4. [Mandatory Skill Lookup Gate](#4-mandatory-skill-lookup-gate)
5. [plan.tsx Gumdrop Integration](#5-plantsx-gumdrop-integration)
6. [Context Budget for Gumdrop Loading](#6-context-budget-for-gumdrop-loading)
7. [Plan-Aware Stall Recovery](#7-plan-aware-stall-recovery)
8. [Visual Review Thresholds from Gumdrop Intent](#8-visual-review-thresholds-from-gumdrop-intent)
9. [The Anti-Slop Stack](#9-the-anti-slop-stack)
10. [Cross-System Multiplication Matrix](#10-cross-system-multiplication-matrix)
11. [Implementation Dependencies](#11-implementation-dependencies)
12. [Ref Validation Tooling](#12-ref-validation-tooling)
13. [File Change Index](#13-file-change-index)

---

## 1. WHY THIS DOCUMENT EXISTS

### The Problem with Bilateral Integration

Each Wiggum spec has a "Relationship to Other Plans" section describing bilateral connections:

- Gumdrops ↔ ESLint ("block atoms use @wiggum/stack, ESLint enforces that")
- Planning ↔ Toolkit ("plan becomes a shell command")
- API 3.2 ↔ Planning ("preflight reserves budget for plan.tsx")
- Visual Review ↔ Planning ("Rule elements set visual thresholds")

These bilateral descriptions are accurate but incomplete. They don't capture the **multilateral** enforcement loops — chains of 3-4 systems that create guarantees no pair of systems could provide.

Example: Ralph must consult a gumdrop recipe before writing a section file.

- Gumdrops alone: "Please read the recipe." (Hope.)
- Gumdrops + Planning: "The plan says use this gumdrop." (Suggestion.)
- Gumdrops + Planning + Toolkit 2.0: "The write gate checks that you loaded the recipe. Write rejected if you didn't." (Enforcement.)
- Gumdrops + Planning + Toolkit 2.0 + ESLint: "Even if you somehow bypass the gate, the auto-lint catches if you used raw HTML instead of stack components." (Defense in depth.)
- Gumdrops + Planning + Toolkit 2.0 + ESLint + Visual Review: "And even if the code compiles, the rendered output is checked for spacing consistency and composition quality." (Verification.)

That five-system chain is what this document defines.

### What This Document Owns

- The full enforcement chain from user request to completed output
- The mandatory skill lookup gate (mechanical enforcement, not prompt instruction)
- The plan.tsx gumdrop type extensions (union types, compose prop, Shell/Pane components)
- The context budget protocol for gumdrop ref loading
- Plan-aware stall recovery prompts
- Visual review threshold derivation from gumdrop intent
- Cross-system multiplication effects
- Implementation dependency ordering across all specs

### What This Document Does NOT Own

- Individual system internals (owned by their respective specs)
- Block atom definitions (owned by gumdrops-remix-implementation-plan.md)
- ESLint rule implementations (owned by wiggum-eslint-integration.md)
- Streaming architecture (owned by llm-api-3_2.md)
- Planning component library (owned by wiggum-jsx-planning-language.md)
- Visual probe data collection (owned by wiggum-visual-review-plan.md)
- Shell command schemas (owned by toolkit-2_0.md)

---

## 2. THE SIX SYSTEMS

Brief descriptions for context. Full details in each system's spec.

### Gumdrops Remix (gumdrops-remix-implementation-plan.md)

62 composable block-atom recipes across 6 domains (marketing, app, content, interactive, api, shells). Each gumdrop has a .md recipe (L0, ~30 lines) and a .ref.tsx reference implementation (L1, ~100-250 lines). Shell gumdrops add .api.ts and .schema.ts for Hono backend patterns. Ralph reads recipes and refs, then writes fresh compositions. The similarity gate flags >80% structural copying.

**What it needs from other systems:** Enforcement that Ralph actually reads the recipes. Typed references in plans. Context budget awareness. Visual verification of rendered output.

### JSX Planning Language (wiggum-jsx-planning-language.md)

Typed .plan.tsx file replaces .ralph/plan.md, .ralph/intent.md, and .ralph/design-brief.md. Planning components (`<App>`, `<Theme>`, `<Screen>`, `<Section>`, `<Gumdrop>`) create a schema-validated architectural contract. Union types constrain gumdrop names, moods, fonts, components. Plan validation runs at iteration 0. Plan-to-implementation diffing runs at completion.

**What it needs from other systems:** Complete gumdrop registry for union types. Composition pattern names for `compose` prop. Context budget for plan loading. Visual review thresholds from `<Rule>` elements.

### Toolkit 2.0 (toolkit-2_0.md)

Dual-mode shell commands — each command class serves as both a shell string (`grep -rn foo src/`) and a discrete typed tool in the LLM's tool list. Zod schemas are the single source of truth. `buildRalphTools()` generates the combined tool list. Write interception wraps every file write with validation.

**What it needs from other systems:** Gumdrop-aware write gate logic. Plan references for contextual error messages. ESLint integration for auto-lint-on-write. API 3.2 for tool call validation.

### ESLint Integration (wiggum-eslint-integration_upgraded.md)

`@wiggum/eslint-rules` package with 5 AST-aware rules: no-hardcoded-colors, no-raw-html-elements, no-placeholder-content, no-placeholder-comments, require-css-variables. Browser-based linter via eslint-linter-browserify. `lint` as both shell command and discrete tool. Auto-lint-on-write fires after every .ts/.tsx file write.

**What it needs from other systems:** Plan's `<Rule>` elements for per-project config. Toolkit 2.0 for command registration. Write interception pipeline for auto-lint hook.

### LLM API 3.2 (llm-api-3_2.md)

Production response-parsing layer with streaming, reasoning extraction, tool call validation, provider normalization, usage tracking, context preflight, conversation budget management, stall detection, and LogTape observability. Model capability registry provides context window sizes and feature flags.

**What it needs from other systems:** Plan.tsx size for mandatory context budget. Gumdrop ref sizes for loading budget. Stall recovery context from plan sections. Tool schemas from Toolkit 2.0.

### Visual Review (wiggum-visual-review-plan.md)

Two-tier visual feedback. Tier 1 (Structure Plus): 17 deterministic heuristic checks on rendered DOM — spacing, contrast, typography, alignment, balance. Zero cost, always on. Tier 2 (Ralph's Eyes): Optional LLM vision provider for aesthetic judgment. Both output .ralph/visual-review.md read by Ralph on next iteration.

**What it needs from other systems:** Plan's `<Rule>` elements for threshold overrides. Gumdrop intent for what "correct" looks like per section type. Plan's philosophy statement for Tier 2 vision prompts.

---

## 3. THE FULL ENFORCEMENT CHAIN

This is the complete pipeline from user request to completed output. Every step references which system owns it.

```
USER REQUEST
│
│ "Build me a project management dashboard with task boards and analytics"
│
▼
┌──────────────────────────────────────────────────────────────────────┐
│  PHASE 0: PLANNING                                                   │
│  Owner: Chief + JSX Planning Language                                │
│                                                                      │
│  Chief identifies:                                                   │
│    Shell template: project-board                                     │
│    Pane gumdrops: kanban-board, stats-dashboard, chat-messaging      │
│    API gumdrops: crud-resource, realtime-messaging                   │
│    Composition suggestions: metrics-as-nav (#23), inbox-style (#17)  │
│    Complexity level: Intermediate + one Advanced                     │
│    Mood: from user preference or Chief suggestion                    │
│                                                                      │
│  Chief writes .ralph/plan.tsx:                                       │
│    <App name="TaskFlow">                                             │
│      <Theme mood="midnight" seed={220} ... />                        │
│      <Shell template="project-board">                                │
│        <Pane name="stats" gumdrop="stats-dashboard"                  │
│              compose={["metrics-as-nav"]} position="top" />          │
│        <Pane name="board" gumdrop="kanban-board"                     │
│              compose={["inbox-style"]} position="main" />            │
│        <Pane name="detail" gumdrop="chat-messaging"                  │
│              position="sheet" />                                     │
│        <API route="/api/boards/:id" gumdrop="crud-resource" />       │
│        <API route="/api/stats" gumdrop="search-query" />             │
│      </Shell>                                                        │
│    </App>                                                            │
│                                                                      │
│  Plan validation gate (JSX Planning):                                │
│    ✓ All gumdrop names valid (union type check)                      │
│    ✓ All composition names valid                                     │
│    ✓ Mood exists in registry                                         │
│    ✓ Shell template exists                                           │
│    ✓ No structural errors                                            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
│
▼
┌──────────────────────────────────────────────────────────────────────┐
│  PHASE 1: CONTEXT PREPARATION                                        │
│  Owner: LLM API 3.2 (preflight) + Ralph Loop                        │
│                                                                      │
│  Preflight budget calculation:                                       │
│    System prompt:            ~1,400 tokens                           │
│    plan.tsx:                 ~300 tokens                              │
│    .ralph/status.txt:        ~50 tokens                              │
│    Tool definitions:         ~800 tokens                             │
│    ─────────────────────────────────                                 │
│    Reserved:                 ~2,550 tokens                           │
│    Model context window:     128,000 tokens (example)                │
│    Available for content:    ~125,450 tokens                         │
│                                                                      │
│  Gumdrop loading budget:                                             │
│    Shell .md recipe:         ~40 tokens (always loaded)              │
│    Shell .ref.tsx:           ~400 tokens (loaded for shell build)    │
│    Shell .api.ts:            ~200 tokens (loaded for shell build)    │
│    Shell .schema.ts:         ~100 tokens (loaded for shell build)    │
│    Per-pane .md recipe:      ~30 tokens × 3 panes = 90 tokens       │
│    Per-pane .ref.tsx:        ~120 tokens × 3 panes = 360 tokens     │
│    ─────────────────────────────────                                 │
│    Total gumdrop context:    ~1,190 tokens (well within budget)      │
│                                                                      │
│  Decision: Load shell + all pane refs in first iteration.            │
│  (If budget were tight, load one pane per iteration instead.)        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
│
▼
┌──────────────────────────────────────────────────────────────────────┐
│  PHASE 2: ITERATIVE BUILD (repeats per iteration)                    │
│  Owner: Ralph Loop + Toolkit 2.0 + ESLint + LLM API 3.2             │
│                                                                      │
│  ┌─── ITERATION N ────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  Step 1: Ralph reads plan + status                             │  │
│  │    → Identifies next section to build (e.g., stats pane)       │  │
│  │    → Plan says: gumdrop="stats-dashboard",                     │  │
│  │      compose={["metrics-as-nav"]}                              │  │
│  │                                                                │  │
│  │  Step 2: Ralph loads gumdrop recipe  ◄── MANDATORY             │  │
│  │    → grep skill "stats-dashboard"                              │  │
│  │    → Loads stats-dashboard.md (block atoms, arrangements)      │  │
│  │    → cat skills/gumdrops/app/stats-dashboard.ref.tsx           │  │
│  │    → Loads reference implementation                            │  │
│  │    (Write gate verifies this happened — see §4)                │  │
│  │                                                                │  │
│  │  Step 3: Ralph writes section file                             │  │
│  │    → write src/panes/StatsDashboard.tsx                        │  │
│  │                                                                │  │
│  │  Step 4: Write interception pipeline  ◄── AUTOMATIC            │  │
│  │    ┌─────────────────────────────────────────────────────┐     │  │
│  │    │ a) Write guard (Toolkit 2.0)                        │     │  │
│  │    │    Path allowed? Extension allowed? → PASS           │     │  │
│  │    │                                                     │     │  │
│  │    │ b) Skill lookup gate (THIS DOCUMENT — see §4)       │     │  │
│  │    │    Plan says gumdrop="stats-dashboard"               │     │  │
│  │    │    Did this iteration grep/cat for stats-dashboard?  │     │  │
│  │    │    YES → PASS                                        │     │  │
│  │    │    NO  → REJECT with guidance                        │     │  │
│  │    │                                                     │     │  │
│  │    │ c) Syntax validation (existing)                      │     │  │
│  │    │    TSX parses? → PASS                                │     │  │
│  │    │                                                     │     │  │
│  │    │ d) Auto-lint (ESLint Integration)                    │     │  │
│  │    │    no-raw-html-elements → PASS/FAIL                  │     │  │
│  │    │    no-hardcoded-colors → PASS/FAIL                   │     │  │
│  │    │    require-css-variables → PASS/FAIL                 │     │  │
│  │    │    no-placeholder-content → PASS/FAIL                │     │  │
│  │    │    Results appended to write tool response            │     │  │
│  │    └─────────────────────────────────────────────────────┘     │  │
│  │                                                                │  │
│  │  Step 5: Ralph sees immediate feedback                         │  │
│  │    "Wrote src/panes/StatsDashboard.tsx (87 lines)              │  │
│  │     ⚠ Lint: 1 error                                           │  │
│  │     wiggum/no-raw-html-elements: Use <Button> instead of      │  │
│  │     <button> at line 42"                                       │  │
│  │    → Ralph fixes in same or next iteration                     │  │
│  │                                                                │  │
│  │  Step 6: Context preflight for next iteration                  │  │
│  │    → API 3.2 estimates tokens for accumulated messages         │  │
│  │    → If approaching limit, trim tool results (keep recent)     │  │
│  │    → If gumdrop ref already loaded this session, skip reload   │  │
│  │                                                                │  │
│  │  Step 7: Stall detection (API 3.2)                             │  │
│  │    → Compute tool call signature (sorted name + args hash)     │  │
│  │    → Compare to previous iteration signature                   │  │
│  │    → If identical 3x consecutive → trigger stall recovery      │  │
│  │    → Recovery prompt includes plan section (see §7)            │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  (Repeat iterations until Ralph marks status "complete")             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
│
▼
┌──────────────────────────────────────────────────────────────────────┐
│  PHASE 3: COMPLETION GATES                                           │
│  Owner: Quality Gates + Plan Diff + Similarity + Visual Review       │
│                                                                      │
│  Gate 1: Build success (existing)                                    │
│    → esbuild compiles without errors                                 │
│                                                                      │
│  Gate 2: Runtime errors (existing)                                   │
│    → errorCollector reports no uncaught exceptions in preview         │
│                                                                      │
│  Gate 3: Plan-to-implementation diff (JSX Planning)                  │
│    → Parse plan.tsx: extract declared sections/panes                 │
│    → Scan src/: find implemented section files                       │
│    → Verify: each planned section has a corresponding file           │
│    → Verify: planned gumdrops' block atoms appear in implementation  │
│    → Verify: planned compositions are structurally present           │
│    → Score: >80% section match → PASS                                │
│                                                                      │
│  Gate 4: Similarity detection (Gumdrops Remix)                       │
│    → For each section file that maps to a gumdrop:                   │
│      → Parse Ralph's output into JSX skeleton                        │
│      → Parse corresponding .ref.tsx into JSX skeleton                │
│      → Compute structural similarity (tree edit distance)            │
│      → >80% → FLAG ("too similar to reference")                      │
│      → >95% → REJECT ("near-copy of reference")                     │
│                                                                      │
│  Gate 5: ESLint final sweep (ESLint Integration)                     │
│    → Run all rules across all src/**/*.{ts,tsx} files                │
│    → 0 errors required to pass                                       │
│    → Warnings logged but don't block                                 │
│                                                                      │
│  Gate 6: Visual Review Tier 1 — Structure Plus (Visual Review)       │
│    → Probe collects rendered DOM metrics from preview iframe         │
│    → 17 heuristic checks: spacing variance, typography count,        │
│      alignment regularity, contrast, touch targets, balance          │
│    → Thresholds from plan's <Rule> elements (see §8)                 │
│    → Findings written to .ralph/visual-review.md                     │
│                                                                      │
│  Gate 7: Visual Review Tier 2 — Ralph's Eyes (Visual Review)         │
│    → Optional (requires vision LLM provider configured)              │
│    → Screenshot captured from preview iframe                         │
│    → Vision prompt includes: plan's philosophy, mood, rules,         │
│      composition hints, anti-slop criteria                           │
│    → Aesthetic judgment written to .ralph/visual-review.md            │
│                                                                      │
│  Any gate failure → Ralph gets specific feedback → loops back to     │
│  Phase 2 with the gate's findings in context.                        │
│                                                                      │
│  All gates pass → COMPLETE                                           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### What Each Gate Catches

| Failure Mode | Caught By | When |
|-------------|-----------|------|
| Raw HTML elements (`<button>`, `<input>`) | ESLint auto-lint on write | During build, immediately |
| Hardcoded colors (`#1a1a2e`, `text-red-500`) | ESLint auto-lint on write | During build, immediately |
| Placeholder content ("Lorem ipsum") | ESLint auto-lint on write | During build, immediately |
| Inline styles without CSS variables | ESLint auto-lint on write | During build, immediately |
| Skipped gumdrop recipe | Skill lookup gate | During build, on write attempt |
| Invalid gumdrop reference | Plan validation | Iteration 0 |
| Invalid mood/font/component | Plan validation | Iteration 0 |
| Compilation failure | Build gate | On completion |
| Runtime errors | Runtime error gate | On completion |
| Missing planned sections | Plan-diff gate | On completion |
| Copied reference verbatim | Similarity gate | On completion |
| Inconsistent spacing | Visual Review Tier 1 | On completion |
| Typography proliferation (too many font sizes) | Visual Review Tier 1 | On completion |
| Poor alignment regularity | Visual Review Tier 1 | On completion |
| Low contrast | Visual Review Tier 1 | On completion |
| Generic / "AI slop" aesthetic | Visual Review Tier 2 | On completion |
| Composition doesn't match plan intent | Visual Review Tier 2 | On completion |
| Ralph spinning (repeated identical tool calls) | Stall detection (API 3.2) | During build, per iteration |
| Context window overflow | Preflight (API 3.2) | Before each LLM call |

### Defense in Depth

No single gate carries the full burden. If one gate is bypassed (e.g., ESLint doesn't catch a layout issue because it's source-level not render-level), a later gate catches it (Visual Review sees the spacing problem in rendered DOM). The layers are:

```
Layer 0: Plan validation       → Contract exists and is valid
Layer 1: Skill lookup gate     → Ralph consulted the knowledge base
Layer 2: Auto-lint on write    → Source code meets design system contract
Layer 3: Build + runtime gates → Code compiles and runs
Layer 4: Plan-diff gate        → Implementation matches contract
Layer 5: Similarity gate       → Output is remix, not copy
Layer 6: Visual Review         → Rendered result meets quality bar
```

Each layer catches failures the previous layers can't see. Layer 2 (source) can't see layout issues. Layer 3 (build) can't see design quality. Layer 5 (similarity) can't see rendered aesthetics. Layer 6 (visual) can't see source-level violations. Together, they cover the full spectrum from source to render.

---

## 4. MANDATORY SKILL LOOKUP GATE

### The Problem

The gumdrop system is worthless if Ralph can skip it. Currently, SKILL.md is passive — Ralph has to choose to search it. The system prompt says "Research: Search skills for relevant patterns" but that's a suggestion, not enforcement. Ralph regularly ignores it, especially when the model is confident (or lazy). The result: Ralph writes from training data instead of gumdrop knowledge, producing generic compositions that miss cross-composition opportunities and don't follow block atom conventions.

### The Solution: Write Interception Gate

The Toolkit 2.0 write interception pipeline already intercepts every file write for path validation, syntax checking, and auto-lint. Add one more check: **did Ralph load the relevant gumdrop recipe before writing this section file?**

### How It Works

```
Ralph: { tool: "write", path: "src/sections/Pricing.tsx", content: "..." }
        │
        ▼
┌─── Write Interception Pipeline ───────────────────────────────────────┐
│                                                                       │
│  Step 1: Write guard (existing)                                       │
│    Path allowed? Extension valid? → PASS                              │
│                                                                       │
│  Step 2: Plan lookup                                                  │
│    Is this a section/pane file? (matches src/sections/* or src/panes/*)│
│    YES → Read plan.tsx                                                │
│         Find the <Section> or <Pane> whose output file maps here     │
│         Extract: gumdrop="pricing"                                    │
│    NO  → SKIP (not a section file, no gumdrop requirement)            │
│                                                                       │
│  Step 3: Tool call history check                                      │
│    Scan this iteration's tool call history:                           │
│      Did Ralph call grep/cat/skill with "pricing" in the query/path? │
│      Specifically, look for:                                          │
│        - grep skill "pricing"                                         │
│        - grep skill "marketing/pricing"                               │
│        - cat skills/gumdrops/marketing/pricing.md                     │
│        - cat skills/gumdrops/marketing/pricing.ref.tsx                │
│                                                                       │
│    Match found → PASS (Ralph consulted the recipe)                    │
│    No match   → REJECT                                                │
│                                                                       │
│  Step 4: Rejection response (if step 3 fails)                         │
│    Return structured error:                                           │
│    "Write rejected: section file requires gumdrop recipe lookup.      │
│     Plan specifies gumdrop='pricing' for this section.                │
│     Run: grep skill pricing                                           │
│     Then retry the write."                                            │
│                                                                       │
│  Step 5: Write succeeds → continue to syntax validation, auto-lint    │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Edge Cases

**Custom sections (escape hatch):** If the plan declares `<Section custom>`, the skill lookup gate is skipped. Ralph is composing directly from stack atoms with no gumdrop recipe. Anti-slop gates still apply.

**No plan exists:** If .ralph/plan.tsx doesn't exist (e.g., Ralph is running without Chief), the skill lookup gate is disabled. This preserves backward compatibility — existing workflows without planning aren't affected. The gate activates only when a plan exists and references gumdrops.

**Ralph loaded the recipe in a previous iteration:** The gate tracks loaded gumdrops in a session-level `Set<string>`, not by scanning iteration history. When Ralph calls `grep skill pricing` or `cat skills/gumdrops/.../pricing.ref.tsx`, the dispatch wrapper adds `"pricing"` to the Set. The Set persists across iterations for the entire Ralph loop session and resets when a new task starts. This avoids false rejections in fix-rewrite cycles (load recipe in iteration 5, fix lint error in iteration 6, rewrite same file in iteration 7 — the Set still contains "pricing") and is cheaper than scanning tool call arrays.

**Shared section files:** If a single file contains components for multiple sections (not recommended), the gate checks that ALL referenced gumdrops were loaded. But the recommended pattern is one file per section.

**API routes (Hono):** If the plan declares `<API route="..." gumdrop="crud-resource">`, the gate checks for API gumdrop recipe loading when writing src/api/ files. Same mechanism, different file path pattern.

### Where It Lives

The skill lookup gate is implemented in the Toolkit 2.0 `buildRalphTools()` dispatch wrapper — the same place auto-lint-on-write lives. Both wrap the write tool's dispatch function:

```typescript
// Conceptual — in buildRalphTools() dispatch wrapper
const loadedGumdrops = new Set<string>()  // session-level, persists across iterations

dispatchers.set('write', async (args: WriteArgs) => {
  // 1. Write guard (existing)
  guardResult = writeGuard(args.path)
  if (!guardResult.pass) return guardResult.error

  // 2. Skill lookup gate (NEW — this document)
  if (isSectionFile(args.path) && planExists()) {
    const requiredGumdrop = getGumdropForPath(args.path, plan)
    if (requiredGumdrop && !loadedGumdrops.has(requiredGumdrop)) {
      return structuredError({
        error: 'skill_lookup_required',
        command: 'write',
        gumdrop: requiredGumdrop,
        guidance: `Run: grep skill ${requiredGumdrop}`,
        planSection: getPlanSectionName(args.path, plan),
      })
    }
  }

  // 3. Write file
  const result = await writeFile(args.path, args.content)

  // 4. Auto-lint (existing — ESLint integration)
  if (isSourceFile(args.path)) {
    const lintResult = lintFile(args.path, args.content)
    if (lintResult.errorCount > 0) {
      return `${result}\n\n${formatCompactLint(lintResult)}`
    }
  }

  return result
})
```

### Tracking Loaded Gumdrops

The dispatch wrapper for `grep` and `shell` (cat) commands records gumdrop loads into the session Set:

```typescript
// In buildRalphTools() — wrap grep and shell dispatchers to track gumdrop loads

const originalGrepDispatch = dispatchers.get('grep')!
dispatchers.set('grep', async (args: any) => {
  const result = await originalGrepDispatch(args)
  // If this was a skill search, record the gumdrop name
  const query = args.query || args.pattern || ''
  if (query.includes('skill') || args.mode === 'skill') {
    const match = findGumdropNameInQuery(query, gumdropRegistry)
    if (match) loadedGumdrops.add(match)
  }
  return result
})

const originalShellDispatch = dispatchers.get('shell')!
dispatchers.set('shell', async (args: any) => {
  const result = await originalShellDispatch(args)
  const command = args.command || ''
  // If this was a cat of a gumdrop file, record it
  if (command.includes('cat') && command.includes('gumdrops/')) {
    const match = findGumdropNameInPath(command, gumdropRegistry)
    if (match) loadedGumdrops.add(match)
  }
  return result
})

function findGumdropNameInQuery(query: string, registry: Set<string>): string | null {
  for (const name of registry) {
    if (query.includes(name)) return name
  }
  return null
}
```

The `gumdropRegistry` Set is built at session start from the `skills/gumdrops/` directory listing — the same source that generates the union types.

### What This Enforces

Without the skill lookup gate, the quality pipeline has a gap between "plan says use pricing gumdrop" (Layer 0) and "source code uses @wiggum/stack atoms" (Layer 2). Ralph could plan to use the pricing gumdrop, ignore the recipe entirely, write a generic three-column card grid from training data, and pass both plan validation (section exists with the right name) and ESLint (uses stack components, not raw HTML). The skill lookup gate closes this gap — Ralph must have actually consulted the pricing recipe before its write is accepted.

---

## 5. PLAN.TSX GUMDROP INTEGRATION

### The Gumdrop Union Type

The JSX Planning Language spec defines typed props for `<Section>` components. The `gumdrop` prop must be a union of all registered gumdrop names — currently 62. This type lives in the planning component library and is generated from the gumdrop registry:

```typescript
// Generated from the gumdrop registry — one source of truth
type GumDropName =
  // Marketing (14)
  | 'hero' | 'features' | 'pricing' | 'testimonials' | 'faq' | 'cta'
  | 'team' | 'social-proof' | 'contact' | 'newsletter' | 'blog-grid'
  | 'gallery' | 'portfolio' | 'footer'
  // App (21)
  | 'stats-dashboard' | 'data-table' | 'kanban-board' | 'form-layout'
  | 'auth-login' | 'sidebar-nav' | 'dialog-modal' | 'command-palette'
  | 'settings-panel' | 'onboarding' | 'chat-messaging' | 'notification-feed'
  | 'calendar-view' | 'search-results' | 'empty-state' | 'profile-page'
  | 'activity-feed' | 'grid-list' | 'file-browser' | 'file-upload'
  | 'ai-prompt'
  // Content (4)
  | 'article-layout' | 'documentation' | 'changelog' | 'timeline'
  // Interactive (7)
  | 'drag-drop' | 'multi-step-wizard' | 'rich-text-editor' | 'color-picker'
  | 'keyboard-shortcuts' | 'infinite-scroll' | 'sortable-list'
  // API (6)
  | 'crud-resource' | 'auth-session' | 'file-upload-api'
  | 'realtime-messaging' | 'search-query' | 'pagination-api'

type ShellName =
  | 'data-observatory' | 'pricing-lab' | 'project-board' | 'crm-workspace'
  | 'file-manager' | 'content-studio' | 'ai-workspace' | 'admin-console'
  | 'marketplace' | 'event-stream'
```

### Type Generation

These union types are **generated, not hand-maintained.** The `scripts/generate-gumdrop-types.ts` build script scans the `skills/gumdrops/` directory structure and emits `src/lib/planning/gumdrop-types.generated.ts`. Same pattern as API 3.2's `generate-model-registry.ts` — build-time codegen, committed to repo, regenerated when the source changes.

The script:
1. Walks `skills/gumdrops/` — each subdirectory is a domain, each `.md` file is a gumdrop
2. Extracts gumdrop names from filenames (e.g., `skills/gumdrops/marketing/pricing.md` → `'pricing'`)
3. Extracts shell names from `skills/gumdrops/shells/` directory
4. Reads cross-composition names from a `compositions.json` registry file in the skills directory
5. Emits TypeScript union types: `GumDropName`, `ShellName`, `CompositionHint`
6. Emits a `gumdropRegistry` Set for the skill lookup gate's `findGumdropNameInQuery()`

Run: `npx tsx scripts/generate-gumdrop-types.ts` — triggered manually after adding/removing/renaming gumdrops. If the generated file is stale (gumdrop directory has files not in the union), the plan validation gate catches it: Ralph references a gumdrop that exists on disk but isn't in the type. Fix: regenerate.

### The Compose Prop

Cross-composition patterns get named identifiers that can be referenced in plan.tsx:

```typescript
type CompositionHint =
  // Simple
  | 'card-table' | 'form-drawer' | 'stats-collapsible' | 'table-hovercard'
  | 'metrics-as-nav' | 'contextual-actions' | 'hover-dense' | 'blog-filter'
  // Intermediate
  | 'kanban-sheet' | 'accordion-form' | 'command-grid' | 'rich-timeline'
  | 'tabbed-zones' | 'progressive-settings' | 'file-contextmenu'
  | 'merged-surface' | 'rich-chat' | 'nonlinear-onboarding' | 'mega-menu'
  | 'pricing-lab' | 'expandable-rows' | 'preview-dock' | 'dual-comparison'
  | 'settings-engine' | 'timeline-nav'
  // Advanced
  | 'spatial-context' | 'inbox-style' | 'live-article'
  | 'calendar-commerce' | 'adaptive-command'
  // Open for custom
  | (string & {})

interface SectionProps {
  gumdrop?: GumDropName
  custom?: boolean          // escape hatch — no gumdrop
  description?: string      // human-readable intent
  layout?: Layout           // layout suggestion (string union with open escape)
  compose?: CompositionHint | CompositionHint[]  // cross-composition patterns to use
  children?: ReactNode      // Column, Field, Action, Slot declarations
}
```

Usage in plan.tsx:

```tsx
{/* Simple pricing section */}
<Section gumdrop="pricing">
  <Gumdrop name="pricing" />
</Section>

{/* Pricing with composition hints */}
<Section gumdrop="pricing" compose={["dual-comparison", "merged-surface"]}>
  <Gumdrop name="pricing" />
</Section>

{/* Custom section — escape hatch */}
<Section custom description="3D product configurator with orbit controls">
  <Slot name="canvas" />
  <Slot name="controls" />
  <Slot name="materials-panel" />
</Section>
```

### Shell and Pane Components

For full-stack shell applications, the plan gains new components:

```typescript
interface ShellProps {
  template: ShellName
  children?: ReactNode  // Pane and API declarations
}

interface PaneProps {
  name: string
  gumdrop: GumDropName
  compose?: CompositionHint | CompositionHint[]
  position: 'top' | 'main' | 'sidebar' | 'bottom' | 'sheet' | 'drawer' | (string & {})
}

interface APIProps {
  route: string
  gumdrop: GumDropName  // must be from API domain
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'ALL'
}
```

Usage:

```tsx
<Shell template="project-board">
  <Pane name="stats" gumdrop="stats-dashboard" compose={["metrics-as-nav"]} position="top" />
  <Pane name="board" gumdrop="kanban-board" compose={["inbox-style"]} position="main" />
  <Pane name="detail" gumdrop="chat-messaging" position="sheet" />
  <API route="/api/boards/:id" gumdrop="crud-resource" />
  <API route="/api/cards/:id" gumdrop="crud-resource" method="PATCH" />
  <API route="/api/stats" gumdrop="search-query" />
  <API route="/api/events" gumdrop="realtime-messaging" />
</Shell>
```

### What Plan.tsx Enables for Each System

| System | What plan.tsx provides |
|--------|----------------------|
| **Skill lookup gate** | Which gumdrop Ralph must load for each section/pane |
| **Plan-diff gate** | Expected sections, gumdrops, and compositions to verify against |
| **Similarity gate** | Which ref file to compare each section against |
| **ESLint config** | `<Rule>` elements generate per-project severity overrides |
| **Visual Review** | `<Rule>` thresholds, philosophy statement, composition expectations |
| **API 3.2 preflight** | Plan size in token budget; plan as mandatory context item |
| **API 3.2 stall recovery** | Section/pane name for targeted "re-read this gumdrop" guidance |
| **Chief** | Typed vocabulary for suggesting gumdrops and compositions |

---

## 6. CONTEXT BUDGET FOR GUMDROP LOADING

### The Problem

Ralph rebuilds its message array each iteration. The system prompt, plan.tsx, status files, tool definitions, and accumulated tool results all consume tokens. Gumdrop refs are additional context — valuable but not free. Without budget awareness, Ralph might load 5 gumdrop refs (5 × 120 tokens = 600 tokens) plus a shell bundle (400 + 200 + 100 = 700 tokens) and push the total context past the model's limit.

### The Protocol

LLM API 3.2's `preflightCheck()` runs before every request. It estimates total tokens and compares against the model's context window (from the model capability registry). The gumdrop loading budget is part of this estimate.

**Mandatory context items (always loaded):**

| Item | Estimated Tokens | Source |
|------|-----------------|--------|
| System prompt | ~1,400 | Ralph loop |
| plan.tsx | ~200-400 | Planning language |
| .ralph/status.txt | ~50 | Ralph loop |
| Tool definitions | ~800 | Toolkit 2.0 |
| **Total reserved** | **~2,450-2,650** | |

**Variable context items (loaded on demand):**

| Item | Estimated Tokens | When Loaded |
|------|-----------------|-------------|
| Gumdrop .md recipe | ~30 per recipe | Always, for the current section |
| Gumdrop .ref.tsx | ~120 per ref | First use of a gumdrop in session |
| Shell .ref.tsx | ~400 | Shell build only |
| Shell .api.ts | ~200 | Shell build only |
| Shell .schema.ts | ~100 | Shell build only |
| Previous tool results | ~100-2,000 | Accumulated from prior iterations |

**Budget enforcement:**

```typescript
function canLoadGumdropRef(
  refSize: number,
  currentContextSize: number,
  modelContextWindow: number
): { allowed: boolean; reason?: string } {
  const headroom = modelContextWindow - currentContextSize
  const minimumReserve = 4000 // tokens reserved for model output + one tool result

  if (refSize > headroom - minimumReserve) {
    return {
      allowed: false,
      reason: `Loading this ref (${refSize} tokens) would leave only ${headroom - refSize} tokens.
               Minimum reserve is ${minimumReserve}. Load the .md recipe only and compose from block atom names.`
    }
  }

  return { allowed: true }
}
```

**Loading strategy by model size:**

| Model Context Window | Strategy |
|---------------------|----------|
| 128K+ (Claude, GPT-4) | Load all relevant refs in one iteration. No budget pressure. |
| 32K-128K | Load shell bundle + one pane ref per iteration. Rotate panes. |
| 8K-32K | Load .md recipes only. Never load .ref.tsx. Ralph composes from block atom names. |
| <8K | Plan condensation (see JSX Planning §). Minimal recipes. Ralph relies on training data + block atom names. |

### Plan Condensation

When the API 3.2 preflight detects insufficient budget for the full plan, the plan parser produces a minimal summary:

```
Full plan.tsx: ~400 tokens
Condensed plan: ~80 tokens
```

Condensed format:

```
PLAN: TaskFlow
MOOD: midnight, seed 220
SHELL: project-board
PANES: stats-dashboard[top, metrics-as-nav], kanban-board[main, inbox-style], chat-messaging[sheet]
API: /api/boards/:id(crud), /api/stats(search), /api/events(realtime)
```

This ensures plan context is always present, even on constrained models. Ralph loses composition hints and Rule elements but retains the structural blueprint.

### Hard Floor: When Context Is Insufficient

If mandatory context (system prompt + condensed plan + tool definitions + status) exceeds 80% of the model's context window, the preflight rejects the request entirely:

```typescript
const mandatoryTokens = estimateTokens(systemPrompt) + estimateTokens(condensedPlan)
  + estimateTokens(toolDefinitions) + estimateTokens(statusFile)
const hardFloor = modelContextWindow * 0.8

if (mandatoryTokens > hardFloor) {
  return {
    error: 'context_insufficient',
    message: `This model's context window (${modelContextWindow} tokens) is too small for the current task.
              Mandatory context requires ~${mandatoryTokens} tokens, leaving insufficient room for
              tool results and model output. Use a model with at least ${Math.ceil(mandatoryTokens / 0.5)} tokens.`,
    mandatoryTokens,
    modelContextWindow,
  }
}
```

This prevents Ralph from attempting generation with insufficient context, which produces cryptic failures or hallucinated outputs. Better to fail explicitly with a clear "use a bigger model" message than to silently degrade.

---

## 7. PLAN-AWARE STALL RECOVERY

### The Problem

API 3.2 detects when Ralph stalls — identical tool call signatures across consecutive iterations. The current recovery is a generic prompt: "You appear to be repeating the same actions. Try a different approach." This is vague. With plan.tsx, recovery can be targeted.

### The Protocol

When stall detection triggers (consecutive identical tool calls ≥ 3):

1. **Identify the stuck section.** Look at the tool calls — which file was Ralph trying to write? Map it to the plan's section/pane.

2. **Generate targeted recovery prompt.** Include:
   - The specific plan section Ralph is stuck on
   - The gumdrop name from the plan
   - A suggestion to re-read the gumdrop recipe
   - Alternative composition arrangements from the recipe

```typescript
function generateStallRecovery(
  plan: ParsedPlan,
  lastToolCalls: ToolCallRecord[]
): string {
  const stuckFile = extractTargetFile(lastToolCalls)
  const planSection = findPlanSection(plan, stuckFile)

  if (!planSection) {
    // No plan context — fall back to generic recovery
    return "You appear to be repeating the same actions. Try a different approach."
  }

  const gumdrop = planSection.gumdrop
  const compositions = planSection.compose || []

  return [
    `You're stuck on the "${planSection.name}" section (gumdrop: ${gumdrop}).`,
    `Re-read the gumdrop recipe: grep skill ${gumdrop}`,
    compositions.length > 0
      ? `The plan suggests these compositions: ${compositions.join(', ')}. Try a different arrangement from the recipe.`
      : `Try a different remix arrangement from the recipe's options.`,
    `If the current approach isn't working, consider:`,
    `  - Using fewer block atoms (simpler composition)`,
    `  - Trying a different arrangement from the recipe`,
    `  - Breaking the section into smaller files`,
  ].join('\n')
}
```

### Example

Ralph is stuck trying to build the stats dashboard pane. Three consecutive iterations produce identical `write src/panes/StatsDashboard.tsx` calls that fail ESLint.

Generic recovery: "Try a different approach." (Useless.)

Plan-aware recovery:
```
You're stuck on the "stats" pane (gumdrop: stats-dashboard).
Re-read the gumdrop recipe: grep skill stats-dashboard
The plan suggests these compositions: metrics-as-nav. Try a different arrangement from the recipe.
If the current approach isn't working, consider:
  - Using fewer block atoms (simpler composition)
  - Trying a different arrangement from the recipe
  - Breaking the section into smaller files
```

This gives Ralph actionable guidance instead of a vague retry instruction.

---

## 8. VISUAL REVIEW THRESHOLDS FROM GUMDROP INTENT

### The Problem

Structure Plus (Tier 1) applies 17 heuristic checks with default thresholds. But "correct" looks different for different gumdrops. A stats dashboard should have consistent card spacing (tight gap variance tolerance). A hero section should have generous whitespace (loose gap variance tolerance). A data table should have dense information (many elements per viewport). A pricing section should have consistent column alignment. Default thresholds can't capture these differences.

### How Gumdrop Intent Flows to Visual Review

Two pathways:

**Pathway 1: Plan's `<Rule>` elements → explicit thresholds**

The plan.tsx can declare visual rules that override Structure Plus defaults:

```tsx
<Section gumdrop="stats-dashboard" compose={["metrics-as-nav"]}>
  <Rule no="gap variance between stat cards exceeding 4px" />
  <Rule no="more than 4 stat cards in a single row" />
  <Rule require="tabular-nums on all numeric values" />
</Section>

<Section gumdrop="pricing">
  <Rule no="more than 10 features per tier" />
  <Rule require="column alignment between pricing tiers" />
  <Rule no="identical styling on all tiers — featured tier must differ" />
</Section>

<Section gumdrop="data-table">
  <Rule require="minimum 5 visible rows" />
  <Rule no="horizontal scrolling on desktop viewport" />
</Section>
```

Visual Review parses these `<Rule>` elements and maps them to heuristic check thresholds:

| Rule | Mapped Heuristic | Threshold Override |
|------|-----------------|-------------------|
| "gap variance between stat cards exceeding 4px" | spacing-variance | maxVariance: 4px (default: 8px) |
| "more than 4 stat cards in a single row" | child-count | maxChildrenInRow: 4 |
| "column alignment between pricing tiers" | alignment-regularity | maxAlignmentOffset: 2px (default: 4px) |
| "more than 10 features per tier" | content-overflow | maxListItems: 10 |

**Pathway 2: Gumdrop-implied defaults**

Even without explicit `<Rule>` elements, the gumdrop name itself implies visual expectations. A lookup table maps gumdrop names to baseline threshold adjustments:

```typescript
const gumdropVisualDefaults: Record<GumDropName, Partial<VisualThresholds>> = {
  'stats-dashboard': {
    spacingVariance: { maxGapDelta: 4 },    // tight consistency
    typography: { maxFontSizes: 4 },         // limited type scale
    alignment: { maxOffset: 2 },             // strict alignment
  },
  'hero': {
    spacingVariance: { maxGapDelta: 16 },   // loose — dramatic spacing OK
    typography: { maxFontSizes: 3 },         // very limited — heading + body + small
    whitespace: { minRatio: 0.4 },           // at least 40% whitespace
  },
  'data-table': {
    density: { minElementsPerViewport: 20 }, // dense information
    alignment: { maxOffset: 1 },             // pixel-perfect columns
    typography: { maxFontSizes: 3 },         // heading + body + metadata
  },
  'pricing': {
    alignment: { maxOffset: 2 },             // columns must align
    spacingVariance: { maxGapDelta: 4 },    // tier spacing consistent
    balance: { maxWeightDelta: 0.15 },       // tiers visually balanced
  },
  'kanban-board': {
    spacingVariance: { maxGapDelta: 4 },    // column gaps consistent
    density: { minElementsPerViewport: 8 },  // at least some cards visible
  },
  // ... remaining gumdrops
}
```

**Pathway 1 overrides Pathway 2.** If the plan has explicit `<Rule>` elements, those take priority. If not, gumdrop-implied defaults apply. If neither exists (custom section, no plan), Structure Plus uses hardcoded defaults.

### Tier 2 Vision Prompt Enhancement

Ralph's Eyes (the vision LLM) receives additional context from the plan:

```typescript
function buildVisionPrompt(plan: ParsedPlan, screenshot: string): string {
  const sections = plan.sections.map(s =>
    `- "${s.name}": ${s.gumdrop || 'custom'}${s.compose ? ` with ${s.compose.join(', ')}` : ''}`
  ).join('\n')

  return `
    Review this UI screenshot for design quality.

    CONTEXT:
    App: ${plan.name}
    Philosophy: ${plan.theme.philosophy || 'Not specified'}
    Mood: ${plan.theme.mood}
    Sections:
    ${sections}

    CHECK FOR:
    1. Does each section use its gumdrop pattern appropriately? (not generic card grids)
    2. Are the composition hints visible in the layout? (e.g., "metrics-as-nav" means stat cards should look clickable)
    3. Is the overall aesthetic consistent with the mood "${plan.theme.mood}"?
    4. Does this look like a designed product or generic AI output?
    5. Are there any spacing, alignment, or typography issues?

    SPECIFIC RULES:
    ${plan.rules.map(r => `- ${r}`).join('\n')}

    Rate overall quality 1-10 and list specific findings.
  `
}
```

This makes Tier 2 reviews plan-aware. The vision LLM knows what compositions to expect and can identify when the rendered output doesn't match the plan's intent.

---

## 9. THE ANTI-SLOP STACK

### What "Slop" Means in Wiggum's Context

AI slop is the generic, indistinguishable output that AI code generators produce. Characteristics:

- Purple gradient backgrounds
- Three identical Card components in a grid
- Lorem ipsum or "Your X here" placeholder text
- Hardcoded colors that don't form a coherent palette
- Raw HTML elements instead of design system components
- Every page looks the same regardless of stated purpose
- No composition — just vertical stacking of independent sections
- Default everything — no design decisions visible

### How Each Layer Fights Slop

```
┌────────────────────────────────────────────────────────────────────┐
│  ANTI-SLOP LAYER 1: DESIGN VOCABULARY (Gumdrops Remix)            │
│                                                                    │
│  287 block atoms across 62 gumdrops give Ralph a vocabulary that   │
│  extends beyond "Card + Grid." PricingTier, StatCard, KanbanColumn,│
│  ChatBubble — these are specific, purposeful atoms that produce    │
│  specific, purposeful layouts. The vocabulary itself prevents      │
│  generic composition because the pieces are domain-specific.       │
│                                                                    │
│  30 cross-composition patterns show Ralph how to combine atoms     │
│  in unexpected ways. Table inside Card. Form inside Drawer.        │
│  Stats cards as navigation. These aren't patterns Ralph would      │
│  discover from training data.                                      │
│                                                                    │
│  Similarity gate (>80% = flag, >95% = reject) prevents Ralph      │
│  from copying refs verbatim. The refs are inspiration, not         │
│  templates.                                                        │
├────────────────────────────────────────────────────────────────────┤
│  ANTI-SLOP LAYER 2: DESIGN INTENT (JSX Planning Language)         │
│                                                                    │
│  plan.tsx declares WHAT Ralph builds with typed precision.          │
│  Gumdrop references constrain to known patterns. Composition       │
│  hints guide toward interesting combinations. <Rule> elements      │
│  encode specific quality criteria. Philosophy statement gives      │
│  Ralph a creative direction.                                       │
│                                                                    │
│  Plan validation catches invalid references at iteration 0,        │
│  before any code is written. Plan-diff catches structural          │
│  deviation at completion. The plan is the anti-slop contract.      │
├────────────────────────────────────────────────────────────────────┤
│  ANTI-SLOP LAYER 3: KNOWLEDGE ENFORCEMENT (Skill Lookup Gate)     │
│                                                                    │
│  Ralph must consult the gumdrop recipe before writing section      │
│  files. This is mechanical — a write interception gate, not a      │
│  prompt instruction. Ralph cannot write from training data          │
│  instead of gumdrop knowledge. The recipes contain block atom      │
│  names, remix arrangements, cross-composition suggestions, and     │
│  anti-patterns. Consulting them is mandatory.                      │
├────────────────────────────────────────────────────────────────────┤
│  ANTI-SLOP LAYER 4: SOURCE QUALITY (ESLint Integration)           │
│                                                                    │
│  AST-aware rules catch the hallmarks of slop at source level:      │
│  raw HTML elements (use @wiggum/stack), hardcoded colors (use      │
│  CSS variables), placeholder content (use real labels), inline     │
│  styles without variables. Auto-lint on write provides immediate   │
│  feedback — Ralph sees violations in the write response, not       │
│  after claiming "done."                                            │
├────────────────────────────────────────────────────────────────────┤
│  ANTI-SLOP LAYER 5: VISUAL VERIFICATION (Visual Review)           │
│                                                                    │
│  Even if source code passes all gates, the rendered output might   │
│  still look generic. Structure Plus catches:                       │
│  - Inconsistent spacing (hallmark of copy-paste composition)       │
│  - Typography proliferation (too many font sizes = no design)      │
│  - Poor alignment (columns don't line up)                          │
│  - Low whitespace ratio (everything crammed together)              │
│  - Visual weight imbalance (one side of the page is heavy)         │
│                                                                    │
│  Ralph's Eyes (Tier 2) provides the "taste" check — a vision       │
│  LLM that reviews the screenshot and answers: "Does this look      │
│  like a designed product or generic AI output?"                    │
├────────────────────────────────────────────────────────────────────┤
│  ANTI-SLOP LAYER 6: THEME SYSTEM (existing, not owned by          │
│  this document)                                                    │
│                                                                    │
│  12 moods, OKLCH color science, sacred geometry patterns,          │
│  consistent CSS variables consumed by all components. The theme    │
│  system makes ugly impossible — every color combination has         │
│  guaranteed contrast, every shadow profile has consistent depth,    │
│  every radius stop maintains visual rhythm. Block atoms and        │
│  gumdrops inherit theming automatically because they wrap          │
│  @wiggum/stack atoms that consume CSS variables.                   │
└────────────────────────────────────────────────────────────────────┘
```

### What Slop Looks Like at Each Layer

| Slop Characteristic | Caught At | How |
|--------------------|-----------|-----|
| Purple gradient backgrounds | ESLint (no-hardcoded-colors) + Theme system | CSS variables enforce palette |
| Three identical cards in a grid | Similarity gate (if matching ref) + Visual Review (repetitive layout) | Structural comparison + spacing heuristics |
| Lorem ipsum / placeholder text | ESLint (no-placeholder-content) | AST-aware string literal check |
| Hardcoded `text-red-500` | ESLint (no-hardcoded-colors) | AST-aware Tailwind class check |
| Raw `<button>` instead of `<Button>` | ESLint (no-raw-html-elements) | AST-aware JSX element check |
| Every page looks the same | Similarity gate (cross-project tracking) + Plan diff (composition hints) | Diversity tracking across projects |
| Vertical stacking of unrelated sections | Plan diff (composition hints) + Visual Review | Plan says "use metrics-as-nav" but output is just stacked sections |
| No discernible design decisions | Visual Review Tier 2 (vision LLM) | "Does this look designed or generic?" |
| Default typography (Inter 16px everything) | Visual Review Tier 1 (typography check) | Font size count, heading hierarchy |

---

## 10. CROSS-SYSTEM MULTIPLICATION MATRIX

Each pair of systems creates effects neither system achieves alone:

### Gumdrops × Planning

| Effect | How |
|--------|-----|
| Typed gumdrop references | Plan's union type constrains to registered gumdrops |
| Composition hints in contracts | `compose` prop tells Ralph which cross-compositions to use |
| Shell architectural blueprints | `<Shell>` + `<Pane>` + `<API>` plan full-stack apps |
| Plan-diff verifies gumdrop usage | Diff gate checks that planned gumdrops appear in implementation |

### Gumdrops × Toolkit 2.0

| Effect | How |
|--------|-----|
| Mandatory recipe loading | Write gate checks tool call history for gumdrop lookup |
| Gumdrop as searchable knowledge | `grep skill` returns recipe from skills directory |
| Ref loading as explicit tool call | `cat skills/gumdrops/.../pricing.ref.tsx` is a tracked action |
| Structured rejection on skip | Write gate returns actionable error with `grep skill` suggestion |

### Gumdrops × ESLint

| Effect | How |
|--------|-----|
| Block atoms enforce stack usage | Gumdrops wrap @wiggum/stack atoms; ESLint catches raw HTML |
| CSS variable enforcement | Block atoms consume variables; ESLint catches hardcoded values |
| Immediate feedback on write | Auto-lint catches violations in the write response, not at completion |
| Design system contract floor | ESLint is the minimum — you can't go below stack components |

### Gumdrops × Visual Review

| Effect | How |
|--------|-----|
| Intent-aware thresholds | stats-dashboard expects tight spacing; hero expects generous whitespace |
| Composition verification | Plan says "merged-surface" — Tier 1 checks column alignment, Tier 2 checks visual unity |
| Anti-slop rendered check | Even if code passes ESLint, rendered output checked for generic patterns |
| Plan-aware vision prompts | Tier 2 knows which compositions to expect per section |

### Gumdrops × API 3.2

| Effect | How |
|--------|-----|
| Context-budgeted ref loading | Preflight checks whether loading a ref exceeds context window |
| Progressive loading strategy | .md always, .ref.tsx on demand, shell bundle when needed |
| Plan-aware stall recovery | "You're stuck on stats-dashboard — re-read the recipe" |
| Cost tracking per gumdrop | Usage data shows how many tokens each gumdrop reference consumed |

### Planning × Toolkit 2.0

| Effect | How |
|--------|-----|
| Plan as shell command | `plan validate` is a typed tool Ralph can call |
| Plan generates lint config | `<Rule>` elements compile to ESLint severity overrides |
| Plan informs write gate | Write gate reads plan to determine required gumdrop per section |

### Planning × API 3.2

| Effect | How |
|--------|-----|
| Plan as mandatory context | Preflight reserves budget for plan.tsx |
| Plan condensation for small models | Parser produces minimal plan when budget is tight |
| Plan sections in stall recovery | Recovery prompt identifies stuck section by name |
| Streaming for Chief plan building | Chief uses stream() to write plan.tsx conversationally |

### Planning × Visual Review

| Effect | How |
|--------|-----|
| Rule-driven thresholds | `<Rule>` elements override default heuristic thresholds |
| Philosophy in vision prompt | Plan's philosophy statement guides Tier 2 aesthetic judgment |
| Structural fidelity check | Plan-diff gate and visual review are complementary halves — did you build the right things? Do they look right? |

### Toolkit 2.0 × ESLint

| Effect | How |
|--------|-----|
| Lint as dual-mode command | `lint` is both shell command and discrete typed tool |
| Auto-lint in write pipeline | Toolkit 2.0 dispatch wraps writes with lint check |
| Structured lint errors | Zod-validated error format, not English parsing |

### Toolkit 2.0 × API 3.2

| Effect | How |
|--------|-----|
| Tool schemas from commands | Toolkit 2.0 generates typed tool definitions for API 3.2 |
| Tool call validation | Zod safeParse before dispatch, structured errors on failure |
| Usage tracking per tool | API 3.2 tracks tokens consumed by each tool result |

### ESLint × Visual Review

| Effect | How |
|--------|-----|
| Source + rendered coverage | ESLint catches source issues; Visual Review catches rendered issues |
| No overlap | ESLint never sees DOM; Visual Review never sees source. Clean separation. |
| Complementary catching | ESLint: "you used a raw `<div>`." Visual Review: "your spacing is inconsistent." Different symptoms of the same slop. |

### API 3.2 × Visual Review

| Effect | How |
|--------|-----|
| Vision LLM as second provider | Tier 2 uses API 3.2's chat() with a vision model |
| Budget-aware vision calls | Preflight ensures screenshot + prompt fits in vision model's context |
| Observability for vision calls | LogTape integration logs vision review requests/responses |

---

## 11. IMPLEMENTATION DEPENDENCIES

### Cross-System Build Order

The six systems can be built largely in parallel, but integration points create dependencies. This is the recommended order:

```
                PARALLEL TRACK A             PARALLEL TRACK B
                ─────────────────            ─────────────────
Week 1:         Gumdrops Phase 1             Toolkit 2.0 Phase 1
                (3 proof-of-concept refs)    (interface + infrastructure)

Week 2:         Gumdrops Phase 2             Toolkit 2.0 Phase 2
                (marketing domain)           (first promoted commands)
                                             ESLint Phase 1
                                             (rules package)

Week 3-4:       Gumdrops Phase 3             ESLint Phase 2
                (app domain)                 (browser linter + auto-lint)
                                             LLM API 3.2 Phases 1-2
                                             (response types + streaming)

Week 5:         Gumdrops Phase 4             Planning Language Phase 0-3
                (content + interactive)      (types + validation + parser)
                                             LLM API 3.2 Phase 3
                                             (normalization + CORS)

                ┌──── INTEGRATION POINT 1 ────┐
                │ Planning types import         │
                │ gumdrop union from registry   │
                │ Toolkit 2.0 wire available    │
                └──────────────────────────────┘

Week 6:         Gumdrops Phase 5             Planning Language Phase 4-6
                (anti-slop gates +           (plan-diff + Chief integration)
                 similarity detection)       Visual Review Phase 1-2
                                             (probe + analyzer)

                ┌──── INTEGRATION POINT 2 ────┐
                │ Skill lookup gate wired into │
                │ Toolkit 2.0 write pipeline   │
                │ Auto-lint wired into writes   │
                │ Plan generates lint config    │
                └──────────────────────────────┘

Week 7-8:       Gumdrops Phase 6             Planning Language Phase 7-8
                (shells domain —             (plan-aware ESLint config +
                 requires Hono)               visual review thresholds)
                                             LLM API 3.2 Phase 5
                                             (preflight + budget + stall)
                                             Visual Review Phase 3
                                             (orchestrator + Tier 2)

                ┌──── INTEGRATION POINT 3 ────┐
                │ Full pipeline connected:      │
                │ Plan → skill gate → lint →    │
                │ build → diff → similarity →   │
                │ visual review                 │
                │ Context budget includes plan   │
                │ + gumdrop refs                │
                │ Stall recovery is plan-aware   │
                └──────────────────────────────┘

Week 8:         Gumdrops Phase 7             Full pipeline integration
                (integration testing)        testing (all systems)
```

### Critical Path

The critical path to "all systems connected" runs through:

1. **Toolkit 2.0 Phase 1** (write interception infrastructure) — everything that wraps file writes depends on this
2. **ESLint Phase 1-2** (rules + browser linter) — auto-lint-on-write depends on both Toolkit 2.0 and ESLint
3. **Planning Language Phase 0-3** (types + validation) — plan.tsx must exist before the skill lookup gate can read it
4. **Gumdrops Phase 5** (similarity detection) — the core anti-slop mechanism
5. **Integration Point 2** (skill gate + auto-lint wired) — the enforcement chain becomes active

Without Integration Point 2, the quality pipeline has gaps. Ralph can bypass gumdrops (no skill gate), ignore lint errors (no auto-lint-on-write), and deviate from plans (no diff gate). Integration Point 2 is where the pipeline becomes a real enforcement system instead of a collection of independent tools.

---

## 12. REF VALIDATION TOOLING

### The Problem

51+ reference files consume @wiggum/stack atoms. If stack atoms change (new variants, deprecated props, renamed components), refs may use stale patterns. Manual updates across 7,500 lines are expensive and error-prone.

### The Solution: Automated Ref Validator

A validation script that runs post-stack-update:

```typescript
// scripts/validate-refs.ts

interface RefValidationResult {
  file: string
  issues: RefIssue[]
}

interface RefIssue {
  severity: 'error' | 'warning'
  component: string
  message: string
  line: number
}

async function validateRefs(): Promise<RefValidationResult[]> {
  // 1. Read current @wiggum/stack exports
  const stackExports = await parseStackExports('packages/stack/src/components/ui/')

  // 2. Find all .ref.tsx files
  const refFiles = await glob('skills/gumdrops/**/*.ref.tsx')

  // 3. For each ref, extract component usage
  const results: RefValidationResult[] = []

  for (const refFile of refFiles) {
    const source = await readFile(refFile)
    const usedComponents = extractJSXComponentNames(source)
    const issues: RefIssue[] = []

    for (const { name, line } of usedComponents) {
      // Check: component exists in stack?
      if (!stackExports.has(name) && !isBlockAtom(name) && !isHTMLElement(name)) {
        issues.push({
          severity: 'error',
          component: name,
          message: `Component "${name}" not found in @wiggum/stack exports`,
          line,
        })
      }

      // Check: deprecated component?
      const meta = stackExports.get(name)
      if (meta?.deprecated) {
        issues.push({
          severity: 'warning',
          component: name,
          message: `Component "${name}" is deprecated. Use "${meta.replacement}" instead.`,
          line,
        })
      }
    }

    if (issues.length > 0) {
      results.push({ file: refFile, issues })
    }
  }

  return results
}
```

### When It Runs

- **Post-stack-update:** After any change to `packages/stack/src/components/ui/`, run the validator as a CI step.
- **Pre-release:** Before tagging a new Wiggum release, all refs must pass validation.
- **On demand:** Developers can run `npm run validate-refs` during gumdrop authoring.

### What It Catches

| Issue | Severity | Example |
|-------|----------|---------|
| Removed component | Error | Ref uses `<Menubar>`, stack removed Menubar |
| Deprecated component | Warning | Ref uses `<DropdownMenu>`, stack deprecated in favor of `<Menu>` |
| Renamed prop | Error | Ref uses `variant="ghost"`, stack renamed to `variant="subtle"` |
| Missing import | Warning | Ref references component not in standard stack exports |

### What It Doesn't Catch

- Ref quality (whether the ref demonstrates good composition) — that's human review
- Ref accuracy (whether the ref matches the .md recipe) — that's authoring discipline
- Style drift (refs using different Tailwind classes for the same effect) — that's naming conventions

---

## 13. FILE CHANGE INDEX

### New Files (Owned by This Document)

| File | Purpose | Phase |
|------|---------|-------|
| `src/lib/ralph/skill-gate.ts` | `hasLoadedGumdrop()`, `getGumdropForPath()`, skill lookup gate logic | Integration Point 2 |
| `src/lib/planning/gumdrop-types.generated.ts` | `GumDropName`, `ShellName`, `CompositionHint` union types generated from registry | Integration Point 1 |
| `src/lib/planning/shell-components.ts` | `<Shell>`, `<Pane>`, `<API>` planning components for full-stack apps | Integration Point 1 |
| `src/lib/visual-review/gumdrop-thresholds.ts` | `gumdropVisualDefaults` lookup table for intent-aware visual thresholds | Integration Point 3 |
| `src/lib/ralph/stall-recovery.ts` | `generateStallRecovery()` with plan-aware guidance | Integration Point 3 |
| `scripts/validate-refs.ts` | Ref validation script for stack API changes | Any time |
| `scripts/generate-gumdrop-types.ts` | Generates `gumdrop-types.generated.ts` from skills/gumdrops/ directory | Integration Point 1 |

### Modified Files (Changes Owned by This Document)

| File | Change | Phase |
|------|--------|-------|
| `src/lib/ralph/tool-builder.ts` (Toolkit 2.0) | Add skill lookup gate to write dispatch wrapper | Integration Point 2 |
| `src/lib/planning/components.ts` (Planning) | Import and re-export `GumDropName`, `ShellName`, add `compose` to `SectionProps` | Integration Point 1 |
| `src/lib/llm/preflight.ts` (API 3.2) | Add gumdrop ref token estimates to budget calculation | Integration Point 3 |
| `src/lib/ralph/loop.ts` | Initialize `loadedGumdrops` Set at session start, pass to `buildRalphTools()`. Use `generateStallRecovery()` when stall detected. | Integration Point 2, 3 |
| `src/lib/visual-review/analyzer.ts` (Visual Review) | Load `gumdropVisualDefaults` and merge with plan `<Rule>` overrides | Integration Point 3 |
| `src/lib/visual-review/vision-prompt.ts` (Visual Review) | Include plan sections, compositions, and philosophy in Tier 2 prompt | Integration Point 3 |

### Files NOT Changed by This Document

- Gumdrop .md and .ref.tsx files (owned by gumdrops-remix-implementation-plan.md)
- ESLint rules (owned by wiggum-eslint-integration.md)
- Planning component library internals (owned by wiggum-jsx-planning-language.md)
- LLM client internals (owned by llm-api-3_2.md)
- Visual probe data collection (owned by wiggum-visual-review-plan.md)
- Toolkit 2.0 command schemas (owned by toolkit-2_0.md)
- Hono backend patterns (owned by hono-fullstack-plan.md)
- Chief's system prompt and tools (owned by chief-implementation-plan.md)

---

## WHAT THIS DOCUMENT MAKES POSSIBLE

Without the quality pipeline, each system is independent and optional:
- Gumdrops: "Ralph should read recipes." (Hope.)
- Planning: "Ralph should follow the plan." (Suggestion.)
- ESLint: "Ralph should fix lint errors." (Eventually.)
- Visual Review: "Ralph should make it look good." (Subjectively.)

With the quality pipeline, the systems form an enforcement chain:
- Gumdrops: "Ralph **must** read recipes." (Skill lookup gate rejects writes without it.)
- Planning: "Ralph **must** follow the plan." (Plan-diff gate catches deviations.)
- ESLint: "Ralph **sees** lint errors immediately." (Auto-lint on write, same tool response.)
- Visual Review: "The rendered output **is checked** against gumdrop-specific thresholds." (Intent-aware heuristics.)

The pipeline converts six independent tools into a single integrated system where each layer reinforces the others. No single layer carries the full quality burden. No single layer can be bypassed without another layer catching the deviation.

Every gate is mechanical. None rely on prompt instructions. The quality floor is enforced by code, not by asking the model nicely.

The theme system makes ugly impossible.
Gumdrops Remix makes boring impossible.
The quality pipeline makes skipping impossible.
