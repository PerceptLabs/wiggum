# Wiggum Issues Log

> Running capture of friction points, bugs, and improvements observed during Ralph testing.
> Each entry includes: what happened, where the fix goes, and implementation notes.
> Entries are folded into phase work as capacity allows.

---

## Open Issues

### TH-004: `theme modify` only supports hue shift, not direct color setting
**Source:** GLM reflection (A1.5 test run)
**What happened:** Ralph tried `theme modify --primary "oklch(0.72 0.16 40)" --apply`. Expected direct color modification. Command only supports `--shift-hue`.
**Where:** `apps/ide/src/lib/shell/commands/theme.ts` — `handleModify()`
**Implementation:** Add `--set` flag: `theme modify --set primary "oklch(0.72 0.16 40)" --apply`
- Parse `--set <var> <value>` pairs (allow multiple)
- Read src/index.css, find `--<var>:` line, replace value
- Validate oklch format before writing
- ~30 lines added to handleModify
**Scope:** ~30 lines.
**Phase:** B1-B2 (becomes the fine-tuning step after recipe/preset selection)

### TH-011: Pattern alias not transparent in theme output
**Source:** Log analysis (fashion magazine test run)
**Severity:** Low — cosmetic, no functional impact
**What happened:** Ralph typed `--pattern minimal`, output said `pattern=monochromatic` with no indication that `minimal` was an alias. Confusing for log readers.
**Where:** `apps/ide/src/lib/shell/commands/theme.ts` — generate/preset stdout messages
**Implementation:** Include alias in output: `"pattern=monochromatic (alias: minimal)"`. Check if the pattern name differs from the resolved pattern name — if so, append `(alias: {original})`.
**Scope:** ~3 lines in two places (preset path + generate path).
**Phase:** Nice-to-have

### UX-001: Multi-line replace is unreliable
**Source:** Post-B4 test run 3 (continuation — dark mode toggle)
**What happened:** Ralph tried multi-line `replace` on plan.md, got "No match found". Fell back to rewriting entire files with `cat > file << 'EOF'`. Also wished for `insert at line number` and `append to file`.
**Where:** `apps/ide/src/lib/shell/commands/replace.ts` + mega plan `sed` implementation
**Impact:** Ralph rewrites entire files instead of targeted edits. Wastes tool calls, risks overwriting adjacent code.
**Fix:** The mega plan's `sed` command (line-number targeting, insert, append, regex replace) solves this directly. Replace command stays for simple single-line swaps.
**Phase:** Mega plan execution (sed implementation)

### UX-002: Command output visibility / confidence gap
**Source:** Post-B4 test runs 1 + 3
**What happened:** Ralph reported `grep skill` and `paths` output "weren't visible" and `sed` "appeared to execute but I'm not sure it actually modified the file." Results are in context (confirmed by log analysis) but Ralph can't confirm what happened.
**Where:** UI / output rendering — not a shell bug
**Impact:** Ralph second-guesses its own commands. Wastes tool calls re-checking files it just modified.
**Notes:** This is a perceived confidence problem, not a data problem. Might improve with clearer command output formatting (e.g., "✓ replaced 1 occurrence in src/App.tsx") or a `verify` subcommand. Low priority — doesn't block functionality.
**Phase:** Nice-to-have, no specific phase

### UX-003: No file scaffolding — repetitive boilerplate creation
**Source:** Post-B4 test run 1
**What happened:** Ralph wished for `section scaffold` and `component scaffold` commands. Currently creates every file with individual `cat >` heredocs — same imports, same export pattern, same structure each time.
**Where:** New shell command: `scaffold`
**Impact:** 3-4 extra tool calls per component. Repetitive, error-prone (wrong imports, missing exports).
**Implementation concept:**
- `scaffold component HeroSection` → writes `src/components/HeroSection.tsx` with React import, typed props, export default, CSS class matching component name
- `scaffold section AboutSection` → writes `src/sections/AboutSection.tsx` with same pattern + section-specific wrapper div
- `scaffold page HomePage` → writes `src/pages/HomePage.tsx` with section imports pattern
- Reads theme vars from index.css to suggest relevant CSS custom properties in a comment
- Uses @wiggum/stack imports based on component type
**Scope:** ~100-150 lines. New command class + templates.
**Phase:** Post-C1 (quick win, not blocking)

### UX-004: /tmp filesystem access blocked
**Source:** Post-B4 test run 3
**What happened:** Ralph tried `cat > /tmp/hero_imports.txt` to stage content. Blocked by filesystem sandbox (writes restricted to `src/` and `.ralph/`).
**Where:** Filesystem write validation in shell executor
**Impact:** Ralph can't stage intermediate content outside project tree. Falls back to rewriting entire files.
**Notes:** Working as designed — sandbox is intentional. `sed` (line-targeted edits) and `.ralph/` staging should eliminate the need. If not, could allow `.ralph/tmp/` as a staging area.
**Phase:** Monitor — may resolve naturally with sed

### DIAG-001: No timestamps in Ralph console output
**Source:** Post-B4 test observation
**What happened:** 90-second silence before first tool call on first run, near-instant on continuation. No way to diagnose whether latency is API (big prompt), tool execution, or client parsing.
**Where:** `apps/ide/src/hooks/useAIChat.ts` or Ralph loop console output
**Implementation concept:** Log timestamps at key boundaries:
- `[0.0s] → API request sent (Xk tokens)`
- `[1.8s] ← First response received`
- `[1.8s] ▸ shell: cat .ralph/task.md (12ms)`
- Token count alongside timestamp correlates prompt size with latency
**Impact:** Direct evidence for whether skills consolidation helps. Cadence diagnosis for prompt optimization.
**Scope:** ~20 lines. `Date.now()` diffs at request/response/tool-call boundaries.
**Phase:** Pre-mega-plan or alongside skills consolidation (provides measurement for optimization)

### TH-012: Portable theme configs as compact strings
**Source:** Design review (shadcn /create URL analysis)
**Severity:** Nice-to-have — no functional impact, future enhancement
**What happened:** shadcn's `/create` encodes full project config in URL params (`?style=lyra&baseColor=neutral&font=figtree&radius=default`). Wiggum's `theme generate` flags are the same concept — declarative params that fully describe a design system. A compact, shareable theme string would let users reproduce exact themes across projects: `theme import "seed=55&pattern=minimal&mood=fashion-editorial&font=Outfit&shadow=dramatic"`. Currently tokens.json captures this data but isn't portable.
**Where:** `apps/ide/src/lib/shell/commands/theme.ts` — new `import`/`export` subcommands
**Implementation:** Serialize ThemeConfig to URL-param-style string. `theme export` outputs the string. `theme import <string>` parses and regenerates. Could also store config string in tokens.json metadata for reproducibility.
**Scope:** ~40-60 lines (serialize/deserialize + two subcommands).
**Phase:** Future — after smart merge and mood expansion ship

---

## Resolved Issues

| ID | Description | Resolved In | Date |
|----|-------------|-------------|------|
| CDN-001 | esm.sh serves ES modules, breaks `<script>` tag | A1.5 hotfix (jsdelivr swap) | 2025-02-14 |
| PATH-001 | theme.ts bare `src/index.css` paths without resolvePath | A1.5 hotfix | 2025-02-14 |
| CHROMA-001 | Preset surface chroma tuning looked bad | A1.5 hotfix (reverted to stock) | 2025-02-14 |
| TH-001 | `theme --help` not recognized — added help/--help/-h dispatch | A2 | 2026-02-14 |
| TH-002 | `--font` rejects weight syntax — strip colon suffix before lookup | A2 | 2026-02-14 |
| TH-003 | `--shadow-profile` no fuzzy matching — added alias map (soft/bold/heavy) | A2 | 2026-02-14 |
| TH-006 | Default scaffold missing vars + .dark — expanded to all 32 vars + dark block | A2 | 2026-02-14 |
| TH-007 | Build errors lack file paths — include file:line in gate feedback | A2 | 2026-02-14 |
| TH-008 | Skills missing preset-first workflow — added Customization Workflow section | A2 | 2026-02-14 |
| TH-009 | formatThemeCss missing `--` prefix on CSS custom properties | Hotfix (pre-C1) | 2026-02-15 |
| TH-010 | initRalphDir wipes plan/intent/summary on continuation runs | Hotfix (pre-C1) | 2026-02-15 |

---

## Phase Mapping

| Phase | Issues | Notes |
|-------|--------|-------|
| A2 | TH-001, TH-002, TH-003, TH-006, TH-007, TH-008 | All resolved |
| B1-B2 | TH-004 | Fine-tuning step after recipe/preset selection |
| Hotfix | TH-009, TH-010 | Pre-C1, both resolved with test coverage |
| Mega plan | UX-001 | sed implementation solves multi-line replace |
| Post-C1 | UX-003 | Scaffold command — quick win |
| Monitor | UX-002, UX-004 | May resolve with sed + better output formatting |
| Pre-mega or alongside | DIAG-001 | Timestamp diagnostics for latency measurement |
| Nice-to-have | TH-011 | Pattern alias transparency in theme output |
