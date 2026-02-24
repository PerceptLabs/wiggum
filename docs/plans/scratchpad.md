# Wiggum Roadmap Scratchpad

> Living state tracker. Claude reads this before any roadmap work.
> Last updated: 2026-02-22

---

## CURRENT POSITION

Completed through **Step 3.2** (Planning Ph 4 — plan-writer.ts, theme→plan.tsx integration).

---

## SHIPPED (Pre-stage through 3.2)

| Step | What | Status |
|------|------|--------|
| 0.1 | Loop ergonomics (gate retries, data URI, 2>/dev/null, build cmd, replace errors, snapshot docs) | ✅ |
| 0.2 | Skills tightening (dead skills, OKLCH refs, 12 moods, tokens/smart-merge, consolidate location) | ✅ |
| 1.1 | Toolkit Ph 0 — Zod dependency | ✅ |
| 1.2 | Toolkit Ph 1 — ShellCommand interface, argsSchema, tool-adapter.ts, tool-builder.ts, structured-errors.ts, executor schema branch, loop dispatch routing | ✅ |
| 1.3 | Lifecycle Ph 0 — snapshot.ts shell command (save/list/rollback/diff/status) with full argsSchema | ✅ |
| 1.4 | Lifecycle Ph 1 — Automatic task boundary snapshots, state cleanup, task-history.md | ✅ |
| 2.1 | Planning Ph 0 — Type foundation (packages/planning with core types) | ✅ |
| 2.2 | Planning Ph 1 — Type auto-generation from source registries | ✅ |
| 2.3 | Planning Ph 2 — Plan validation gate (plan-valid) | ✅ |
| 2.4 | Planning Ph 3 — Ralph integration (iteration 0 = planning phase) | ✅ |
| 3.2 | Planning Ph 4 — Theme command integration (plan-writer.ts, theme→plan.tsx) | ✅ |

---

## GAPS (within shipped range)

| Step | What | Why Skipped | Spec | CC Prompt Sections |
|------|------|-------------|------|--------------------|
| 3.1 | Toolkit Ph 2 — Promote grep, replace, theme, preview | Deferred during original sequencing | toolkit-2_0.md §9, §11 Ph 2, §13 | Pattern ref: snapshot.ts |
| 2.5 | Lifecycle Ph 2 — Task parser (raw text → structured task.md) | Deferred (depends on 1.4) | wiggum-task-lifecycle.md §5, §9, §11 Prompt 3 | — |
| 2.6 | Lifecycle Ph 3 — Plan mutation protocol (update path for existing plans) | Deferred (depends on 2.4 + 2.5) | wiggum-task-lifecycle.md §6, §9, §11 Prompt 4 | — |

**Next CC session covers all 3 gaps.**

---

## INFRA STATUS (what already exists)

### Toolkit Ph 1 (fully built)
- `src/lib/shell/tool-adapter.ts` — toolFromCommand(), buildToolDescription()
- `src/lib/ralph/tool-builder.ts` — buildRalphTools(), buildShellDescription()
- `src/lib/shell/structured-errors.ts` — structuredError() for Zod validation failures
- `src/lib/shell/executor.ts` — schema validation branch (argsSchema → parseCliArgs → safeParse → execute)
- `src/lib/ralph/loop.ts` — dispatch routes by tool name (shell path + discrete tool path + unknown)
- `src/lib/shell/commands/snapshot.ts` — first dual-mode command, reference pattern for Ph 2 promotions

### Commands NOT yet promoted (still string[] args)
- grep.ts, replace.ts, theme.ts, preview.ts — all need argsSchema + parseCliArgs + examples

### Planning (Ph 0–4 done)
- packages/planning/ — core types, auto-generation
- Plan validation gate operational
- Ralph iteration-0 planning phase wired
- plan-writer.ts + theme→plan.tsx integration shipped

### Lifecycle (Ph 0–1 done)
- snapshot.ts command with full Toolkit 2.0 pattern
- Automatic pre/post task snapshots
- State cleanup at task boundaries
- task-history.md append-only log
- Task parser (Ph 2) and plan mutation (Ph 3) NOT yet built

---

## WHAT COMES AFTER THE GAPS

Once 3.1 + 2.5-2.6 ship, the next unbuilt steps from the roadmap are:

| Step | What | Dependencies |
|------|------|-------------|
| 3.3 | Planning Ph 5 — Chief integration (write_plan outputs plan.tsx) | 2.4 ✅ |
| 3.4 | Planning Ph 6 — Plan-to-implementation diffing (plan-diff gate) | 2.4 ✅ |
| 3.5 | Lifecycle Ph 4 — Scope-aware quality gates (ADD/PRESERVE validation) | 3.4, 1.4 ✅ |
| 3.6 | Toolkit Ph 3 — Remaining promotions (write, build, git, find, sed) | 3.1 |
| 4.x | Stage 4 — ESLint + API tracks (can run in parallel) | Various |

---

## IDEAS (not scoped yet)

### Randomized few-shot sampling
Instead of fixed examples in system prompts, maintain a bank of examples and randomly sample a subset per call. Prevents the LLM from pattern-matching against the same fixed examples every time. Inspired by Quiplash game prompt rotation pattern.

**Immediate fit:** Task parser — build 30-40 example classifications (user message → StructuredTask JSON), sample 8-10 per call. Gets consistent structure without overfitting.

**Bigger fit:** Ralph's BASE_SYSTEM_PROMPT — the fixed examples of command usage and iteration structure contribute to samey output across projects. A bank of varied "good iteration" examples, randomly sampled, could push toward more diverse approaches.

**When:** LLM API 3.2 or a dedicated prompt engineering pass. Not this CC run.

---

## NOTES

- 362 tests at last count (commit bcc53ea)
- Toolkit Ph 2 promotes exactly 4 commands: grep, replace, theme, preview. NOT build/find/git (those are Ph 3)
- Lifecycle Ph 4-5 have later dependencies (Planning Ph 6, API Ph 5) — do not build yet
- snapshot.ts is the canonical reference for the dual-mode pattern any new promotion should follow
