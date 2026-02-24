# Wiggum — Remaining Work Plan (Post-3.5)

*Created: 2026-02-24 · Status: Pre-execution*

---

## Current State — What Actually Shipped

Code verification (not conversation history) confirms:

| Step | Status | Evidence |
|------|--------|----------|
| 0.1–0.2 | ✅ Shipped | Foundation |
| 1.1–1.4 | ✅ Shipped | Toolkit Ph 0-1, Lifecycle Ph 0-1 |
| 2.1–2.4 | ✅ Shipped | Planning Ph 0-3 |
| 2.5 | ✅ Shipped + Wired | `parseTask` imported and called in useAIChat.ts, `structuredTask` passed to runRalphLoop |
| 2.6 | ✅ Shipped + Wired | loop.ts checks `structuredTask.type === 'mutation'`, calls `formatMutationContext`, appends to system prompt |
| 3.1 | ✅ Shipped | grep, replace, theme, preview all have Zod schemas + argsSchema |
| 3.2 | ✅ Shipped | Theme token enrichment |
| 3.3 | ✅ Shipped | Chief integration |
| 3.4 | ✅ Shipped | Plan-diff gate, diffEntries on GateResult |
| 3.5 | ✅ Shipped | Scope gates, section-annotated feedback, assembly sequence in SKILL.md |

**Gumdrop-exists validation**: Already in `packages/planning/src/validate.ts` as `valid-gumdrops` check. Walks entire plan tree, validates `gumdrop` and `use` props against `GUMDROP_NAMES`.

---

## Remaining Work — 6 Items

### Item 1: Snapshot Crash Fix
**Priority: P0 · Blocks: nothing directly, but silently breaks pre/post task snapshots**

**The bug:** `TypeError: Cannot read properties of undefined (reading 'length')` in `isomorphic-git` during `git add` in `createSnapshot()`.

**Root cause:** `task-lifecycle.ts` line ~92 calls `git.add('.')`. The `Git.add()` method passes `filepath: '.'` to `isomorphic-git.add()`. isomorphic-git's `add` with `'.'` works sometimes but fails when LightningFS has certain directory states — the internal `join()` gets `undefined` from a path resolution step.

**Fix:** Replace `git.add('.')` with `git.addAll()` in `createSnapshot()`. The `addAll()` method already exists on the Git class — it uses `statusMatrix()` to find all changed files and stages them individually, handling deletions correctly via `git.remove()`. This is the same pattern the main loop uses in `gitCommit()`.

**Files:**
- `apps/ide/src/lib/ralph/task-lifecycle.ts` — change `await git.add('.')` → `await git.addAll()` in `createSnapshot()`

**Test:** Run a task, verify `task-N-pre` and `task-N-post` tags are created. Check console for `[task-lifecycle] Snapshot failed` — should be gone.

**Why P0:** Silent failure. Post-task snapshots don't exist → scope gate (3.5) can't compare `task-N-pre` vs current state → degrades to warn-only mode for `NO CHANGES` sections. The gate WORKS but has no baseline to compare against.

---

### Item 2: Replace Command — Line-Number Mode
**Priority: P0 · Blocks: nothing, but biggest single productivity drain observed**

**The problem:** Ralph burned ~3 iterations in a test session trying to fix one line containing template literals (`${}` and backticks). The `replace` command's `escapeRegex` correctly escapes `${}` and braces, but Ralph's shell argument parsing mangles the strings before they reach the matcher. Ralph eventually fell back to `sed -i '187s/.*/<content>/'` — line-number replacement via sed works but the escaping is gnarly.

**Fix:** Add a `--line N` mode to the replace command. When `--line` is specified, skip pattern matching entirely — read the file, replace line N with the new content, write back. This gives Ralph a clean escape hatch for lines containing template literals, JSX expressions, or other syntax that's hard to quote in shell arguments.

**Schema addition:**
```typescript
const ReplaceArgsSchema = z.object({
  file: z.string().min(1).describe('File path'),
  old: z.string().optional().describe('String to find (not needed with --line)'),  // was .min(1)
  new: z.string().describe('Replacement string'),
  line: z.number().int().positive().optional().describe('Replace entire line N (1-indexed)'),
  whitespaceTolerant: z.boolean().optional().describe('Collapse whitespace during matching'),
}).refine(
  data => data.line !== undefined || (data.old !== undefined && data.old.length > 0),
  { message: 'Either --line or old string is required' }
)
```

**CLI addition:**
```
replace src/App.tsx --line 187 '<div className={`font-display text-xl ${color}`}>'
```

**Implementation (~40 LOC):**
- In `parseCliArgs`: detect `--line` flag, parse next arg as number
- In `execute`: if `args.line` is set, split file by `\n`, replace line at index `args.line - 1`, rejoin
- Same diff output, same write guard, same `filesChanged` return

**Files:**
- `apps/ide/src/lib/shell/commands/replace.ts` — schema change, parseCliArgs addition, execute branch
- `apps/ide/src/lib/shell/commands/__tests__/replace.test.ts` — 3-4 new tests (line mode basic, out of range, combined with file)

**System prompt update:** Add to replace examples:
```
replace src/App.tsx --line 187 "new line content"  # Replace entire line by number
```

---

### Item 3: Grep Error Message Improvement
**Priority: P2 · Blocks: nothing**

**The problem:** Ralph hits `grep: no input files` when second arg isn't a valid path. The command doesn't suggest the right syntax.

**Fix:** In the regex grep path (not skill/package/code modes), when no files are found or the path is invalid, return a helpful error instead of the terse Unix-style message:

```
grep: no matching files for "pattern" in .
Did you mean: grep "pattern" src/     (search src/ recursively)
              grep "pattern" src/**/*.tsx  (search only .tsx files)
              grep skill "pattern"    (search skills library)
```

**Files:**
- `apps/ide/src/lib/shell/commands/grep.ts` — ~10 LOC in the regex search path error handling

---

### Item 4: Remaining Command Promotions (Step 3.6)
**Priority: P1 · Blocks: nothing**

**What:** Promote build, find, git, sed from `string[]` args to Zod-schema'd discrete tools.

**Current state:**
- `build.ts` — No schema. Simple command, one optional arg (`--verbose`). Low-value promotion since Ralph rarely calls it directly (gates trigger builds). **SKIP or defer** — low ROI.
- `find.ts` — No schema. Complex flag parsing (`-name`, `-type`, `-exec`). Medium value — models struggle with `-exec {} \;` escaping.
- `git.ts` — No schema. Switch/case on subcommands (status, add, commit, log, diff, branch, checkout). Medium value — models know git syntax well already.
- `sed.ts` — No schema. Three modes (standard regex, Orama code search, whitespace-tolerant). High value — sed expression escaping is the #2 friction point after replace.

**Recommended subset — promote sed and find only:**

#### 4a. Sed Schema

The main friction is sed expression parsing in shell args. A typed tool bypasses this entirely.

```typescript
// Primary: regex substitution (the 90% case)
const SedSubstituteSchema = z.object({
  mode: z.literal('substitute'),
  file: z.string().min(1).describe('File path'),
  pattern: z.string().min(1).describe('Regex pattern to match'),
  replacement: z.string().describe('Replacement string (use $1, $2 for groups)'),
  flags: z.string().optional().describe('Regex flags: g=global, i=case-insensitive'),
  inPlace: z.boolean().optional().default(true).describe('Modify file in place'),
})

// Secondary: line-number operations
const SedLineSchema = z.object({
  mode: z.literal('line'),
  file: z.string().min(1).describe('File path'),
  lineNumber: z.number().int().positive().describe('Line number (1-indexed)'),
  action: z.enum(['delete', 'replace', 'insert-before', 'insert-after']),
  content: z.string().optional().describe('New content (for replace/insert)'),
})
```

Register as `additionalTools` on the SedCommand — both route to the existing execute logic, just with pre-parsed arguments. The existing `string[]` CLI path stays for human use.

#### 4b. Find Schema

```typescript
const FindSchema = z.object({
  path: z.string().optional().default('.').describe('Search directory'),
  name: z.string().optional().describe('Glob pattern for file names'),
  type: z.enum(['f', 'd']).optional().describe('f=files only, d=directories only'),
})
```

Skip `-exec` in the typed schema — that's the complex case models can fall back to shell for.

#### 4c. Git and Build — Defer

Git subcommands are well-understood by models. Build is rarely called directly. Neither showed friction in the test sessions. Promote later if friction appears.

**Files:**
- `apps/ide/src/lib/shell/commands/sed.ts` — Add schemas, `additionalTools`, `parseCliArgs` adapter
- `apps/ide/src/lib/shell/commands/find.ts` — Add schema, `argsSchema`, `parseCliArgs`
- Tests for each

---

### Item 5: Gumdrop Name Suggestions in Validation Feedback
**Priority: P1 · Blocks: nothing**

**Current state:** `validate.ts` catches unknown gumdrops with `"Unknown gumdrop 'cyber-timeline' in <Section> (line 12)"`. But it doesn't suggest the nearest valid name.

**The observation problem:** Ralph got `valid-gumdrops` failure but didn't know what the valid names were, so it burned an iteration grepping for them.

**Fix:** Use Levenshtein distance (already a dependency via `fastest-levenshtein` in replace.ts) to suggest the 2-3 nearest valid gumdrop names in the error message:

```
Unknown gumdrop 'cyber-timeline' in <Section> (line 12)
  Did you mean: timeline, hero-timeline, activity-feed?
```

**Files:**
- `packages/planning/src/validate.ts` — import `distance` from `fastest-levenshtein`, add `suggestNearest()` helper (~15 LOC), update `valid-gumdrops` failure message

**Note:** `fastest-levenshtein` may need to be added to the planning package's dependencies, or the suggestion logic could live in the gate feedback formatter in `apps/ide` instead. Check where the dependency is available.

---

### Item 6: Theming Skill — Dynamic Color Pattern
**Priority: P1 · Blocks: nothing**

**The problem:** Ralph used inline `style={{ color: 'oklch(0.70 0.32 340)' }}` for timeline event colors because there's no documented pattern for "I need 5 different colors from the theme for data points."

**Fix:** Add a "Dynamic Colors" section to the theming skill doc explaining the chart variable pattern:

```markdown
## Dynamic Colors (Data Viz, Timelines, Tags)

For elements that need distinct colors from a set (chart bars, timeline events,
category tags), use the chart variables:

| Variable | Use for |
|----------|---------|
| `var(--chart-1)` through `var(--chart-5)` | Data series, categories, tags |
| `bg-chart-1` through `bg-chart-5` | Tailwind background utilities |
| `text-chart-1` through `text-chart-5` | Tailwind text utilities |

Pattern for dynamic color assignment:
```tsx
const COLORS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5']
items.map((item, i) => <Tag className={COLORS[i % COLORS.length]}>{item.label}</Tag>)
```

For more than 5 colors, use `theme extend --name <n> --hue <N>` to add custom
colors to the palette, then reference via `bg-<n>` / `text-<n>`.

NEVER use raw oklch(), hsl(), or hex values in components. Every color traces to a
CSS variable.
```

**Files:**
- `apps/ide/src/skills/theming/SKILL.md` — Add "Dynamic Colors" section after the existing color consumption section

---

## Execution Plan

### Session A — Quick Fixes
*One CC session, four small changes*

1. Snapshot crash: `addAll()` in task-lifecycle.ts
2. Grep error messages
3. Gumdrop name suggestions in validation
4. Dynamic color pattern in theming skill

Commit: `fix: snapshot crash + grep errors + gumdrop suggestions + dynamic color docs`

### Session B — Replace Line-Number Mode
*One CC session, focused on replace.ts*

5. Replace `--line N` mode + schema update + tests

Commit: `feat: replace --line N mode for template literal editing`

### Session C — Sed & Find Promotion
*One CC session, two command promotions*

6. Sed schemas (substitute + line mode) as additionalTools
7. Find schema + argsSchema

Commit: `feat: promote sed + find to discrete tools (3.6 partial)`

---

## What This Unblocks

**Snapshot fix (Item 1)** → 3.5 scope gate gets reliable `task-N-pre` baselines → `NO CHANGES` sections validated via git comparison instead of warn-only degradation.

**Replace line mode (Item 2)** → Ralph stops burning 2-3 iterations on template literal edits. Single biggest productivity gain per LOC invested.

**Sed/Find promotion (Item 4)** → Models stop fighting shell escaping for regex substitutions. Typed `{ pattern, replacement, file }` eliminates the quoting problem entirely.

**Dynamic color docs (Item 6)** → The oklch-inline-style pattern from the ECHOVAULT test session stops recurring. Ralph knows about chart variables before implementation, not after a gate failure.

**Gumdrop suggestions (Item 5)** → Ralph fixes invalid gumdrop names on first retry instead of grepping for the list.

---

## What Comes After

These items close out the roadmap through Stage 3 (minus git/build promotion, deferred). After this:

- **Skill Graph (WikiLinks → Graphology → Context Bundle → Synonyms)** — spec ready, 4 phases
- **Stage 4: Gumdrop authoring** — recipe type with `dependencies` block from day one
- **Stage 5+: API phases** — context preflight, stall detection, budget management

The skill graph plugs into everything above: `annotateFeedbackWithSections()` (shipped in 3.5) gets WikiLink resolution, `validatePlan` gumdrop checks get graph-backed suggestions, stall recovery gets targeted skill recommendations.
