# CC Kickoff Template

> Copy this, fill in the blanks, and use as the opening prompt for each CC session.

---

## Session: Stage {N}, Step {N.X} — {Short Name}

Read `docs/plans/todo/wiggum-implementation-roadmap.md`, Stage {N} section only. You are implementing Step {N.X}.

Then read `docs/plans/todo/{spec-filename}.md`, Phase {X} section only. Follow the CC Prompt instructions in that section — it lists which source files to read.

{OPTIONAL: If this step has additional references}
Also read `docs/plans/todo/{additional-doc}.md` for {reason}.

## Constraints

- Do NOT read or implement anything from other stages or phases.
- Do NOT refactor code outside the scope of this step.
- Check that prerequisite steps are committed: {list prerequisite step numbers}.

## When Done

```bash
git add -A
git commit -m "stage-{N}.{X}: {description}"
```

## What Comes Next (DO NOT START)

Stage {N}, Step {N.Y}: {next step description}. That is a separate CC session.

---

# EXAMPLE: Stage 1, Step 1.1 + 1.2

## Session: Stage 1, Step 1.1 + 1.2 — Toolkit Ph 0+1

Read `docs/plans/todo/wiggum-implementation-roadmap.md`, Stage 1 section only. You are implementing Steps 1.1 and 1.2.

Then read `docs/plans/todo/toolkit-2_0.md`, Phase 0 and Phase 1 sections only. Follow the CC Prompt instructions in those sections — they list which source files to read.

## Constraints

- Do NOT read or implement anything from Stage 2+.
- Do NOT refactor shell commands beyond adding the Zod schema infrastructure.
- No prerequisites — this is the first staged step.

## When Done

```bash
git add -A
git commit -m "stage-1.1-1.2: toolkit ph 0+1 — zod schemas, dual-mode dispatch, toolFromCommand"
```

## What Comes Next (DO NOT START)

Stage 1, Step 1.3: Lifecycle Ph 0 (snapshot shell command). That is a separate CC session.
