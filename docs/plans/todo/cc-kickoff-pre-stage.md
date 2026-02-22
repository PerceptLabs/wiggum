# CC Kickoff: Pre-Stage — Loop Ergonomics Fixes

> This is the first CC session of the Wiggum implementation roadmap. Before starting the staged build plan, ship these independent quick fixes that address real friction Ralph encounters during task execution.

---

## What to Do

Read `docs/plans/todo/cc-loop-ergonomics.md`. It contains 7 targeted fixes with exact file paths, code snippets, and a summary of files changed.

Implement all 7 changes in order. Each is independent — if one is unclear, skip it and continue.

## Source Files to Read First

Before making any changes, read these files to understand the current state:

1. `apps/ide/src/lib/ralph/loop.ts` — the main loop, gate handling, system prompt
2. `apps/ide/src/lib/build/plugins/esmPlugin.ts` — bare module resolver
3. `apps/ide/src/lib/shell/parser.ts` — command parsing pipeline
4. `apps/ide/src/lib/shell/commands/replace.ts` — current replace implementation
5. `apps/ide/src/lib/shell/commands/index.ts` — command registry

## Constraints

- Do NOT read or implement anything from the roadmap stages (Stage 1-8). This session is pre-stage only.
- Do NOT refactor surrounding code. These are surgical fixes to existing behavior.
- Do NOT change the gate evaluation logic beyond what's specified (the pre-work check in fix #2).
- The `build` command (fix #5) should reuse existing esbuild infrastructure, not create a new build pipeline.

## When Done

```bash
git add -A
git commit -m "pre-stage: loop ergonomics — 5 retries, pre-work grace, data URI fix, 2>/dev/null, build cmd, replace errors, snapshot docs"
```

Verify by searching for the old values to make sure nothing was missed:
```bash
grep -r "MAX_CONSECUTIVE_GATE_FAILURES = 3" apps/ide/src/
grep -r "You have 3 attempts" apps/ide/src/
```

Both should return zero results.

---

## What Comes Next (DO NOT START)

After this session, Step 0.2 begins: Skills Tightening (cc-skills-tightening.md). That is a separate CC session.
