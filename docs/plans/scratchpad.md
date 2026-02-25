# Wiggum Roadmap Scratchpad

> Living state tracker. Claude reads this before any roadmap work.
> Last updated: 2026-02-25

---

## CURRENT POSITION

Completed through **Step 3.5** (Scope-aware quality gates). Phase-gated loop shipped as P0 hotfix. Harness plan context resolution is next.

---

## SHIPPED (Pre-stage through current)

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
| 3.4 | Planning Ph 6 — Plan-to-implementation diffing (plan-diff gate) | ✅ |
| 3.5 | Lifecycle Ph 4 — Scope-aware quality gates (ADD/PRESERVE validation) | ✅ |

### Stage 3 Sessions (post-scratchpad-last-update)

| Session | Commit | What |
|---------|--------|------|
| A (da75ac5) | 4 fixes | Snapshot crash fix (git.add→addAll), grep no-input-files help, validate levenshtein suggestions, theming dynamic colors |
| B (8e69229) | +6 tests | Replace line-mode (--line N), 6 new tests |
| C (db33e94) | +17 tests | sed promotion (SedSubstituteSchema, SedLineSchema, additionalTools), find promotion (FindSchema, additionalTools), system prompt step 5 update, 17 new tests |
| P0 hotfix (477 tests) | Phase-gated loop | PLAN/BUILD phase separation, shouldRunGates(), plan-valid gate moved to loop, addAll() undefined guard, 8 new tests |

---

## PARTIAL (work started but not complete)

| Step | What | Done | Remaining |
|------|------|------|-----------|
| 3.1 | Toolkit Ph 2 — Promote grep, replace, theme, preview | grep (additionalTools: grep + search), replace (argsSchema), preview (argsSchema), sed (additionalTools: sed + sed_line), find (additionalTools: find) | **theme** — has ThemeArgsSchema as discriminated union (models can't fill), needs flat additionalTools (theme_preset, theme_generate, theme_modify, theme_list, theme_extend) |
| 3.6 | Toolkit Ph 3 — Remaining promotions | sed, find (done in Session C) | **write, build, git** — need argsSchema + parseCliArgs + examples |

---

## GAPS (within shipped range)

| Step | What | Why Skipped | Spec |
|------|------|-------------|------|
| 2.5 | Lifecycle Ph 2 — Task parser (raw text → structured task.md) | Deferred during original sequencing | wiggum-task-lifecycle.md §5, §9, §11 Prompt 3 |
| 2.6 | Lifecycle Ph 3 — Plan mutation protocol (update path for existing plans) | Deferred (depends on 2.4 + 2.5) | wiggum-task-lifecycle.md §6, §9, §11 Prompt 4 |
| 3.3 | Planning Ph 5 — Chief integration (write_plan outputs plan.tsx) | Not built | — |

---

## IMMEDIATE QUEUE

### Next: Harness Plan Context Resolution
**Spec:** `docs/plans/todo/wiggum-harness-plan-context.md`

Extends the PLAN→BUILD transition to:
- Apply theme from `<Theme>` block via shell.execute
- Load gumdrop recipes by exact skill ID for each `<Section>`
- Write feedback.md with theme confirmation + all recipes pre-loaded
- Ralph enters BUILD with zero discovery needed

Foundation for registry (Stage 4) and skill graph. Abstraction boundary: `resolvePlanContext()` — today direct lookup, tomorrow registry query, later graph traversal.

### Then: Theme promotion (closes 3.1)
Flat additionalTools for theme subcommands. Lower priority now that harness applies theme, but still useful for `theme modify` and `theme list` during plan authoring.

### Then: Cleanup
- Delete plan.md from state (dead — plan.tsx replaces)
- Delete intent.md from state (dead — plan.tsx App description replaces)
- Delete RalphContext.tsx (confirmed dead code)
- Audit TODO/FIXME comments

---

## WHAT COMES AFTER

| Step | What | Dependencies |
|------|------|-------------|
| 2.5 | Task parser (raw text → structured task.md) | 1.4 ✅ |
| 2.6 | Plan mutation (update path for existing plans) | 2.4 ✅, 2.5 |
| 3.3 | Chief integration (write_plan outputs plan.tsx) | 2.4 ✅ |
| 3.6 | Toolkit Ph 3 — write, build, git promotions | 3.1 |
| 4.x | Stage 4 — Registries, ESLint, API tracks | Various |

---

## INFRA STATUS

### Toolkit (Ph 1 fully built, Ph 2 mostly done)
- `tool-adapter.ts`, `tool-builder.ts`, `structured-errors.ts` — complete
- Promoted commands: snapshot, replace, preview, grep, search, sed, sed_line, find
- NOT promoted: theme (discriminated union), write, build, git

### Planning (Ph 0–6 done)
- packages/planning/ — core types, auto-generation, validation
- plan-valid gate moved from gates.ts → loop.ts phase handler
- plan-diff gate operational in gates.ts
- plan-writer.ts + theme→plan.tsx integration shipped

### Lifecycle (Ph 0–1 done, Ph 4 done)
- Automatic pre/post task snapshots
- Scope-aware quality gates (ADD/PRESERVE)
- Task parser (Ph 2) and plan mutation (Ph 3) NOT yet built

### Phase System (NEW)
- `.ralph/phase.txt` — 'plan' | 'build'
- PLAN phase: harness validates plan.tsx inline, swallows complete signal
- BUILD phase: quality gates run on completion
- Non-plan tasks pass through (phase system is inert)

### Test Count
- 477 tests (as of phase-gated loop commit)

---

## IDEAS (not scoped yet)

### Randomized few-shot sampling
Bank of examples, randomly sampled per LLM call. Prevents pattern-matching against fixed examples. Immediate fit: task parser. Bigger fit: BASE_SYSTEM_PROMPT iteration examples.

### "npm for images" 
Hugging Face datasets for reliable image assets, replacing unreliable Unsplash URLs.

---

## NOTES

- CC kickoffs use explicit paths (docs/plans/todo/filename.md), never bare filenames
- CC kickoffs are NOT implementation plans — keep short, point to spec docs
- Don't estimate hours/time for tasks
- Scratchpad is consulted before roadmap work. CC kickoffs do NOT reference scratchpad.
- Anti-shortcut rule: check what exists before suggesting an approach
