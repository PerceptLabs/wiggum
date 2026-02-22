# Wiggum Task Lifecycle & Snapshots

> Atomic state management for iterative task execution. Snapshots make every completed task a rollback point. The task parser ensures Ralph never receives unstructured prose for multi-concern requests. Plan mutation gives iteration 0 an update path, not just a creation path.
>
> **This document is additive.** It fills gaps in the Planning Language (§5, §6, §8), Toolkit 2.0 (§9), and LLM API 3.2 (§13) without replacing anything those specs define. Each section notes which companion spec it extends.

---

## TABLE OF CONTENTS

1. [Why This Exists](#1-why-this-exists)
2. [The Failure Anatomy](#2-the-failure-anatomy)
3. [Architecture Overview](#3-architecture-overview)
4. [Snapshot System](#4-snapshot-system)
5. [Task Parser](#5-task-parser)
6. [Plan Mutation Protocol](#6-plan-mutation-protocol)
7. [Scope-Aware Quality Gates](#7-scope-aware-quality-gates)
8. [Stall-Triggered Recovery](#8-stall-triggered-recovery)
9. [Implementation Phases](#9-implementation-phases)
10. [File Change Index](#10-file-change-index)
11. [CC Prompt Strategy](#11-cc-prompt-strategy)
12. [Relationship to Companion Plans](#12-relationship-to-companion-plans)

---

## 1. WHY THIS EXISTS

### The Gap Across Five Specs

The Planning Language defines how Ralph creates a plan. Toolkit 2.0 defines how commands validate. LLM API 3.2 defines how the client detects stalls. ESLint catches source violations. Visual Review checks rendered output. None of them address **what happens between tasks**.

When a user sends a second message — "now refine the copy and add 2 more drinks" — five things go wrong:

1. **No save point.** The previous working state exists only as current files. One bad edit and it's gone. There's no rollback path.
2. **Stale .ralph/ state.** `summary.md` describes the old task. `feedback.md` has old gate failures. `ui-report.md` shows an old render. Ralph reads all of these alongside the new task and conflates them.
3. **Raw prose in task.md.** The user's natural language goes directly to task.md. Ralph must decompose "refine copy AND fix moods AND add 2 night drinks" from a paragraph. Multi-concern requests get partially executed or misinterpreted.
4. **No mutation path for plan.tsx.** The Planning Language (§6) covers "Ralph writes a plan" and "Chief writes a plan" but not "Ralph updates an existing plan." Iterative refinement is the common case, not the exception.
5. **No scope enforcement.** "Add 2 more drinks" became "convert 4 existing drinks" because nothing told Ralph the 8 existing flavors were immutable. Scope constraints don't exist in the current system.

### What This Document Adds

- **Snapshots** — git-based atomic save points at task boundaries, using the existing `src/lib/git/Git.ts` wrapper and isomorphic-git. No new storage system.
- **Task parser** — structured decomposition of user text before it reaches Ralph. Produces checklistified task.md with scope markers.
- **Plan mutation** — an update protocol for plan.tsx that marks sections with ADD/MODIFY/FIX annotations, preserving untouched sections explicitly.
- **Scope-aware diffing** — quality gate extensions that verify ADD resulted in addition, MODIFY resulted in change, and existing items weren't removed without authorization.

---

## 2. THE FAILURE ANATOMY

### Real Log: VIBRANT ENERGY Iteration 3

**User request:** "refine ad copy, less generic more adult. two moods not working. add 2 more drinks for nighttime."

**What Ralph did:**
- ✅ Fixed theme toggle (two moods now working)
- ❌ Converted 4 of 8 existing energy drinks into nighttime drinks (should have ADDED 2 new ones)
- ❌ Made zero ad copy changes (entirely dropped from execution)

**Root cause:** Ralph read the raw task text, prioritized the mood fix (concrete, debuggable), misinterpreted "add 2 more for nighttime" as "make some nighttime" (scope confusion), and exhausted its tool call budget before reaching the copy refinement.

**What would have prevented it:**

| Fix | Mechanism |
|-----|-----------|
| Snapshot before attempt | `git commit` at task boundary → instant rollback when user sees wrong output |
| Structured task.md | Checklist with `[ADD] 2 NEW nighttime drinks (keep existing 8)` → unambiguous scope |
| Plan mutation | Updated plan.tsx shows `cols={5}` (was 4×2, now 5×2) and marks FlavorGrid as ADD-only |
| Scope-aware gate | Plan said ADD 2, FlavorGrid count didn't increase → gate fails with "expected 10 flavors, found 8" |

---

## 3. ARCHITECTURE OVERVIEW

### The Task Lifecycle

```
User message arrives
        │
        ▼
┌─────────────────────────────────┐
│  PHASE 0: SNAPSHOT              │  Automatic. Harness-triggered.
│  git add -A                     │  Tag: task-{n}-pre
│  git commit "pre-task: ..."     │  Captures ENTIRE project state
│  (skip if first task on empty   │  including src/ AND .ralph/
│   project)                      │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│  PHASE 1: PARSE TASK            │  Harness-level. Before Ralph sees it.
│  Raw user text →                │  Produces structured task.md with:
│    - Checklist requirements     │    - [ADD] / [MODIFY] / [FIX] / [REMOVE] markers
│    - Scope constraints          │    - Explicit "do not touch" declarations
│    - Task type classification   │    - mutation | fresh | bugfix
│    - Files likely affected      │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│  PHASE 2: PLAN (iteration 0)   │  ← Planning Language §6, extended
│                                 │
│  IF fresh build:                │
│    Ralph creates plan.tsx       │  (existing Planning Language workflow)
│                                 │
│  IF mutation:                   │
│    Ralph reads existing plan    │
│    + structured task.md         │
│    → writes UPDATED plan.tsx    │  (NEW: plan mutation protocol)
│    with change markers          │
│                                 │
│  IF bugfix:                     │
│    Skip plan update             │
│    Ralph reads task + feedback  │  (minor fix, no structural change)
│                                 │
│  Validate plan.tsx (gate)       │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│  PHASE 3: EXECUTE               │  ← Existing Ralph loop (iterations 1-N)
│  Fresh context per iteration    │  Plan.tsx is the contract
│  One action per iteration       │  Quality gates check each completion
│  Discriminated union schemas    │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│  PHASE 4: SNAPSHOT RESULT       │  Automatic. Gate-pass-triggered.
│  git add -A                     │  Tag: task-{n}-post
│  git commit "task-{n}: ..."     │  Only on successful gate pass
│                                 │  Failed tasks get NO post-snapshot
│                                 │  (rollback target = task-{n}-pre)
└─────────────────────────────────┘
```

### .ralph/ State Transitions

```
BEFORE task N:
  .ralph/
  ├── origin.md         # immutable — NEVER touched
  ├── task.md           # from task N-1 (STALE)
  ├── plan.tsx          # from task N-1 (STALE or still valid)
  ├── summary.md        # from task N-1 (STALE)
  ├── feedback.md       # from task N-1 (STALE)
  ├── status.txt        # "complete" from task N-1
  └── iteration.txt     # final iteration of task N-1

AFTER Phase 0 (snapshot) + Phase 1 (parse):
  .ralph/
  ├── origin.md         # immutable — untouched
  ├── task.md           # NEW — structured, checklistified
  ├── plan.tsx          # from task N-1 (preserved for mutation reference)
  ├── summary.md        # CLEARED — fresh start
  ├── feedback.md       # CLEARED — fresh start
  ├── status.txt        # "running"
  ├── iteration.txt     # "0"
  └── task-history.md   # APPENDED — one-line entry for task N-1

AFTER Phase 2 (plan):
  .ralph/
  ├── plan.tsx          # UPDATED (mutation) or NEW (fresh build)
  └── ...               # everything else unchanged

AFTER Phase 4 (post-snapshot):
  .ralph/
  ├── summary.md        # Written by Ralph (required gate)
  ├── status.txt        # "complete"
  └── ...               # final state committed
```

The key insight: `.ralph/summary.md` and `.ralph/feedback.md` get **cleared** at task start, not carried forward. The previous task's context is preserved in the git snapshot, not in stale files. `task-history.md` is an append-only log providing Ralph a one-line-per-task history for continuity awareness without stale state pollution.

---

## 4. SNAPSHOT SYSTEM

> **Extends:** Toolkit 2.0 §9 (promoted commands), existing `src/lib/git/Git.ts`

### The `snapshot` Shell Command

Follows the Toolkit 2.0 dual-mode pattern: Zod schema, `parseCliArgs()`, works as both shell string and discrete LLM tool.

**Args Schema:**

```typescript
interface SnapshotArgs {
  action: 'save' | 'list' | 'rollback' | 'diff' | 'status'
}

// save: git add -A + commit + tag
//   → optional message string
//   → returns: commit hash + tag name
//
// list: show all task snapshots with timestamps
//   → returns: formatted list of tags with dates and messages
//
// rollback: restore project to a tagged snapshot
//   → required: target tag name
//   → returns: confirmation of restored state
//
// diff: show what changed since a tagged snapshot
//   → required: target tag name
//   → returns: file-level diff summary (not line-level — too verbose for LLM context)
//
// status: show current snapshot state
//   → returns: current tag, uncommitted changes count, last snapshot time
```

**Shell usage:**

```
snapshot save "before CTA redesign"
snapshot list
snapshot rollback task-2-post
snapshot diff task-2-post
snapshot status
```

**Discrete tool usage:**

```json
{ "tool": "snapshot", "args": { "action": "save", "message": "before CTA redesign" } }
```

### Automatic vs. Explicit Snapshots

| Trigger | Who | When | Tag Format |
|---------|-----|------|------------|
| Pre-task | Harness (automatic) | User message arrives, before parse | `task-{n}-pre` |
| Post-task | Harness (automatic) | All quality gates pass | `task-{n}-post` |
| Mid-task | Ralph (explicit) | Ralph calls `snapshot save` | `manual-{timestamp}` |
| Stall recovery | Harness (automatic) | Stall counter hits threshold | `stall-{n}-recovery` |

The automatic snapshots are harness-level — they happen in `useAIChat.ts` (or the Ralph loop entry point), not inside the loop itself. Ralph never needs to know about pre/post snapshots. It CAN call `snapshot save` explicitly if it wants a mid-task checkpoint, but the critical boundaries are handled for it.

### Git Operations Mapping

All operations use the existing `src/lib/git/Git.ts` wrapper around isomorphic-git:

| Snapshot Action | Git Operations |
|----------------|----------------|
| `save` | `git.add({ filepath: '.' })` → `git.commit({ message })` → `git.tag({ ref: tagName })` |
| `list` | `git.listTags()` → filter `task-*` → `git.readTag()` for each → format |
| `rollback` | `git.checkout({ ref: tagName, force: true })` |
| `diff` | `git.log({ ref: 'HEAD' })` → `git.log({ ref: tagName })` → `git.statusMatrix()` between them |
| `status` | `git.statusMatrix()` for uncommitted, `git.listTags()` for current position |

**No new git operations are needed.** isomorphic-git already supports add, commit, tag, checkout, log, and statusMatrix. The `snapshot` command is a thin wrapper that composes these existing operations with task-aware tagging conventions.

### Tag Naming Convention

```
task-1-pre          # snapshot before task 1
task-1-post         # snapshot after task 1 succeeds
task-2-pre          # snapshot before task 2
task-2-post         # snapshot after task 2 succeeds
task-3-pre          # snapshot before task 3 (failed)
                    # no task-3-post (task failed, pre is the rollback point)
manual-1708123456   # Ralph's explicit mid-task snapshot
stall-3-recovery    # harness snapshot before stall recovery
```

The task counter is maintained in `.ralph/task-counter.txt` — a simple integer that increments on each new user message. This file is committed with each snapshot, so rollback restores the counter too.

### Rollback Semantics

Rollback is a **hard reset**, not a merge. `snapshot rollback task-2-post` restores the entire project — `src/`, `.ralph/`, everything — to exactly the state captured at that tag. This is appropriate because:

1. User-facing rollback means "undo everything Ralph just did." Partial rollback is confusing.
2. The .ralph/ state must be consistent with src/ state. You can't rollback code but keep the new plan.
3. Git makes this atomic — `checkout --force` to a tag is a single operation.

After rollback, the user can send a new message (which creates a new task-{n+1}-pre snapshot from the restored state) or adjust their request. The failed attempt is still in git history — it's not deleted, just no longer HEAD.

---

## 5. TASK PARSER

> **Extends:** Planning Language §6 (The Ralph Workflow), pre-iteration-0 step

### The Problem with Raw task.md

Currently in `useAIChat.ts` (or wherever `sendMessage` is handled), the user's message is written directly to `.ralph/task.md`:

```typescript
// CURRENT — raw text, no processing
await fs.writeFile('.ralph/task.md', `# Task\n\n${userMessage}`)
```

For single-concern tasks ("build a recipe tracker"), this works. For multi-concern tasks ("refine copy AND fix moods AND add 2 drinks"), Ralph receives a paragraph and must decompose it during execution — while also executing. The decomposition gets worse as tool calls accumulate and context dilutes.

### The Structured Task Format

```markdown
# Task: Refine VIBRANT ENERGY landing page
Type: mutation
Previous: task-2-post
Counter: 3

## Requirements
- [MODIFY] Refine ad copy in hero and CTA sections: less generic, more adult, less Monster Energy
- [FIX] Theme toggle: two moods (voltage/chrome) not switching correctly
- [ADD] 2 new nighttime/rest drink flavors (add to existing 8, total → 10)
- [MODIFY] Second theme mood: adjust to nighttime aesthetic for new drinks

## Scope
- PRESERVE: All 8 existing energy drink flavors unchanged
- PRESERVE: Store page structure and content
- PRESERVE: Navigation and routing
- AFFECTED FILES: HeroSection.tsx, CTASection.tsx, FlavorGrid.tsx, index.css, ThemeToggle.tsx

## Original Message
> refine ad copy! less generic, more adult, less monster energy.
> two moods not working. add 2 more drinks for nighttime.
```

### How It Gets Written

The task parser runs in the harness, **before** the Ralph loop starts. Two implementation options:

**Option A: LLM-assisted parse (recommended for accuracy)**

A lightweight LLM call at task intake. Not Ralph's main model — use a fast, cheap model (the user's configured provider, or a hardcoded small model). The prompt is simple structured extraction:

```
Given the user's message and the current project state, produce a structured task.

User message: "{rawMessage}"

Existing plan.tsx: {exists | does not exist}
Previous task summary: "{lastSummary}"
Current file list: {fileList}

Output format:
- Type: mutation | fresh | bugfix
- Requirements: checklist with [ADD] / [MODIFY] / [FIX] / [REMOVE] markers
- Scope: what to PRESERVE (explicit), what files are AFFECTED
- Keep the original message verbatim at the end

Rules:
- [ADD] means create new things. Never convert existing things.
- [MODIFY] means change existing things. Always specify what stays the same.
- [FIX] means repair broken behavior. Reference the specific bug.
- [REMOVE] means delete. Explicit only — never implied.
- If ambiguous, ask for clarification (output Type: needs-clarification)
```

This is ~200-300 input tokens, ~100-200 output tokens. Fast enough to not add perceptible latency. The structured output means Ralph starts iteration 0 with a checklist, not a paragraph.

**Option B: Template-based parse (no LLM cost)**

The harness writes a template with raw text + empty structure, and Ralph fills it during iteration 0:

```markdown
# Task
Type: pending
Previous: task-2-post

## Raw Message
> refine ad copy! less generic, more adult, less monster energy.
> two moods not working. add 2 more drinks for nighttime.

## Requirements (Ralph: fill these in during planning)
- [ ] ...

## Scope (Ralph: declare what's preserved)
- PRESERVE: ...
- AFFECTED FILES: ...
```

This costs zero extra LLM calls but relies on Ralph correctly decomposing its own task — the exact failure mode we're trying to fix. **Option A is recommended.**

### Task Type Classification

| Type | Condition | Planning Behavior |
|------|-----------|-------------------|
| `fresh` | No plan.tsx exists, or user says "start over" / "build me a..." | Iteration 0: create new plan.tsx |
| `mutation` | plan.tsx exists AND task references existing features | Iteration 0: update plan.tsx with change markers |
| `bugfix` | Task describes a specific broken behavior, no structural changes | Skip plan update, go straight to iteration 1 |
| `needs-clarification` | Ambiguous scope (parser can't determine ADD vs MODIFY) | Harness pauses, asks user for clarification before starting loop |

The `needs-clarification` type is important. In the VIBRANT ENERGY case, "add 2 more drinks for nighttime" is actually ambiguous — does "more" mean "additional" or "convert some to"? A good parser flags this. A raw task.md doesn't.

### State Cleanup at Task Start

Before writing the new structured task.md, the harness cleans .ralph/ state:

```typescript
// Clear stale state from previous task
await fs.writeFile('.ralph/summary.md', '')           // clear
await fs.writeFile('.ralph/feedback.md', '')           // clear
await fs.writeFile('.ralph/status.txt', 'running')     // reset
await fs.writeFile('.ralph/iteration.txt', '0')        // reset

// Append to history (don't clear — this is the continuity record)
const historyLine = `- Task ${counter - 1}: ${previousSummaryOneLiner}\n`
await fs.appendFile('.ralph/task-history.md', historyLine)

// Write new structured task
await fs.writeFile('.ralph/task.md', structuredTaskContent)
```

The `.ralph/plan.tsx` is **NOT cleared** — it's preserved for mutation reference. If the task type is `fresh`, Ralph will overwrite it during iteration 0. If `mutation`, Ralph reads it and produces an updated version.

---

## 6. PLAN MUTATION PROTOCOL

> **Extends:** Planning Language §6 (adds third workflow: "Ralph Updates a Plan")

### The Missing Path

Planning Language §6 defines two paths:

1. **Ralph writes the plan** — iteration 0, creates plan.tsx from scratch
2. **Chief writes the plan** — Chief's `write_plan` tool creates plan.tsx, Ralph skips iteration 0

This document adds:

3. **Ralph updates the plan** — iteration 0, reads existing plan.tsx + structured task.md, produces updated plan.tsx with change markers

### Change Markers

Plan.tsx uses JSX comments as work markers. Sections without markers are explicitly out-of-scope:

```tsx
<App name="VIBRANT ENERGY" description="Energy drink landing page">
  <Theme mood="industrial" seed={140} pattern="triadic">
    {/* TASK-3 [FIX]: Debug voltage/chrome toggle switching */}
    {/* TASK-3 [MODIFY]: Second mood → nighttime aesthetic */}
    <Typography hero="4xl bold white tight" labels="xs uppercase tracking-widest" />
    <Animation hover="200ms spring" cards="300ms easeOutCubic" />
    <Rule no="hardcoded colors" />
    <Rule always="all colors via CSS custom properties" />
  </Theme>

  <Screen name="landing" layout="full-bleed">
    <Content>
      <Section gumdrop="hero">
        {/* TASK-3 [MODIFY]: Refine copy — less generic, more adult, less Monster Energy */}
      </Section>

      <Section gumdrop="features" cols={5}>
        {/* TASK-3 [ADD]: 2 nighttime drink flavors (Moonlit Calm, Deep Rest) */}
        {/* EXISTING 8 flavors PRESERVED — do not remove or convert */}
      </Section>

      <Section gumdrop="cta">
        {/* TASK-3 [MODIFY]: Match refined adult tone from hero */}
      </Section>
    </Content>
  </Screen>

  <Screen name="store">
    {/* NO CHANGES for task-3 — preserve as-is */}
  </Screen>
</App>
```

### Marker Semantics

| Marker | Meaning | Validation |
|--------|---------|------------|
| `[ADD]` | Create new elements within this section | Item count must increase |
| `[MODIFY]` | Change existing content, preserve structure | Section must still exist with same gumdrop |
| `[FIX]` | Repair behavior, don't change content | Functional check (toggle works, render passes) |
| `[REMOVE]` | Delete elements from this section | Must be explicit — never implied |
| `NO CHANGES` | Section is out of scope | No file modifications for this section's source files |
| `PRESERVED` | Specific items within a section must not change | Item count must not decrease |

### The `plan update` Subcommand

Within the Planning Language's plan shell command (§9, Phase 9), `plan update` becomes a subcommand:

```
plan update          # read task.md + existing plan.tsx → write updated plan.tsx
plan validate        # existing validation (§7)
plan diff            # existing plan-vs-implementation diff (§8)
plan show            # existing show command
plan lint-config     # existing lint config generation
```

Ralph's iteration 0 for mutation tasks:

```
1. Read .ralph/task.md (structured, with scope markers)
2. Read .ralph/plan.tsx (existing plan from previous task)
3. Read .ralph/task-history.md (context on what's been done)
4. Determine which <Screen> and <Section> elements need change markers
5. Write updated .ralph/plan.tsx with markers
6. Harness runs plan validation gate (§7)
7. If valid → proceed to iteration 1
8. If invalid → feedback, revise
```

### What Ralph Sees in System Prompt

Addition to the planning skill (referenced in Planning Language §6):

```
## Plan Updates (mutation tasks)

When task.md has Type: mutation, you are UPDATING an existing plan, not creating from scratch.

1. Read the existing plan.tsx carefully
2. For each requirement in task.md:
   - Find the relevant <Screen> or <Section>
   - Add a JSX comment with the task marker: {/* TASK-N [ADD|MODIFY|FIX]: description */}
3. Sections not mentioned in task.md get: {/* NO CHANGES for task-N */}
4. Items marked PRESERVE in task.md get: {/* PRESERVED — do not remove or convert */}
5. If a requirement needs a NEW section, add a new <Section> with [ADD] marker
6. Never remove existing <Section> elements unless task.md has [REMOVE]

The markers are your contract. During implementation, only touch sections with markers.
Sections with "NO CHANGES" must not have their source files modified.
```

---

## 7. SCOPE-AWARE QUALITY GATES

> **Extends:** Planning Language §8 (Plan-to-Implementation Diffing)

### Enhanced Diff Checks

Planning Language §8 already defines plan-vs-implementation comparison. This extends it with scope-aware validation:

| Marker | Validation Rule | Gate Behavior |
|--------|----------------|---------------|
| `[ADD] N items` | Item count in section increased by N | FAIL if count didn't increase |
| `[ADD]` (no count) | Section has new content not in previous snapshot | WARN if no new content detected |
| `[MODIFY]` | Section content changed but structure preserved | WARN if section structure changed |
| `[FIX]` | Relevant quality check now passes | FAIL if the specific issue persists |
| `[REMOVE]` | Section or item no longer present | WARN if still present |
| `PRESERVED` | Item count did not decrease | FAIL if items removed |
| `NO CHANGES` | Source files for section are unmodified | WARN if files were touched (soft — Ralph might have legitimate reason) |

### How Count Validation Works

For the VIBRANT ENERGY case, the plan says:

```tsx
<Section gumdrop="features" cols={5}>
  {/* TASK-3 [ADD]: 2 nighttime drink flavors */}
  {/* EXISTING 8 flavors PRESERVED */}
</Section>
```

The gate:

1. Reads `task-3-pre` snapshot's FlavorGrid — counts flavor items: **8**
2. Reads current FlavorGrid — counts flavor items
3. If current count < 8 → FAIL: `PRESERVED violation: had 8 flavors, now have {n}`
4. If current count = 8 → FAIL: `ADD marker specified 2 new flavors, count unchanged`
5. If current count = 10 → PASS
6. If current count > 10 → WARN: `Expected 10 flavors (8 + 2), found {n}`

**Count detection is heuristic, not exact.** The gate looks for array literals, `.map()` calls over data arrays, or repeated JSX patterns in the section's source file. It doesn't need to be perfect — it needs to catch "converted 4 instead of adding 2" which is a dramatic count discrepancy.

### The `NO CHANGES` Enforcement

When a section is marked `NO CHANGES`, the gate compares the relevant source file against the pre-task snapshot:

```typescript
// Pseudo-code for the NO CHANGES check
const preTaskContent = await gitReadFileAtTag(filePath, `task-${n}-pre`)
const currentContent = await fs.readFile(filePath, 'utf8')

if (preTaskContent !== currentContent) {
  return {
    severity: 'warn',  // soft — Ralph might have a reason
    message: `${filePath} was modified but plan marks its section as "NO CHANGES for task-${n}"`
  }
}
```

This uses `git.readBlob()` against the pre-task tag — another operation isomorphic-git already supports.

---

## 8. STALL-TRIGGERED RECOVERY

> **Extends:** LLM API 3.2 §13 (Stall Detection Signal)

### Current Stall Detection (from API 3.2)

API 3.2 §13 defines `toolCallSignature` — a deterministic hash of tool calls per response. When consecutive iterations produce identical signatures, a stall counter increments. The client provides the signal; the consumer enforces policy.

### Extended Recovery Path

```typescript
// In loop.ts — consumer of stall signal (extends API 3.2 §13 pattern)

if (consecutiveStalls >= STALL_THRESHOLD) {  // default: 3

  // 1. Snapshot the broken state (for debugging)
  await snapshot.save(`stall-${taskCounter}-recovery`)

  // 2. Determine recovery strategy based on plan markers
  const currentSection = identifyStuckSection(lastToolCalls, planSections)

  // 3. Inject recovery guidance with plan context
  const recoveryPrompt = buildRecoveryPrompt({
    stuckSection: currentSection,
    planMarker: currentSection?.marker,  // [ADD], [MODIFY], [FIX]
    stallCount: consecutiveStalls,
    lastActions: last3ToolCalls,
  })

  // 4. Write recovery guidance to feedback.md
  await fs.writeFile('.ralph/feedback.md',
    `## Stall Recovery (iteration ${iteration})\n\n` +
    `Ralph appears stuck on: ${currentSection?.description}\n` +
    `Plan marker: ${currentSection?.marker}\n\n` +
    recoveryPrompt
  )

  // 5. Reset stall counter
  consecutiveStalls = 0

  // 6. If this is the SECOND stall recovery on the same task:
  if (stallRecoveryCount >= 2) {
    // Roll back to pre-task snapshot and abort
    await snapshot.rollback(`task-${taskCounter}-pre`)
    await fs.writeFile('.ralph/status.txt', 'failed')
    await fs.writeFile('.ralph/feedback.md',
      `Task ${taskCounter} failed after ${stallRecoveryCount} stall recoveries.\n` +
      `Project rolled back to task-${taskCounter}-pre.\n` +
      `Consider simplifying the task or breaking it into smaller requests.`
    )
    // Notify user via callback
    callbacks.onTaskFailed?.({ reason: 'stall', recoveries: stallRecoveryCount })
    return
  }
}
```

### Plan-Aware Recovery Prompts

When the stall detection knows which plan section Ralph is stuck on, the recovery guidance is specific:

```
// For [ADD] stall:
"You appear stuck adding items to the features section. Instead of modifying existing
items, create the 2 new flavor objects and append them to the existing array.
The existing 8 flavors should not be touched."

// For [MODIFY] stall:
"You appear stuck modifying HeroSection copy. Re-read the current content, then
write the entire updated component. Don't try to sed individual lines —
rewrite the section fresh with the new copy."

// For [FIX] stall:
"You appear stuck fixing the theme toggle. Run `preview` to see the current render,
then check index.css for both mood variable sets. The toggle logic is in
ThemeToggle.tsx — verify it toggles the data-theme attribute."
```

This is an extension of API 3.2's stall detection, not a replacement. The API layer computes the signal. This document defines **what to do with it** when plan.tsx provides section-level context.

---

## 9. IMPLEMENTATION PHASES

### Phase 0: Snapshot Command (~3-4 hours)

**Prerequisite:** Toolkit 2.0 Phase 1 (interface + infrastructure). If Toolkit 2.0 hasn't shipped yet, implement as a standard ShellCommand with manual string parsing — upgrade to Zod schema when Toolkit 2.0 lands.

**Deliverables:**
- `src/lib/shell/commands/snapshot.ts` — the command class
- Git operations: save (add + commit + tag), list (tags), rollback (checkout), diff (statusMatrix), status
- Tag naming convention: `task-{n}-pre`, `task-{n}-post`, `manual-{timestamp}`
- `.ralph/task-counter.txt` management

**Test:** Create project → make changes → `snapshot save` → make more changes → `snapshot rollback` → verify restored state. Verify tag listing. Verify diff output format.

### Phase 1: Automatic Task Boundary Snapshots (~2-3 hours)

**Prerequisite:** Phase 0 (snapshot command exists)

**Deliverables:**
- Hook into `useAIChat.ts` (or Ralph loop entry): auto-snapshot before task starts
- Hook into quality gate pass handler: auto-snapshot after gates pass
- `.ralph/task-counter.txt` auto-increment
- `.ralph/task-history.md` append-only log
- State cleanup at task start (clear summary.md, feedback.md, reset status/iteration)

**Test:** Send message → verify pre-task snapshot created → complete task → verify post-task snapshot created. Send second message → verify stale state cleared. Verify task-history.md has entry for previous task.

### Phase 2: Task Parser (~3-4 hours)

**Prerequisite:** Phase 1 (task boundaries exist)

**Deliverables:**
- Task parse function: raw user text + project context → structured task.md
- LLM-assisted parse with structured output (Option A from §5)
- Task type classification: `mutation` | `fresh` | `bugfix` | `needs-clarification`
- Integration point in useAIChat.ts: parse before writing task.md
- Scope markers: `[ADD]`, `[MODIFY]`, `[FIX]`, `[REMOVE]`
- Fallback: if LLM parse fails, write template format (Option B) so Ralph can still execute

**Test:** Feed multi-concern user messages → verify structured output. Test classification: "build me a dashboard" → fresh, "fix the theme toggle" → bugfix, "add 2 more drinks" on existing project → mutation. Test ambiguous input → needs-clarification.

### Phase 3: Plan Mutation Protocol (~3-4 hours)

**Prerequisite:** Planning Language Phases 0-3 (plan.tsx types + validation + Ralph integration exist)

**Deliverables:**
- Plan mutation logic: read existing plan.tsx + structured task.md → updated plan.tsx with change markers
- Change marker format: `{/* TASK-N [ADD|MODIFY|FIX|REMOVE]: description */}`
- `NO CHANGES` and `PRESERVED` annotations for untouched sections
- System prompt addition: plan update instructions for Ralph
- Iteration 0 routing: if mutation task, Ralph does plan update instead of plan create

**Test:** Existing plan.tsx + "add 2 items" task → verify plan has [ADD] marker and existing sections have NO CHANGES. Existing plan.tsx + "fix bug" → verify bugfix skips plan update. No plan.tsx + any task → verify fresh plan creation.

### Phase 4: Scope-Aware Quality Gates (~2-3 hours)

**Prerequisite:** Phase 3 (change markers exist), Planning Language Phase 6 (plan diff exists)

**Deliverables:**
- Count validation: [ADD] N items → verify count increased by N
- PRESERVED validation: item count did not decrease
- NO CHANGES validation: source file unchanged vs pre-task snapshot (uses git readBlob)
- Integration with existing plan-diff gate (extends, doesn't replace)

**Test:** Plan says [ADD] 2 → implementation adds 2 → pass. Plan says [ADD] 2 → implementation converts 4 (count unchanged) → fail. Plan says PRESERVED → items removed → fail. Plan says NO CHANGES → file modified → warn.

### Phase 5: Stall-Triggered Recovery (~1-2 hours)

**Prerequisite:** LLM API 3.2 Phase 5 (stall detection signal), Phase 0 (snapshot command)

**Deliverables:**
- Recovery handler in loop.ts: snapshot on stall → inject recovery guidance → reset counter
- Plan-aware recovery prompts (section-specific guidance)
- Double-stall abort: rollback to pre-task snapshot after 2 failed recoveries
- User notification callback on task failure

**Test:** Simulate stall (mock identical tool signatures) → verify snapshot created → verify recovery prompt in feedback.md. Simulate double stall → verify rollback to pre-task state.

---

## 10. FILE CHANGE INDEX

### New Files

| File | LOC (est.) | Phase | Purpose |
|------|-----------|-------|---------|
| `src/lib/shell/commands/snapshot.ts` | ~180 | 0 | Snapshot shell command (Toolkit 2.0 pattern) |
| `src/lib/task/task-parser.ts` | ~200 | 2 | Structured task decomposition |
| `src/lib/task/task-types.ts` | ~60 | 2 | TaskType, ScopeMarker, StructuredTask types |
| `src/lib/task/plan-mutator.ts` | ~250 | 3 | Plan mutation logic + change marker injection |
| `src/lib/ralph/scope-gates.ts` | ~200 | 4 | Scope-aware quality gate extensions |

**New file total: ~890 LOC across 5 files**

### Modified Files

| File | Phase | Change |
|------|-------|--------|
| `src/lib/shell/executor.ts` | 0 | Register snapshot command |
| `src/hooks/useAIChat.ts` | 1, 2 | Pre-task snapshot hook, state cleanup, task parse integration |
| `src/lib/ralph/loop.ts` | 1, 3, 5 | Task counter, iteration 0 mutation routing, stall recovery handler |
| `src/lib/ralph/gates.ts` | 4 | Import and register scope-aware gates alongside existing plan-diff |
| `src/lib/ralph/system-prompt.ts` | 3 | Add plan update instructions to system prompt |

### New .ralph/ Files

| File | Purpose | Lifecycle |
|------|---------|-----------|
| `.ralph/task-counter.txt` | Monotonic task counter | Incremented each task, committed with snapshots |
| `.ralph/task-history.md` | One-line-per-task history | Append-only, never cleared |

### Files NOT Changed

- `src/lib/git/Git.ts` — used as-is, all needed operations already exist
- `packages/planning/` — plan.tsx types unchanged, mutation is at the consumer level
- Quality gates (existing) — scope gates are additive, not replacements
- Shell commands (existing) — snapshot is a new command, not a modification
- Skills system — unchanged
- ESLint rules — unchanged

---

## 11. CC PROMPT STRATEGY

### Prompt 1: Snapshot Command (Phase 0)

```
Create a new shell command: snapshot

Location: src/lib/shell/commands/snapshot.ts
Register in: src/lib/shell/executor.ts

Read the existing shell command pattern from any command in src/lib/shell/commands/
(e.g., preview.ts or theme.ts) for the interface shape.

Read src/lib/git/Git.ts for available git operations.

The snapshot command wraps git operations with task-aware tagging:
- save: git add all → git commit → git tag (format: task-{n}-pre, task-{n}-post, manual-{ts})
- list: list tags matching task-* or manual-*, show date + message
- rollback: git checkout --force to a tag
- diff: git statusMatrix between HEAD and a tag, format as file-level summary
- status: uncommitted changes count, current tag position, last snapshot time

The tag name comes from .ralph/task-counter.txt (simple integer file).
If no task counter exists, initialize at 1.

Output: ShellCommandResult with stdout/stderr. Keep diff output concise —
file-level changes (added/modified/deleted), not line-level diffs.
Line-level diffs are too verbose for LLM context.

If Toolkit 2.0 Zod schemas are available (check if argsSchema pattern exists on
other commands), use it. If not, use standard string[] args with manual parsing.
```

### Prompt 2: Task Boundary Hooks (Phase 1)

```
Add automatic snapshot hooks to the Ralph task lifecycle.

Read src/hooks/useAIChat.ts for the current message send flow.
Read src/lib/ralph/loop.ts for the loop entry point.

When a new user message arrives (sendMessage or equivalent):
1. If this is NOT the first task on an empty project:
   a. Call snapshot.save() with tag "task-{counter}-pre"
   b. Increment .ralph/task-counter.txt
2. Clear stale state:
   - Write empty string to .ralph/summary.md
   - Write empty string to .ralph/feedback.md
   - Write "running" to .ralph/status.txt
   - Write "0" to .ralph/iteration.txt
3. Append one-line summary of previous task to .ralph/task-history.md
   Format: "- Task {n}: {first line of old summary.md}"

When all quality gates pass (task completes successfully):
1. Call snapshot.save() with tag "task-{counter}-post"

Create .ralph/task-history.md as append-only. Format:
- Task 1: Built VOLT ENERGY landing page with hero, flavor grid, CTA
- Task 2: Redesigned as VIBRANT ENERGY, added store page, new color scheme
- Task 3: Refined ad copy, added 2 nighttime drinks, fixed theme toggle

This gives Ralph continuity context without stale file pollution.
```

### Prompt 3: Task Parser (Phase 2)

```
Create a task parser that structures raw user messages before Ralph sees them.

New files:
- src/lib/task/task-types.ts — types for StructuredTask, TaskType, ScopeMarker
- src/lib/task/task-parser.ts — the parse function

Read src/lib/llm/client.ts for the LLM client interface.
Read .ralph/ directory structure for project context.

The parser takes:
- rawMessage: string (user's natural language)
- projectContext: { planExists: boolean, lastSummary: string, fileList: string[] }

It returns a StructuredTask with:
- type: 'mutation' | 'fresh' | 'bugfix' | 'needs-clarification'
- requirements: Array<{ marker: 'ADD' | 'MODIFY' | 'FIX' | 'REMOVE', description: string }>
- scope: { preserve: string[], affectedFiles: string[] }
- rawMessage: string (original, verbatim)

Implementation: Make a lightweight LLM call using the existing client.
Use the same provider the user has configured (read from settings/config).
The prompt asks the LLM to classify the task type and decompose requirements
into a JSON structure. Use JSON mode or structured output if available,
otherwise parse from the response text.

Fallback: If the LLM call fails (network error, timeout, etc.), write a
template task.md with the raw text and let Ralph decompose it during
iteration 0. Never block task execution on a parse failure.

Integration: Call the parser in useAIChat.ts after the pre-task snapshot
but before writing task.md. Write the structured output to .ralph/task.md
in the markdown format shown in the spec.

Task type classification rules:
- fresh: no plan.tsx exists, OR message contains "build me", "create", "start over"
- bugfix: message describes specific broken behavior, short, no structural changes
- mutation: plan.tsx exists AND message references existing features
- needs-clarification: ambiguous scope (can't determine ADD vs MODIFY)

For needs-clarification: do not start the Ralph loop. Instead, return
a clarification request to the user via the chat UI. This is a conversation
turn, not a task execution.
```

### Prompt 4: Plan Mutation (Phase 3)

```
Add plan mutation support to the Ralph loop's iteration 0.

New file: src/lib/task/plan-mutator.ts
Modified: src/lib/ralph/loop.ts, src/lib/ralph/system-prompt.ts

Read the Planning Language spec's §6 for the current iteration 0 workflow.
Read packages/planning/ for plan.tsx types (if they exist yet).
Read src/lib/ralph/loop.ts for the current iteration 0 implementation.

Currently, iteration 0 always creates a new plan.tsx. After this change:

IF task.type === 'fresh':
  → existing behavior (create plan.tsx from scratch)

IF task.type === 'mutation':
  → Ralph reads existing plan.tsx + structured task.md
  → Ralph writes UPDATED plan.tsx with change markers
  → Change markers are JSX comments: {/* TASK-N [ADD|MODIFY|FIX]: desc */}
  → Sections not in task.md get: {/* NO CHANGES for task-N */}
  → Items marked PRESERVE in scope get: {/* PRESERVED — do not remove */}

IF task.type === 'bugfix':
  → Skip iteration 0 entirely, go to iteration 1
  → Ralph reads task.md and existing plan.tsx as context, but doesn't modify plan

The plan-mutator.ts file provides:
- parsePlanSections(planTsx: string): extract Screen/Section names from plan
- findAffectedSections(plan: PlanSections, task: StructuredTask): map requirements to sections
- This is used by the system prompt to guide Ralph, not to auto-modify the plan
  (Ralph still writes the updated plan.tsx — the mutator provides context)

Add to system prompt (system-prompt.ts):
When task.md has Type: mutation, you are UPDATING the existing plan.
Read plan.tsx. For each requirement, add a change marker comment to
the relevant section. Mark untouched sections as NO CHANGES.
Items in the Scope > PRESERVE list must have PRESERVED markers.
```

### Prompt 5: Scope-Aware Gates (Phase 4)

```
Extend the plan-diff quality gate with scope-aware validation.

New file: src/lib/ralph/scope-gates.ts
Modified: src/lib/ralph/gates.ts

Read the existing gates.ts for the QualityGate interface.
Read the existing plan-diff gate (from Planning Language Phase 6, if implemented).
Read src/lib/git/Git.ts for git.readBlob() (reading files at a specific tag).

New gate: scope-validation
Runs AFTER the plan-diff gate. Only runs if change markers exist in plan.tsx.

Checks:
1. [ADD] markers: read the relevant source file, count array items / JSX elements.
   Compare to the same file at task-{n}-pre tag. Count should have increased.
   Detection: look for array literals (.map calls, repeated JSX patterns).
   This is heuristic — flag obvious discrepancies (count decreased or unchanged),
   don't try to be exact.

2. PRESERVED markers: same count comparison, but verify count did NOT decrease.
   Failure: "PRESERVED violation: {section} had {n} items, now has {m}"

3. NO CHANGES markers: compare file content at HEAD vs task-{n}-pre tag.
   If different, warn (not fail): "{file} modified but plan says NO CHANGES"

Register in gates.ts alongside existing gates. This is additive — it doesn't
replace any existing gate. It runs after plan-diff and before the final
gate in the pipeline.

Gate result format: match existing QualityGate interface.
Soft failures (warnings) go to feedback.md but don't block completion.
Hard failures (PRESERVED violation, ADD count wrong) block completion.
```

---

## 12. RELATIONSHIP TO COMPANION PLANS

### Planning Language

| This Document | Planning Language | Interaction |
|--------------|-------------------|-------------|
| Task parser (§5) | §6 The Ralph Workflow | Pre-iteration-0 step. Produces structured input for §6's planning phase |
| Plan mutation (§6) | §6 When Ralph Writes/Receives a Plan | Third path: "When Ralph Updates a Plan" |
| Change markers | §8 Plan-to-Implementation Diffing | Markers enable scope-aware diff checks |
| Scope gates (§7) | §7 Plan Validation + §8 Diffing | Additive gates alongside existing plan-valid and plan-diff |
| State cleanup | §5 How It Replaces Current Artifacts | Defines lifecycle for the .ralph/ files §5 documents |
| task-history.md | §5 .ralph/ directory | New append-only file alongside existing artifacts |

**Key change to Planning Language:** §6 needs a third workflow ("Ralph updates an existing plan"). §8 needs scope-aware diff checks. §5 needs state cleanup protocol at task boundaries. All additive — nothing in the current spec changes.

### Toolkit 2.0

| This Document | Toolkit 2.0 | Interaction |
|--------------|-------------|-------------|
| `snapshot` command | §9 Which Commands Get Promoted | New promoted command, same pattern as preview/grep/theme |
| Zod schema for snapshot args | §3 The ShellCommand Interface Change | Uses the same argsSchema + parseCliArgs pattern |
| Discrete `snapshot` tool | §5 The Adapter: toolFromCommand() | Auto-generates tool entry in LLM tool list |

**Key change to Toolkit 2.0:** Add `snapshot` to the promoted commands list in §9. It follows the exact same pattern — no architectural changes.

### LLM API 3.2

| This Document | LLM API 3.2 | Interaction |
|--------------|-------------|-------------|
| Stall recovery (§8) | §13 Stall Detection Signal | Extends the consumer-side pattern with snapshot + plan-aware recovery |
| Task parse LLM call | §1 Current client | Uses existing `chat()` for lightweight structured extraction |
| Context for recovery prompts | §13 Context Awareness | Recovery prompts reference plan sections for targeted guidance |

**Key change to LLM API 3.2:** §13's stall detection consumer pattern gains a snapshot-before-recovery step and plan-section-aware recovery prompts. ~10 lines added to the pattern example.

### ESLint Integration

| This Document | ESLint | Interaction |
|--------------|--------|-------------|
| State cleanup | ESLint lint history | Lint history may reference previous task — cleared at task boundary |
| Snapshots | Lint results | Lint state captured in snapshots, restored on rollback |

**Key change to ESLint:** None. ESLint rules operate at the source level, independent of task lifecycle. Lint history clearing at task boundaries is handled by this document's state cleanup, not by ESLint itself.

### ZenFS Migration

| This Document | ZenFS | Interaction |
|--------------|-------|-------------|
| Git operations | Filesystem layer | Snapshot commands use isomorphic-git which talks to the filesystem |
| Rollback performance | OPFS backend | ZenFS OPFS backend makes git checkout faster (3-4x I/O improvement) |

**Key change to ZenFS plan:** None. The snapshot system works with both LightningFS and ZenFS — it talks to `src/lib/git/Git.ts` which talks to `JSRuntimeFS` which abstracts the backend.

---

## WHAT DOES NOT CHANGE

- **Ralph loop mechanics** — fresh context per iteration, one action per iteration, discriminated unions. The snapshot system wraps the loop, not replaces it.
- **@wiggum/stack** — components unchanged
- **Gumdrops / Skills** — unchanged
- **Theme generator** — unchanged
- **Existing quality gates** — scope gates are additive
- **Existing shell commands** — snapshot is new, not a replacement
- **esbuild-wasm** — unchanged
- **LightningFS / ZenFS** — filesystem layer unchanged (snapshot uses git layer above it)
- **Chief architecture** — unchanged (Chief writes plan.tsx via its own tools; task lifecycle is Ralph-side)
- **plan.tsx format** — the JSX components and types are unchanged. Change markers are JSX comments, which are already valid in the format.

---

## SUCCESS METRICS

| Metric | Target |
|--------|--------|
| Pre-task snapshot time | <500ms (git add + commit + tag) |
| Task parse time | <2s (includes lightweight LLM call) |
| Rollback time | <1s (git checkout to tag) |
| Multi-concern task decomposition accuracy | >80% correct scope markers |
| "Converted instead of added" prevention | 100% caught by scope gates |
| Stale state pollution (reading old summary/feedback) | 0% — cleared at task start |
| Rollback usage by users | Measured — expect ~15% of tasks trigger rollback |
| Task history continuity | Ralph references previous tasks appropriately via task-history.md |
| Plan mutation vs. fresh build classification | >90% correct (mutation when plan exists + references it) |

---

## APPENDIX: CLEAN ROOM NOTES

This document describes **architectural patterns and concepts only**. No code has been copied from any licensed project.

**Git-based snapshots** are a standard version control pattern. The concept of tagging commits as task boundaries, using checkout for rollback, and statusMatrix for diffing are standard isomorphic-git operations documented in its public API.

**Structured task decomposition** (raw text → checklist) is a common LLM application pattern. The specific scope markers (ADD/MODIFY/FIX/REMOVE) are domain conventions, not copied from any source.

**Plan mutation via JSX comments** is original to Wiggum — using JSX comments as change markers within an existing typed plan format is a novel integration of the Planning Language's JSX-as-contract approach.

Key references for CC:
- Wiggum's existing Git wrapper → `src/lib/git/Git.ts` (read for available operations)
- Wiggum's existing shell commands → `src/lib/shell/commands/` (read for interface pattern)
- Wiggum's existing loop → `src/lib/ralph/loop.ts` (read for iteration structure)
- Wiggum's existing hook → `src/hooks/useAIChat.ts` (read for message send flow)
- Wiggum's existing gates → `src/lib/ralph/gates.ts` (read for gate interface)
- isomorphic-git API → https://isomorphic-git.org/docs/en/add (public documentation)
