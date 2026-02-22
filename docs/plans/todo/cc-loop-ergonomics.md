# CC Prompt: Loop Ergonomics + Reflection Fixes

> Pre-stage quick fixes before the main roadmap begins. Addresses gate failure ergonomics and real friction points captured from Ralph's post-task reflections. Independent of all roadmap stages — can ship immediately.
>
> **Effort:** ~2-3 hours
> **Risk:** Low — targeted fixes to existing code, no architectural changes

---

## Changes

### 1. Increase MAX_CONSECUTIVE_GATE_FAILURES from 3 to 5

**File:** `apps/ide/src/lib/ralph/loop.ts`

Change the constant:
```typescript
const MAX_CONSECUTIVE_GATE_FAILURES = 3
```
to:
```typescript
const MAX_CONSECUTIVE_GATE_FAILURES = 5
```

Also update the system prompt text that references 3 attempts. Find:
```
If gates fail, feedback appears in .ralph/feedback.md. Read it, fix the issues, mark complete again. You have 3 attempts.
```
Replace with:
```
If gates fail, feedback appears in .ralph/feedback.md. Read it, fix the issues, mark complete again. You have 5 attempts.
```

`buildEscalationText` already uses the constant — verify the messaging still makes sense at 5. No code change needed there.

Also update `docs/wiggum-master.md` where it documents the constant value.

---

### 2. Don't count gate failures before Ralph has done real work

**File:** `apps/ide/src/lib/ralph/loop.ts`

**Problem:** On iteration 1, Ralph orients (reads task.md, feedback.md, etc.) and the LLM may finish without writing any src/ files. Gates fire via the `completedWithoutTools` path, fail (no App.tsx content, no CSS variables, no summary), and increment `consecutiveGateFailures`. This wastes one of Ralph's retry attempts on "you haven't started yet."

**Fix:** Before incrementing `consecutiveGateFailures` in `handleGateResult`, check whether Ralph has written at least one file in `src/` (beyond the initial scaffold). If not, treat it as a no-op: write feedback so Ralph knows what's needed, but do NOT increment the failure counter.

Implementation approach — add a helper:
```typescript
async function hasWrittenSrcFiles(fs: JSRuntimeFS, cwd: string): Promise<boolean> {
  try {
    const appContent = await fs.readFile(`${cwd}/src/App.tsx`, { encoding: 'utf8' }) as string;
    // The scaffold App.tsx is very short — if meaningfully modified, Ralph has worked
    return appContent.length > 200;
  } catch {
    return false;
  }
}
```

Then in `handleGateResult`, add an early check before incrementing:
- If `hasWrittenSrcFiles` returns false, still write feedback to `.ralph/feedback.md` and reset status to `'running'`, but do NOT increment `consecutiveGateFailures`.
- Ralph gets the feedback ("you need CSS variables, you need a summary") but doesn't burn a retry attempt.

The `handleGateResult` function signature already has `fs` and `cwd`. The check should happen right at the top, before `const newCount = consecutiveGateFailures + 1`.

---

### 3. Fix `2>/dev/null` before shell-quote parsing

**File:** `apps/ide/src/lib/shell/parser.ts`

**Problem:** Ralph writes `grep pattern file 2>/dev/null` to suppress errors. `shell-quote`'s `parse()` tokenizes `2>/dev/null` into separate tokens — `2` as a string, `>` as a redirect operator, `/dev/null` as the target. The existing `stripFdRedirects` function looks for `"2>/dev/null"` as a single string in the token array, never matches, and the redirect handler tries to write to `/dev/null` as a file. Write guard rejects it.

**Fix:** Strip fd redirect patterns from the raw command string BEFORE passing to `shell-quote`:

```typescript
function stripFdRedirectsFromRaw(raw: string): string {
  // Remove common fd redirects before shell-quote tokenizes them
  // Patterns: 2>/dev/null, 2>&1, 1>/dev/null
  return raw
    .replace(/\s+2>\s*\/dev\/null/g, '')
    .replace(/\s+2>&1/g, '')
    .replace(/\s+1>\s*\/dev\/null/g, '');
}
```

Call this at the top of the parse pipeline, before `shell_quote.parse(raw)`.

**Test file:** Create `apps/ide/src/lib/shell/__tests__/parser.test.ts`:
```typescript
import { stripFdRedirectsFromRaw } from '../parser';

test('strips 2>/dev/null', () => {
  expect(stripFdRedirectsFromRaw('grep foo bar 2>/dev/null')).toBe('grep foo bar');
});

test('strips 2>&1', () => {
  expect(stripFdRedirectsFromRaw('command 2>&1')).toBe('command');
});

test('strips with spaces', () => {
  expect(stripFdRedirectsFromRaw('grep foo 2> /dev/null')).toBe('grep foo');
});

test('leaves normal redirects alone', () => {
  expect(stripFdRedirectsFromRaw('echo hello > file.txt')).toBe('echo hello > file.txt');
});
```

---

### 4. Fix data: URI interception in esm plugin

**File:** `apps/ide/src/lib/build/plugins/esmPlugin.ts`

**Problem:** When Ralph uses inline SVG data URIs in CSS (e.g., `background-image: url("data:image/svg+xml,...")`), esbuild's resolve pipeline hits the bare module specifier handler (`/^[^./]/` filter). Since `data:image/...` starts with `d` (not `.` or `/`), it matches. The plugin prepends `https://esm.sh/` to the data URI and tries to fetch it as a package — gets a 400.

This blocks legitimate CSS techniques: SVG noise textures, dot grids, grain overlays, pattern backgrounds — all of which work natively in browsers with zero fetching.

**Fix:** In the bare module specifier `onResolve` handler, add an early return for `data:` and `blob:` URIs before any CDN resolution logic:

```typescript
// Handle bare module specifiers that weren't resolved by fsPlugin
build.onResolve({ filter: /^[^./]/ }, (args) => {
  // Don't intercept data: or blob: URIs — they're valid browser-native resources
  if (args.path.startsWith('data:') || args.path.startsWith('blob:')) {
    return { external: true };
  }
  // ... rest of existing handler
```

`{ external: true }` tells esbuild to leave the URI untouched — the browser resolves it natively. Also handles `blob:` since it's the same class of browser-native URI.

---

### 5. Add standalone `build` command (compile-only, no preview)

**Files:**
- `apps/ide/src/lib/shell/commands/build.ts` (new)
- `apps/ide/src/lib/shell/commands/index.ts` (register)

**Problem:** Ralph sometimes wants to check "does this even compile?" without the full preview pipeline. Currently the only way to trigger a build is through `preview`, which also does DOM capture, screenshot, and file writing. A fast compile check would give Ralph a quicker feedback loop.

**Implementation:** Create a `build` command that runs esbuild only and reports success/failure:
- On success: prints "Build succeeded" + any warnings
- On failure: prints build errors in the same enhanced format the gate uses
- Does NOT trigger preview, DOM capture, or gate evaluation
- Does NOT write to `.ralph/` (it's a development tool, not a gate)

Register in `commands/index.ts` alongside existing commands.

---

### 6. Improve `replace` error messaging

**File:** `apps/ide/src/lib/shell/commands/replace.ts`

**Problem:** When `replace` can't find the search string, it gives a generic error. Ralph doesn't know if the string doesn't exist, if there's a whitespace mismatch, or if multi-line content is the issue. Ralph falls back to full file rewrites via heredocs.

**Fix:** When the search string isn't found:
- If the search string contains newlines, add: "Note: `replace` does not support multi-line search strings. Use `write` to rewrite the file instead."
- If the search string is close to a substring in the file (fuzzy match), suggest: "Did you mean: [closest match]?"
- Otherwise: "Search string not found in {filename}. Verify exact content including whitespace."

The multi-line hint is the highest-value addition — it redirects Ralph to the right tool immediately instead of letting it retry `replace` with variations.

---

### 7. Document snapshot files in system prompt

**File:** `apps/ide/src/lib/ralph/loop.ts`

**Problem:** After running `preview`, Ralph guesses at what files were produced. It tried `cat .ralph/snapshot/clean-slice.html` which doesn't exist. The system prompt tells Ralph to "run `cat .ralph/snapshot/ui-report.md`" but doesn't list all available snapshot files, so Ralph invents filenames.

**Fix:** Add to the system prompt, in the section that describes `.ralph/` files, an explicit list of what `preview` produces:

```
After running `preview`, these files are written:
- .ralph/rendered-structure.md — Full DOM tree of the rendered app
- .ralph/console.md — Console output (log, warn, error)
- .ralph/build-errors.md — Build errors if compilation failed
- .ralph/errors.md — Runtime JS errors

Use `cat .ralph/rendered-structure.md` to inspect what was rendered.
Use `cat .ralph/console.md` to check for runtime warnings.

These files are overwritten on each `preview` run. Do NOT guess filenames — only these files exist.
```

This is a text edit in the system prompt string. No logic changes.

---

## Summary of Changes

- `MAX_CONSECUTIVE_GATE_FAILURES`: 3 → 5
- Gate failures before Ralph has written meaningful src/ content: feedback written but failure counter NOT incremented
- System prompt "You have 3 attempts" → "You have 5 attempts"
- System prompt documents exactly which files `preview` produces
- `2>/dev/null` and `2>&1` stripped from raw command string before shell-quote tokenization
- esm plugin no longer intercepts `data:` and `blob:` URIs — they pass through as external
- New `build` command for compile-only checks (no preview pipeline)
- `replace` command gives actionable error messages, especially for multi-line content

## Files Changed

1. `apps/ide/src/lib/ralph/loop.ts` — constant, system prompt string (attempts + snapshot docs), `handleGateResult` pre-work check
2. `apps/ide/src/lib/build/plugins/esmPlugin.ts` — data:/blob: URI early return in bare module resolver
3. `apps/ide/src/lib/shell/parser.ts` — `stripFdRedirectsFromRaw()` pre-processing before `shell-quote`
4. `apps/ide/src/lib/shell/__tests__/parser.test.ts` — new test file for fd redirect stripping
5. `apps/ide/src/lib/shell/commands/build.ts` — new compile-only command
6. `apps/ide/src/lib/shell/commands/index.ts` — register build command
7. `apps/ide/src/lib/shell/commands/replace.ts` — improved error messaging on match failure
8. `docs/wiggum-master.md` — constant reference, command count update
