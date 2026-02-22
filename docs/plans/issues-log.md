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

### TH-013: Batch `theme extend` — multiple colors in one command
**Source:** Energy drink test reflections (3 runs)
**What happened:** Ralph had to call `theme extend --name grape --hue 300` separately for each flavor color (green, orange, purple, blue). Wished for batch: `theme extend --name electric citrus grape arctic` in one command.
**Where:** `apps/ide/src/lib/shell/commands/theme-extend.ts`
**Implementation:** Accept comma-separated `--name a,b,c` with `--hue 120,60,300` pairs. Loop internally.
**Scope:** ~20 lines.
**Phase:** Nice-to-have. Saves 3 tool calls per multi-flavor project.

### TH-014: Mood alias confusion — "bold" assumed to work as mood
**Source:** Energy drink test reflection
**What happened:** Ralph saw "bold" in pattern alias list and assumed it worked for moods too. `--mood bold` fails with no helpful error.
**Where:** `apps/ide/src/lib/shell/commands/theme.ts` — mood validation error message
**Implementation:** If mood is invalid but matches a pattern alias, say: `"bold" is a pattern alias (→ complementary), not a mood. Available moods: ...`
**Scope:** ~5 lines in error path.
**Phase:** Nice-to-have. Related to TH-011.

### TH-015: `theme extend` output doesn't confirm token creation
**Source:** Energy drink test reflection
**What happened:** Ralph had to manually `cat src/index.css` after extend to verify tokens were actually created. Command output doesn't show the created values.
**Where:** `apps/ide/src/lib/shell/commands/theme-extend.ts` — stdout formatting
**Implementation:** Output should include: `Created --grape: oklch(0.55 0.19 300) + --grape-foreground: oklch(0.98 0.01 300)` so Ralph sees the actual values.
**Scope:** ~5 lines.
**Phase:** Nice-to-have. Related to UX-002.

### TH-016: `theme preview` command — color swatch visualization
**Source:** Energy drink test reflection
**What happened:** Ralph wished for "theme preview to see color swatches before applying". Currently must apply, build, preview to see colors.
**Where:** New subcommand or enhancement to preview system
**Implementation:** `theme preview` could output an ASCII/text representation of the palette, or inject a temporary swatch component into the preview.
**Scope:** TBD — ranges from simple (ASCII output) to complex (injected component).
**Phase:** Nice-to-have.

### TH-017: `theme remix` — preset mutation and cross-pollination
**Source:** Design session (Feb 17)
**Severity:** Enhancement — significant creative capability
**What happened:** Ralph bypassed the theme system entirely during Kanban build, hand-writing all CSS variables instead of calling theme generate. Found it easier to freestyle than to call the command three times. Presets are treated as static endpoints, not creative DNA.
**Where:** New file `apps/ide/src/lib/shell/commands/theme-remix.ts` + dispatch from theme.ts
**Implementation:** Start from any preset's full personality, mutate hue/chroma/font/shadow/radius independently. Uses Gemini's structure/material split — `--structure doom-64 --material elegant-luxury` cross-pollinates geometry (fonts/radius/spacing) with color/shadow layers. Preserves human-crafted design relationships while enabling infinite variation.
**Key flags:** `--structure <preset>`, `--material <preset>`, `--shift-hue <±deg>`, `--chroma <level>`, `--font <name>`, `--shadow-profile <name>`, `--radius <stop>`, `--mood <name>`, `--apply`
**Scope:** ~150 lines new file + ~5 lines dispatch.
**Phase:** Next CC run — critical for creative output quality.

### TH-018: 8 new presets — structural and material DNA diversity
**Source:** Design session (Feb 17)
**Severity:** Enhancement — multiplies remix combinatorics
**What happened:** Current 12 presets have heavy overlap: 3 pinks, 3 browns, zero blues, zero serifs, zero slab-serifs, all normal tracking. Remix is only as good as the DNA library.
**Where:** `apps/ide/src/lib/theme-generator/themes/` — 8 new JSON files + presets.ts registration
**New presets:**
- `deep-ocean` (IBM Plex Sans, blue ~225, corporate mood anchor)
- `botanical` (Lora serif, green ~150, wide tracking, organic mood)
- `arctic` (Sora, ultra-low chroma ~230, minimal)
- `ember` (Righteous display, warm dark-first ~30, brutalist)
- `ink-wash` (Crimson Pro serif, warm sepia near-mono, fashion-editorial mood anchor)
- `neon-mint` (Space Grotesk, teal ~170, pill radius, colored glow shadows, playful)
- `jewel-box` (Zilla Slab, amethyst ~280, high chroma dark, premium mood anchor)
- `swiss` (Geist, flat zero-shadow, tight tracking, Swiss red ~5, editorial)
**Unlocks:** 20×20=400 structure/material remix combos (up from 144). Anchors 3 unmapped moods (corporate, fashion-editorial, premium). First serif, slab-serif, wide-tracking, and negative-tracking presets.
**Scope:** 8 JSON files (~150 lines each) + presets.ts imports + PRESET_MOOD_MAP entries.
**Phase:** Same CC run as TH-017 — presets are the data, remix is the mechanism.

### DX-001: Ralph doesn't know what's in @wiggum/stack
**Source:** Kanban build reflection
**What happened:** Ralph was confused "whether @dnd-kit was already available in @wiggum/stack or needed to be imported." Wished for "better documentation on what @wiggum/stack includes by default."
**Where:** Stack documentation / skills system
**Impact:** Ralph wastes tool calls trying to figure out available packages. Sometimes imports things that don't exist, sometimes reinvents things that are built-in.
**Notes:** This is the docs gap identified in the Feb 10 web search chat. Decision was to pre-package stack docs in `/mnt/docs/` rather than add web search. Still unfilled.
**Phase:** Skills tightening v2

### DX-002: No console.log capture in preview snapshot
**Source:** Kanban build reflection
**What happened:** Ralph tried `cat .ralph/snapshot/console.log` expecting browser console output. File doesn't exist. "No console.log was captured."
**Where:** Preview system / snapshot capture
**Impact:** Ralph's debug loop is blind for runtime JS issues. Can see build errors (gate catches those) but not runtime console output.
**Implementation:** Capture console.log/warn/error during preview execution, write to `.ralph/snapshot/console.log`.
**Scope:** ~30-40 lines in preview capture logic.
**Phase:** Preview providers work (planned per anti-slop tracker)

### DX-003: Ralph prefers full file rewrites over targeted edits
**Source:** Kanban build reflection (second run)
**What happened:** "Writing multiple large files via heredoc worked well" and "rewrote several files entirely rather than making targeted patches." Ralph finds cat > file easier than replace/sed.
**Where:** Related to UX-001 (multi-line replace unreliable)
**Impact:** Wastes tokens rewriting 200-line files to change 10 lines. Risk of regressing adjacent code. Compounds with continuation runs.
**Notes:** Reinforces priority of sed command from mega plan. Also suggests replace command UX needs improvement — even when it works, Ralph doesn't trust it.
**Phase:** Mega plan execution (sed implementation)

### RALPH-006: Summary-Source Coherence Gate
**Source:** GPT-OSS 20B energy drink test (Feb 17)
**Severity:** High — enables fabricated completions to pass
**What happened:** 20B wrote a summary claiming "hero section, flavor grid, and CTA" but src/App.tsx was still the untouched scaffold. Summary gate only checks "exists with 20+ chars" — passed despite zero actual work. Model also wrote a structured reflection rating difficulty 3/5 and claiming "recreated design brief manually with echo" (never happened). This poisons reflection data.
**Where:** `apps/ide/src/lib/ralph/gates.ts` — new gate
**Implementation:** After `has-summary` gate passes, compare src/App.tsx against scaffold fingerprint. If App.tsx still matches scaffold (same hash or same imports/structure), fail with "Summary claims work that doesn't exist in source files." Quick check: does src/App.tsx contain more than scaffold? Does it import more than basic Card/Button?
**Scope:** ~30 lines. Hash comparison + import count heuristic.
**Phase:** Anti-slop gates (per wiggum-anti-slop-tracker.md)

### RALPH-007: Skip reflection when no-op gate fires
**Source:** GPT-OSS 20B energy drink test (Feb 17)
**Severity:** Medium — prevents reflection data poisoning
**What happened:** 20B built nothing, but the reflection call still ran. Model produced convincing fiction: rated difficulty 3/5, invented friction points about "file not found error after earlier modification," said "wouldRecommend: true." This is a "performing competence" pattern — confident student handing in blank test with detailed notes about how it went.
**Where:** `apps/ide/src/lib/ralph/loop.ts` — reflection call gating
**Implementation:** If RALPH-004 (no-op gate) fires (zero src/ files modified), skip reflection call entirely. Don't ask a model that built nothing to reflect on building nothing.
**Scope:** ~5 lines. Conditional before reflection call.
**Phase:** Anti-slop gates

### SED-001: Virtual sed missing insert/append/change commands
**Source:** GPT-OSS 120B + MiniMax M2 energy drink tests (Feb 17)
**Severity:** High — causes 10-16 wasted tool calls per session
**What happened:** Both models attempted standard sed insert commands (`sed -i '1i/* @fonts: ... */' src/index.css`). All failed with "invalid expression" because `parseSedExpression()` only handles `s` (substitute), `d` (delete), and `p` (print). The `i` (insert before line), `a` (append after line), and `c` (change/replace line) commands are not implemented. 120B burned 16 tool calls trying different sed syntax variations before discovering the `replace` command as a workaround.
**Where:** `apps/ide/src/lib/shell/commands/sed.ts` — `parseSedExpression()` function
**Implementation:** Add three new operation types to the parser and executor:
- `i\text` — insert text before addressed line. Split lines array, splice new line at index.
- `a\text` — append text after addressed line. Same splice, index+1.
- `c\text` — replace addressed line(s) with text.
All three are array operations on the existing `lines` split — same pattern as the existing `delete` handler but in reverse.
**Scope:** ~40-50 lines. New cases in parseSedExpression + applySedOperations switch.
**Phase:** Next CC run — directly reduces tool call waste for all models.

### SED-002: sed delimiter collision with semicolons in replacement text
**Source:** GPT-OSS 120B energy drink test (Feb 17)
**Severity:** Medium — silent corruption
**What happened:** 120B tried `sed -i '1s;^;/* @fonts: Orbitron:wght@400;500;600 */\n;' src/index.css` using `;` as delimiter. The replacement text also contains semicolons (font weight values `400;500;600`). `splitByDelimiter()` split on every unescaped `;`, so the replacement got chopped at `wght@400` — the `;500;600` was parsed as flags/garbage. No model will think to escape semicolons inside font weight strings.
**Where:** `apps/ide/src/lib/shell/commands/sed.ts` — `splitByDelimiter()` / `parseSubstitute()`
**Implementation:** When using non-standard delimiters, `splitByDelimiter` should stop after finding exactly 3 parts (pattern, replacement, flags). Currently it splits greedily on every unescaped delimiter occurrence. Fix: after collecting 3 parts, treat the rest as literal content of the flags field (or reject if unexpected content remains).
**Scope:** ~10 lines in splitByDelimiter.
**Phase:** Same CC run as SED-001.

### GATE-001: Detect freestyle CSS classes in index.css
**Source:** MiniMax M2 energy drink test (Feb 17)
**Severity:** High — architectural anti-pattern
**What happened:** M2 appended 7 custom CSS classes (`.electric-glow`, `.hero-gradient`, `.animate-surge`, `.animate-pulse-fast`, `.animate-bounce-fast`, `.electric-border`, `.grid-pattern`) plus 3 `@keyframes` blocks directly to src/index.css. This bypasses the theme system — hardcoded text-shadow distances, OKLCH values in gradients, fixed grid sizes don't respond to theme changes. Same "zombie state" anti-pattern as the Kanban session where Ralph freestyled CSS instead of using theme commands.
**Where:** `apps/ide/src/lib/ralph/gates.ts` — new gate or skill warning
**Implementation:** After build, scan src/index.css for class selectors (`.classname {`) that aren't part of the theme scaffold (`:root`, `.dark`, `body`, `*`). If found, warn: "Custom CSS classes in index.css bypass the theme system. Use Tailwind utilities, theme extend, or component-level styles instead." Could be a soft gate (warning) initially, hard gate later.
**Scope:** ~20 lines. Regex scan of index.css content.
**Phase:** Anti-slop gates

### GATE-002: Monolith App.tsx detection — enforce section decomposition
**Source:** MiniMax M2 energy drink test (Feb 17)
**Severity:** Medium — blocks iterative refinement
**What happened:** M2 wrote 4,363 bytes in a single App.tsx with hero, flavor grid, and CTA all inline. Compare to 120B which correctly decomposed into `src/sections/HeroSection.tsx`, `src/sections/FlavorGrid.tsx`, `src/sections/CtaSection.tsx`. Monolith means: if CTA needs fixing Ralph must rewrite entire file, quality gates can't check individual sections, continuation runs risk regressing working sections.
**Where:** `apps/ide/src/lib/ralph/gates.ts` — new gate
**Implementation:** If App.tsx exceeds a threshold (80 lines or ~2KB) AND task mentions multiple sections/areas, flag for decomposition: "App.tsx contains multiple sections inline. Split into src/sections/ or src/components/ for independent iteration." Check against task.md for keywords like "hero," "grid," "CTA," "section" to determine if decomposition was expected.
**Scope:** ~25 lines. Line count + keyword matching.
**Phase:** Anti-slop gates

### PREVIEW-001: Preview command doesn't surface build error details
**Source:** MiniMax M2 energy drink test (Feb 17)
**Severity:** High — model can't debug what it can't see
**What happened:** `preview` returned `✓ Theme ✓ Structure ✗ Render` but didn't include the actual error (`No matching export "Lightning" from "lucide-react"`). The esbuild error was visible in browser console (printed 10+ times across builds #7-#17) but the model never acted on it. Instead it debugged CSS grid-pattern opacity for 15+ tool calls. When even a simplified test component showed ✗ Render, the model concluded it was a "false negative in the preview system" rather than reading the error.
**Where:** `apps/ide/src/lib/ralph/preview.ts` or gate output formatting
**Implementation:** When Render fails, include the first esbuild error in the preview output: `"✗ Render: No matching export 'Lightning' from 'lucide-react' (src/App.tsx:2)"`. Model would have fixed this in 1-2 tool calls instead of 15+.
**Scope:** ~10 lines. Capture esbuild error string, append to preview summary.
**Phase:** Preview providers work (per anti-slop tracker). High priority within that phase.

### MODEL-001: Provider baseUrl routing bug — wrong port for selected model
**Source:** Qwen3 Coder 30B test (Feb 17)
**Severity:** Medium — blocks local model testing
**What happened:** Selected Qwen3 model from LMStudio (port 1234) but requests routed to Ollama (port 11434). Model name was correct in payload (`qwen3-coder-30b-a3b-instruct-1m`) but baseUrl was wrong. Model selector stores model name but uses wrong provider's baseUrl.
**Where:** Provider/model selection state management — likely `apps/ide/src/` state or settings
**Implementation:** When model is selected from a provider's model list, store the provider's baseUrl alongside the model name. Use that stored baseUrl for requests, not a global provider URL.
**Scope:** TBD — need to trace the model selector → request path.
**Phase:** Bug fix — should be addressed before next local model testing round.

### DX-004: `replace` command — models forget filepath argument
**Source:** GPT-OSS 120B + MiniMax M2 energy drink tests (Feb 17)
**Severity:** Low — wastes 1-2 tool calls per session
**What happened:** Both models called `replace "old" "new"` without the filepath as first positional arg. Error message already shows correct usage but models keep making this mistake. M2 tried it twice before falling back to sed/cat.
**Where:** `apps/ide/src/lib/shell/commands/replace.ts` — argument parsing
**Implementation:** Two options: (1) Accept filepath in any position — if 3 args and first two are quoted strings, assume `replace "old" "new" file` ordering. (2) Better error message that emphasizes the file: `"replace: missing file path. Usage: replace <FILE> "old" "new""` with FILE in caps. Option 1 is more ergonomic.
**Scope:** ~15 lines for flexible arg parsing.
**Phase:** Nice-to-have. Quick win.

### MODEL-002: Few-shot tool call examples needed in system prompt
**Source:** GPT-OSS 20B + Nemotron testing (Feb 17)
**Severity:** Medium — smaller models learn from examples, not descriptions
**What happened:** 20B ignored available commands list, attempted `bash -lc`, `sh -lc`, `sed -n`, `printf`, `cat /etc/passwd`. Nemotron sent malformed tool calls with undefined `command` field. Both models treated virtual shell like real Linux despite explicit constraints. Frontier models glance past examples; smaller models use them as literal templates.
**Where:** `apps/ide/src/lib/ralph/prompt.ts` — BASE_SYSTEM_PROMPT
**Implementation:** Add explicit tool call format examples:
```
Example tool calls:
- Read a file: {"command": "cat .ralph/task.md"}
- Create a file: {"command": "cat > src/App.tsx << 'EOF'\n<content>\nEOF"}
- List files: {"command": "ls -la"}
- Write status: {"command": "echo 'complete' > .ralph/status.txt"}
```
Frontier model glances past. 20B model uses as template. Same prompt, different utilization.
**Scope:** ~10 lines added to system prompt.
**Phase:** Skills tightening v2

### MODEL-003: BUILD WORKFLOW checklist in system prompt
**Source:** GPT-OSS 20B energy drink test — plan-then-stop failure (Feb 17)
**Severity:** Medium — prevents completion-without-building
**What happened:** 20B applied a theme preset and stopped, treating theme selection as the deliverable. Never understood that writing React components into src/ IS the actual job. Same failure class as GLM-5 (plan-then-stop).
**Where:** `apps/ide/src/lib/ralph/prompt.ts` — BASE_SYSTEM_PROMPT
**Implementation:** Add 5-line workflow:
```
BUILD WORKFLOW:
1. Read task and origin
2. Pick and apply a theme (theme preset or theme generate)
3. Write source files in src/ (this is the actual work)
4. Run preview to verify
5. Write summary and complete

Step 3 is the job. Everything else supports it.
```
**Scope:** ~8 lines added to system prompt.
**Phase:** Skills tightening v2

### LOOP-001: Defensive null checking for malformed tool calls
**Source:** Nemotron testing (Feb 17)
**Severity:** High — crashes loop
**What happened:** Nemotron sent tool calls with undefined `command` field. Crashed with `Cannot read property 'includes' of undefined` in loop.ts displayCmd formatting.
**Where:** `apps/ide/src/lib/ralph/loop.ts`
**Implementation:** Already fixed with optional chaining: `args.command?.includes('<<')` and validation `if (!args.command) return { exitCode: 1, ... }`
**Scope:** ~5 lines.
**Phase:** ✅ Fixed (Feb 17)

### LOOP-002: Empty LLM response treated as valid completion
**Source:** GLM-5 energy drink continuation test (Feb 20)
**Severity:** High — silent no-op passes all gates
**What happened:** GLM-5 returned `finish_reason: stop` with 0 completion tokens and empty content string. `loop.ts:704-722` logic sees "no tool calls + stop" and treats it as intentional completion. Quality gates pass because the previous build is still cached (`[Build] Cache hit`). Previous task's `.ralph/summary.md` is presented as if it's the current result. Reflection call also fails — same empty response, `JSON.parse("")` throws. User sees a confident summary of work that never happened on this iteration.
**Where:** `apps/ide/src/lib/ralph/loop.ts` — lines ~704-722 (the "no tool_calls + stop" branch)
**Implementation:** Before treating stop-without-tools as complete, check: if `content` is empty/whitespace OR `completion_tokens === 0`, this is a failed generation, not an intentional completion. Retry (up to 2 attempts with backoff), then write error to `.ralph/feedback.md`: `"LLM returned empty response — possible provider issue. Retried N times."` Also: skip reflection call if the main loop produced an empty response.
**Related:** LLM API 3.2 §9 (Empty & Malformed Response Recovery) designs the full solution. This is the minimal guard that should exist now.
**Scope:** ~15-20 lines in loop.ts.
**Phase:** Next CC run — prevents silent failures across all models/providers.

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
| LOOP-001 | Malformed tool calls crash loop (undefined command field) | Hotfix (null check) | 2026-02-17 |

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
| Nice-to-have | TH-011, TH-013, TH-014, TH-015, TH-016 | Pattern alias transparency, batch extend, mood alias errors, extend output, theme preview |
| Next CC run | TH-017, TH-018 | theme remix command + 8 new presets (creative DNA) |
| Skills tightening v2 | DX-001 | Stack documentation for Ralph |
| Preview providers | DX-002 | Console.log capture in snapshot |
| Mega plan | UX-001, DX-003 | sed implementation solves replace friction |
| Next CC run | SED-001, SED-002 | Virtual sed insert/append/change + delimiter fix |
| Anti-slop gates | RALPH-006, RALPH-007, GATE-001, GATE-002 | Fabrication detection, freestyle CSS, monolith detection |
| Preview providers | PREVIEW-001 | Surface build errors in preview output |
| Bug fix | MODEL-001 | Provider baseUrl routing (blocks local model testing) |
| Skills tightening v2 | MODEL-002, MODEL-003 | Few-shot examples + BUILD WORKFLOW in system prompt |
| Nice-to-have | DX-004 | Replace command flexible arg ordering |
| Next CC run | LOOP-002 | Empty response guard — prevents silent no-op completions |
