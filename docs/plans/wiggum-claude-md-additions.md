# Phase 0: Codebase Consistency Pass

> **This is a CC task specification.**
> Run as one or two CC sessions BEFORE the existing Phase A timeline.
> Feed CC: this document + `wiggum-master.md` (always).

## Why Phase 0 Exists

Every CC session that touches the codebase without explicit standards invents its own conventions. The codebase has already drifted in seven measurable ways. Phase 0 fixes these before new features compound them.

## Audit Findings (Evidence From Code)

### Finding 1: Duplicate Utility Functions

Three commands define their own `getBasename()` that duplicates `basename()` from `commands/utils.ts`:

| File | Local function | Should use |
|------|---------------|------------|
| `commands/find.ts` | `getBasename()` (line ~125) | `basename` from `./utils` |
| `commands/mv.ts` | `getBasename()` (line ~65) | `basename` from `./utils` |
| `commands/cp.ts` | `getBasename()` (line ~85) | `basename` from `./utils` |

All three are identical: split on `/`, return last segment. The shared version in `utils.ts` does the same thing.

**Fix:** Delete local `getBasename()` from find.ts, mv.ts, cp.ts. Import `basename` from `./utils`.

Additionally, `find.ts` has its own `matchGlob()` function (line ~135) doing basic `*`/`?` expansion. The executor already imports `picomatch` for glob expansion. The `find` command should use `picomatch` for consistency and correctness (its regex-based approach doesn't handle nested patterns).

**Fix:** Replace `matchGlob()` in find.ts with `picomatch`.

### Finding 2: Import Path Style Split

Two different import conventions coexist with no stated rule:

| Layer | Style | Example |
|-------|-------|---------|
| Hooks, components, contexts | `@/` aliases | `import { useFS } from '@/contexts'` |
| Lib internals (ralph/, shell/, build/) | Relative paths | `import type { JSRuntimeFS } from '../fs/types'` |

This split is actually reasonable — lib modules reference siblings, app-level code uses aliases — but CC doesn't know this is intentional and might "fix" it in either direction.

**Fix:** Now codified in CLAUDE.md Coding Standards. No code changes needed.

### Finding 3: Write Guard Coverage Gaps

Write guards protect against writes to forbidden paths. Currently:

| Has write guard | Missing write guard |
|----------------|-------------------|
| `sed.ts` ✓ | `touch.ts` ✗ — creates files without path validation |
| `replace.ts` ✓ | `cp.ts` ✗ — copies files to destination without validation |
| Executor `__write__` ✓ | `mv.ts` ✗ — renames/moves without destination validation |
| Executor `handleRedirect` ✓ | |

This means Ralph can bypass write guards:
- `touch ../outside.txt` — creates file outside project
- `cp src/App.tsx ../escape/App.tsx` — copies to forbidden path
- `mv src/App.tsx ../elsewhere/App.tsx` — moves to forbidden path

**Fix:** Add `validateFileWrite()` calls to `touch.ts`, `cp.ts`, and `mv.ts` for all destination paths. Import from `../write-guard`. Follow the pattern in `sed.ts`:

```typescript
import { validateFileWrite, formatValidationError } from '../write-guard'

// Before writing:
const validation = validateFileWrite(destPath, cwd)
if (!validation.allowed) {
  errors.push(formatValidationError(validation, dest))
  continue
}
```

### Finding 4: Error Handling Inconsistency

Shell commands handle errors in four different ways:

| Pattern | Commands | Issue |
|---------|----------|-------|
| Rich errors with suggestions | `cat.ts` (Levenshtein), `grep.ts` | Gold standard |
| Generic `${err}` messages | `mv.ts`, `cp.ts` | Not helpful for debugging |
| Silent swallow | `touch.ts` (stat catch is empty) | Hides root cause |
| Correct conditional swallow | `rm.ts` (`-f` flag suppresses) | This is fine |

**Fix:** Standardize on the `cat.ts` pattern for user-facing errors. At minimum:
- `mv.ts`: Change `mv: cannot move '${source}': ${err}` → include whether source wasn't found vs destination issue
- `cp.ts`: Same treatment
- `touch.ts`: The empty `catch` on stat is actually correct (checking existence), but the write error should be more specific

### Finding 5: Semicolons

`client.ts` uses semicolons on every line. Most other files omit them. The tsconfig doesn't enforce either way, but the majority convention is no semicolons.

**Fix:** Remove semicolons from `client.ts` to match codebase convention.

### Finding 6: Large Embedded Strings

`cat.ts` contains `getStackExports()` — a ~90-line string literal listing all @wiggum/stack exports. This content should be:
1. A separate file (e.g., `commands/data/stack-exports.ts` or a `?raw` import of a `.txt`)
2. Generated from the actual `packages/stack/src/index.ts` rather than manually maintained

Similarly, `state.ts` contains `PROJECT_SCAFFOLD` — ~100 lines of template strings for index.html, App.tsx, etc. These should be separate template files imported with `?raw`.

**Fix (Phase 0 scope):** Extract `getStackExports()` to a separate file. Flag `PROJECT_SCAFFOLD` for later extraction (lower priority, it works fine embedded).

### Finding 7: `filesChanged` Tracking

Most write commands correctly return `filesChanged` in their result for FS event emission:
- ✓ `touch.ts`, `rm.ts`, `mv.ts`, `cp.ts`
- ✗ `mkdir.ts` — creates directories but doesn't report them

This is minor since `mkdir` creating a directory isn't the same as changing a file, but for consistency with `fsEvents.fileChanged()` in the executor, it should at least be considered.

**Fix:** Low priority. Note in Known Issues.

## Phase 0 Task List for CC

### Session 0A: Safety & Deduplication (~30 min)

1. **Write guard gaps** — Add `validateFileWrite()` to `touch.ts`, `cp.ts`, `mv.ts` (Finding 3)
2. **Deduplicate `getBasename()`** — Delete from `find.ts`, `mv.ts`, `cp.ts`; import `basename` from `./utils` (Finding 1)
3. **Replace `matchGlob()` in find.ts** with `picomatch` (Finding 1)
4. **Verify all write commands track `filesChanged`** (Finding 7)

### Session 0B: Consistency Polish (~20 min)

5. **Remove semicolons from `client.ts`** (Finding 5)
6. **Extract `getStackExports()`** from `cat.ts` to a separate data file (Finding 6)
7. **Standardize error messages** in `mv.ts`, `cp.ts` to be more specific (Finding 4)
8. **Add missing JSDoc** to commands that have minimal docs (`touch.ts`, `echo.ts`)

### Files Changed (Expected)

| File | Change |
|------|--------|
| `commands/find.ts` | Remove `getBasename()`, `matchGlob()`; add picomatch import; import `basename` from utils |
| `commands/mv.ts` | Remove `getBasename()`; import `basename` from utils; add write guard; improve error messages |
| `commands/cp.ts` | Remove `getBasename()`; import `basename` from utils; add write guard; improve error messages |
| `commands/touch.ts` | Add write guard import and validation |
| `commands/cat.ts` | Extract `getStackExports()` to separate file |
| `commands/data/stack-exports.ts` | **New file** — extracted stack export listing |
| `llm/client.ts` | Remove semicolons |
