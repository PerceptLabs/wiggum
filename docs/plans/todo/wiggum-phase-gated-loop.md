# Phase-Gated Loop — Harness-Controlled Plan → Build Separation

*Created: 2026-02-24 · Priority: P0 — regression fix*

---

## The Problem

Ralph can satisfy every quality gate without implementing anything:

1. Write plan.tsx → `plan-valid` passes
2. Apply theme preset → `css-theme-complete` passes
3. Write summary.md → `has-summary` passes
4. Scaffold App.tsx passes `app-has-content` (has stack imports + JSX components)
5. Scaffold passes `build-succeeds`
6. Mark complete → all gates pass → loop ends

This happened in production after Stage 3. The system prompt says "write plan.tsx, then mark complete so the harness can validate it" — Ralph does exactly that and never reaches the build step. The `app-has-content` gate's scaffold detection (`includes('Edit src/App.tsx to get started')`) should catch this, but it's a string heuristic — fragile by nature.

Additionally, `addAll()` in Git.ts crashes when `statusMatrix()` returns entries with undefined filepaths, breaking snapshots and disabling the scope gate's git comparison.

## The Fix

Split the loop into two harness-controlled phases. Ralph doesn't control phase transitions — the harness does.

```
PLAN phase:
  Ralph researches, writes .ralph/plan.tsx
  Harness detects plan.tsx content at iteration top, validates inline
  If invalid → feedback.md, stay in PLAN
  If valid → harness flips to BUILD, writes feedback
  "complete" in status.txt is IGNORED during PLAN phase (only when plan.tsx has content)
  Non-plan tasks (no plan.tsx) pass straight through to gates

BUILD phase:
  Ralph implements sections, applies theme, writes src/ files
  Ralph marks complete → full quality gates run
  plan-diff gate checks: did src/ change to match the plan?
```

### Why This Works

- **No new iteration cost for well-behaved runs.** Ralph writes plan.tsx in iteration 1-2. The harness validates it at the top of the next iteration. Phase flips to BUILD. Ralph reads "Plan validated, now implement" in feedback.md and starts building — which is the iteration where it would have started building anyway.

- **Catches the degenerate case.** If Ralph writes plan.tsx and marks complete in the same batch, the harness sees phase=PLAN + plan.tsx has content → ignores the complete signal, validates the plan at next iteration top, flips to BUILD, resets status to running. Ralph continues.

- **Non-plan tasks work unchanged.** Bug fixes, refactors, and tasks that never write plan.tsx: phase defaults to 'plan', but the gate guards check for plan.tsx content. No content → gates run normally. The phase system is inert.

- **Eliminates scaffold heuristics as the only defense.** Scaffold string detection stays as defense-in-depth, but the structural guarantee is that BUILD phase can't be entered without plan validation (for plan tasks) or explicit pass-through (for non-plan tasks).

---

## Implementation

### File 1: state.ts — Add phase to RalphState

Add `phase` to the state interface, FILES map, and init:

```typescript
// In RalphState interface, add:
phase: 'plan' | 'build'

// In FILES object, add:
phase: `${RALPH_DIR}/phase.txt`,

// In initRalphDir — after the line that writes status.txt:
await fs.writeFile(path.join(cwd, FILES.phase), 'plan')

// In getRalphState return object, add:
phase: (await readFile(fs, path.join(cwd, FILES.phase), 'plan')) as 'plan' | 'build',
```

Add two new exported helpers:

```typescript
export async function getPhase(fs: JSRuntimeFS, cwd: string): Promise<'plan' | 'build'> {
  const raw = await readFile(fs, path.join(cwd, FILES.phase), 'plan')
  return raw === 'build' ? 'build' : 'plan'
}

export async function setPhase(fs: JSRuntimeFS, cwd: string, phase: 'plan' | 'build'): Promise<void> {
  await fs.writeFile(path.join(cwd, FILES.phase), phase)
}
```

### File 2: loop.ts — Phase-aware iteration logic

**2-IMPORTS. Add these new imports at the top of loop.ts:**

```typescript
import { parsePlanTsx } from '../build/plan-parser'
import { validatePlan } from '@wiggum/planning/validate'
```

And update the state import to include the new helpers:

```typescript
import { initRalphDir, getRalphState, isComplete, isWaiting, setIteration, getPhase, setPhase } from './state'
```

**2a. After `getRalphState()` at the top of the iteration `for` loop, add the plan validation block:**

Insert this AFTER `await setIteration(fs, cwd, iteration)` and BEFORE the `const planSection = ...` line:

```typescript
// --- PLAN PHASE: validate plan.tsx inline if present ---
const phase = state.phase === 'build' ? 'build' : 'plan'

if (phase === 'plan') {
  const planContent = state.planTsx
  if (planContent && planContent.trim().length > 0) {
    // Plan exists — validate it
    const { root, errors } = await parsePlanTsx(planContent)
    if (errors.length > 0) {
      await fs.writeFile(`${cwd}/.ralph/feedback.md`,
        `# Plan Validation\n\nplan.tsx has syntax errors:\n${errors.join('\n')}\n\nFix the plan and try again.`)
      await fs.writeFile(`${cwd}/.ralph/status.txt`, 'running')
    } else {
      const result = validatePlan(root)
      if (result.failures.length > 0) {
        const lines = result.failures.map(f => `FAIL [${f.id}]: ${f.message}`)
        if (result.warnings.length > 0) {
          lines.push('', ...result.warnings.map(w => `WARN [${w.id}]: ${w.message}`))
        }
        await fs.writeFile(`${cwd}/.ralph/feedback.md`,
          `# Plan Validation\n\n${lines.join('\n')}\n\nFix the issues and write the plan again.`)
        await fs.writeFile(`${cwd}/.ralph/status.txt`, 'running')
      } else {
        // Plan is valid — transition to BUILD
        await setPhase(fs, cwd, 'build')
        const warnings = result.warnings.length > 0
          ? '\n\nWarnings:\n' + result.warnings.map(w => `WARN [${w.id}]: ${w.message}`).join('\n')
          : ''
        await fs.writeFile(`${cwd}/.ralph/feedback.md`,
          `# Plan Validated ✓\n\nYour plan is structurally valid. Now implement it.${warnings}\n\nFor each Section in plan.tsx, run \`grep skill "<gumdrop-name>"\` to load its recipe, then implement following the recipe's component list and layout. One file per section.\n\nApply a theme with \`theme preset <n> --apply\` or \`theme generate ...\`.\n\nWrite .ralph/summary.md when done, then mark status complete.`)
        await fs.writeFile(`${cwd}/.ralph/status.txt`, 'running')
        callbacks?.onStatus?.('Plan validated — transitioning to build phase')
      }
    }

    // Re-read state since we may have changed feedback/status/phase
    const refreshedState = await getRalphState(fs, cwd)
    Object.assign(state, refreshedState)
  }
  // If no plan.tsx content, do nothing — non-plan tasks pass through naturally
}
```

**2b. Phase guard on ALL THREE gate-running sites.**

There are three places in loop.ts where gates run. They are NOT all `isComplete()` checks:

1. **Post-batch** (after `break toolLoop`) — `if (await isComplete(fs, cwd))`
2. **completedWithoutTools** — `if (completedWithoutTools)` — THIS IS NOT AN `isComplete()` CHECK
3. **End-of-iteration** — `if (await isComplete(fs, cwd))`

All three need the SAME phase guard. The guard must handle non-plan tasks correctly — if there's no plan.tsx content, gates run normally even during PLAN phase:

```typescript
// Helper function — add near handleGateResult or inline
async function shouldRunGates(fs: JSRuntimeFS, cwd: string): Promise<boolean> {
  const currentPhase = await getPhase(fs, cwd)
  if (currentPhase === 'build') return true

  // PLAN phase — only block gates if there's actually a plan to validate
  try {
    const planContent = await fs.readFile(`${cwd}/.ralph/plan.tsx`, { encoding: 'utf8' }) as string
    if (planContent && planContent.trim().length > 0) {
      // Plan exists but hasn't been validated yet (still in PLAN phase)
      // Swallow the complete signal — plan validation happens at iteration top
      await fs.writeFile(`${cwd}/.ralph/status.txt`, 'running')
      return false
    }
  } catch {
    // No plan.tsx file — non-plan task, gates should run
  }

  return true  // No plan content → run gates normally
}
```

Then wrap each of the three gate-running blocks:

**Site 1 — Post-batch** (the `if (await isComplete(fs, cwd))` after `break toolLoop`):
```typescript
if (await isComplete(fs, cwd)) {
  if (await shouldRunGates(fs, cwd)) {
    console.log('[Ralph] Complete after tool batch - running quality gates')
    const gateResults = await runQualityGates(fs, cwd, gateContext)
    // ... existing handleGateResult logic unchanged
  } else {
    callbacks?.onStatus?.('Plan phase — complete signal deferred, validating plan next iteration')
  }
}
```

**Site 2 — completedWithoutTools** (the `if (completedWithoutTools)` block):
```typescript
if (completedWithoutTools) {
  if (await shouldRunGates(fs, cwd)) {
    console.log('[Ralph] Completed without tools - running quality gates')
    const gateResults = await runQualityGates(fs, cwd, gateContext)
    // ... existing handleGateResult logic unchanged
  } else {
    callbacks?.onStatus?.('Plan phase — completion deferred, validating plan next iteration')
  }
}
```

**Site 3 — End-of-iteration** (the final `if (await isComplete(fs, cwd))`):
```typescript
if (await isComplete(fs, cwd)) {
  if (await shouldRunGates(fs, cwd)) {
    console.log('[Ralph] Status is complete - running quality gates')
    const gateResults = await runQualityGates(fs, cwd, gateContext)
    // ... existing handleGateResult logic unchanged
  } else {
    callbacks?.onStatus?.('Plan phase — complete signal deferred, validating plan next iteration')
  }
}
```

**CRITICAL: Do NOT change the existing gate handling inside each block.** The `handleGateResult` calls, success/abort/retry logic, and `handleTaskSuccess` calls all stay exactly as they are. The phase guard wraps the OUTSIDE of each block only.

**2c. System prompt update in BASE_SYSTEM_PROMPT.**

Find this text in the workflow section (step 3):
```
3. **Plan**: Write .ralph/plan.tsx — your structured plan with theme, screens, and sections. Then mark complete so the harness can validate it.
   Fix any validation feedback before implementing.
```

Replace with:
```
3. **Plan**: Write .ralph/plan.tsx — your structured plan with theme, screens, and sections.
   The harness validates it automatically between iterations. If valid, you'll see "Plan Validated" in feedback.md — then proceed to build.
   If invalid, fix the issues noted in feedback.md and write the plan again.
```

Also find this sentence near the top of the "Your Workspace" section:
```
- .ralph/plan.tsx — Your structured plan. Write this FIRST for new projects using the planning component API (`grep skill "planning"` for full reference). The harness validates it automatically.
```
This is fine as-is — it already says "harness validates automatically" without mentioning "mark complete."

### File 3: Git.ts — Fix addAll() undefined filepath guard

In the `addAll()` method, add a guard for undefined filepaths from LightningFS `statusMatrix()`:

```typescript
async addAll(): Promise<void> {
  const statusMatrix = await this.statusMatrix()
  for (const [filepath, head, workdir, stage] of statusMatrix) {
    if (!filepath) continue  // Guard against undefined paths from LightningFS
    if (workdir !== stage || head !== stage) {
      if (workdir === 0) {
        await git.remove({ fs: this.rawFs, dir: this.dir, filepath })
      } else {
        await this.add(filepath)
      }
    }
  }
}
```

### File 4: gates.ts — Remove plan-valid gate from QUALITY_GATES array

Plan validation now happens inline during the PLAN phase in loop.ts. The `plan-valid` gate in the QUALITY_GATES array is redundant and should be removed.

**Remove** the entire `plan-valid` object from the QUALITY_GATES array (the one with `name: 'plan-valid'`).

**Keep** the `plan-diff` gate — it's informational and runs during BUILD phase to compare plan vs implementation.

**Keep** the `app-has-content` gate as-is — scaffold detection stays as defense-in-depth. Optionally update its feedback message to reference the plan:

```typescript
// In app-has-content gate, update the scaffold detection message:
feedback: 'src/App.tsx is still the default scaffold. Implement the sections from your plan.',
```

**Keep** the `getExplicitFix('plan-valid')` case in `getExplicitFix()` — it's dead code now but harmless. CC can remove it if desired.

### Tests

**state.test.ts additions:**
- `getPhase()` returns 'plan' by default when phase.txt doesn't exist
- `setPhase('build')` writes and `getPhase()` reads 'build' correctly
- `initRalphDir()` creates phase.txt with value 'plan'
- `getRalphState()` includes phase field

**loop integration test additions:**
- PLAN phase + plan.tsx has content + Ralph marks complete → complete signal is swallowed, loop continues
- PLAN phase + valid plan.tsx → harness writes "Plan Validated" to feedback.md, phase transitions to BUILD
- PLAN phase + invalid plan.tsx → harness writes failures to feedback.md, phase stays PLAN
- BUILD phase + Ralph marks complete → quality gates run normally
- PLAN phase + NO plan.tsx content + Ralph marks complete → gates run normally (non-plan task pass-through)
- completedWithoutTools during PLAN phase + plan.tsx exists → deferred, not treated as completion

**Git.ts test:**
- `addAll()` skips entries where filepath is undefined/falsy without crashing

---

## What This Does NOT Change

- Quality gates (except removing plan-valid from array)
- `handleGateResult` function — signature and logic unchanged
- `handleTaskSuccess` function — unchanged
- Scope gates (3.5) — still run during BUILD phase
- Reflection capture — still runs on success
- Task lifecycle (snapshots) — snapshot crash fixed separately via addAll() guard
- Tool routing (shell path, discrete tool path) — unchanged
- Tool promotion (3.6) — untouched
- Escalation text — unchanged
- `containsCommandPatterns` / TOOL_CALLING_FEEDBACK — unchanged
- `plan-diff` gate — still runs during BUILD, still informational
- `plan-mutator` — unchanged

## Migration

For existing projects with `.ralph/phase.txt` missing, `getPhase()` defaults to `'plan'`. If plan.tsx already exists and is valid, the first iteration validates it and flips to BUILD immediately. No migration needed.

For non-plan tasks (bug fixes, refactors without plan.tsx), the PLAN phase check at iteration top sees no plan.tsx content and does nothing. The gate guards see no plan.tsx content and let gates run normally. The phase system is completely inert for these tasks.

## Scenarios Traced

| Scenario | Phase | plan.tsx | Complete signal | Result |
|----------|-------|----------|-----------------|--------|
| New UI task, iteration 1 | plan | empty | — | Ralph researches + writes plan.tsx |
| New UI task, iteration 2 | plan→build | valid | — | Harness validates, flips to BUILD |
| Degenerate: plan + complete in same batch | plan | valid | swallowed | Harness validates at next iteration top, flips to BUILD |
| Build done | build | valid | honored | Full quality gates run |
| Bug fix (no plan) | plan | empty | honored | shouldRunGates returns true, gates run |
| Refactor (no plan) | plan | empty | honored | shouldRunGates returns true, gates run |
| completedWithoutTools during plan | plan | has content | deferred | shouldRunGates returns false |
| completedWithoutTools, no plan | plan | empty | honored | shouldRunGates returns true, gates run |
