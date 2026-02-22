# Wiggum ESLint Integration — Full System Trace

> How a real ESLint setup threads through the harness, Toolkit 2.0, and LLM API 3.2.
> Not just "lint becomes a command" — how it changes the shape of every layer.

---

## THE CURRENT STATE (What We're Replacing)

### What gates.ts does today

`gates.ts` runs 9 quality gates when Ralph marks "complete." One of them — `noHardcodedColorsGate` — is a hand-rolled linter that doesn't know it's a linter:

```
color-gate.ts (80 LOC)
├── TW_COLOR_RE   → regex for text-red-500, bg-lime-400, etc.
├── RAW_COLOR_RE  → regex for oklch(), hsl(), rgb()
├── HEX_RE        → regex for #hex values
└── scanDir()     → recursive walk of src/**/*.{ts,tsx}
    └── runs all 3 regexes against file content as flat strings
```

**Problems with this approach:**

1. **No AST** — catches `#fff` in comments, variable names, strings that aren't colors
2. **No scope** — can't distinguish `color="#fff"` (JSX prop, violation) from `// #fff reference` (comment, harmless)
3. **Not reusable** — locked inside Wiggum's gate runner, dies when the project exports
4. **Not proactive** — Ralph only discovers violations after claiming "done" and getting bounced
5. **One concern per gate** — adding placeholder detection, raw HTML checks, file size limits means 3 more hand-rolled scanners

### What the system prompt does today

Rules 2 and 6 from `BASE_SYSTEM_PROMPT` in `loop.ts`:

```
2. **Use @wiggum/stack** — NEVER write raw `<button>`, `<input>`, or `<div onClick>`.
6. **Max 200 lines per file** — Split into sections/ and components/.
```

These are prompt-only — pure suggestion. No enforcement. Ralph ignores them regularly.

### What we proposed but haven't built

From the previous session's synthesis:

- `uses-stack-components` gate — scan .tsx for raw HTML elements
- `no-placeholder-content` gate — regex for "Lorem ipsum", "Item 1", "Your * here"
- `max-file-size` gate — count lines per file

All three would be more hand-rolled regex scanners added to gates.ts. Same problems as the color gate.

---

## THE ARCHITECTURE — THREE CLEAN LAYERS

After ESLint integration, enforcement separates into three layers with zero overlap:

```
Layer 1 — ACCESS CONTROL (write-guard.ts)
  Where can Ralph write? What extensions? What content is blocked at write time?
  Hard walls. Prevent bad files from existing.
  → UNCHANGED by ESLint

Layer 2 — SOURCE QUALITY (@wiggum/eslint-rules + browser-linter.ts)
  Does the source code follow the design system contract?
  AST-aware. Runs as shell command AND as quality gate.
  Reusable outside Wiggum. Travels with exported projects.
  → NEW — replaces color-gate.ts + proposed source gates

Layer 3 — OUTPUT VALIDATION (gates.ts + visual-review.ts)
  Does the built artifact work? Does the rendered result look right?
  Build success, runtime errors, CSS theme completeness, DOM checks.
  Needs iframe, build pipeline, rendered DOM. Only Wiggum can do these.
  → SIMPLIFIED — source checks removed, focuses on what only gates can do
```

### Floor, Guidance, Ceiling

ESLint is the **floor** — the minimum contract. It blocks violations deterministically. It does not replace the other quality layers:

```
ESLint     = floor    (minimum contract, deterministic, blocks violations)
Skills     = guidance (compositional patterns, searchable, advisory)
Gumdrops   = recipes  (layout composition, structural patterns)
Visual Rev = ceiling  (aesthetic quality, rendered output, subjective)
```

ESLint prevents `<button>` from reaching the build. It does not ensure the `<Button>` is well-placed, well-sized, or part of a coherent layout. That's what skills, gumdrops, and Visual Review handle. Linting shapes input; visual review validates output.

---

## LAYER 2 DEEP DIVE — THE ESLINT PACKAGE

### Package Structure

```
packages/eslint-rules/               ← new monorepo package
├── src/
│   ├── rules/
│   │   ├── no-hardcoded-colors.ts       ← AST-aware, replaces regex gate
│   │   ├── no-raw-html-elements.ts      ← checks JSX against @wiggum/stack
│   │   ├── no-placeholder-content.ts    ← string literals + JSX text
│   │   ├── no-placeholder-comments.ts   ← Shakespeare's pattern, adapted
│   │   └── require-css-variables.ts     ← inline styles must use var()
│   ├── configs/
│   │   └── recommended.ts               ← default severity config
│   └── index.ts                          ← exports rules + configs
├── package.json
└── tsconfig.json

apps/ide/src/lib/lint/                ← IDE integration
├── browser-linter.ts                 ← wraps eslint-linter-browserify
├── lint-command.ts                   ← Toolkit 2.0 shell command
└── lint-gate.ts                      ← quality gate that calls linter
```

### The Five Rules

**`no-hardcoded-colors`** (replaces color-gate.ts)

AST visitor on JSX attributes, style objects, and template literals. Catches `color="#fff"` but ignores `// #fff` in comments and `const HEX_RE = /#fff/` in non-color contexts.

What it checks:
- JSX attribute values: `<div style={{ color: '#fff' }}>` → error
- Tailwind color classes in className: `className="text-red-500"` → error
- Raw color functions: `oklch(0.5 0.2 250)` in any expression → error

What it skips:
- Comments (AST doesn't visit them as expressions)
- Regex patterns (string context, not color usage)
- Import paths, require strings

**`no-raw-html-elements`** (new — was prompt-only)

AST visitor on JSX opening elements. Checks element name against a blocklist of HTML elements that have @wiggum/stack equivalents.

```typescript
// Simplified concept
const STACK_REPLACEMENTS: Record<string, string> = {
  'button': 'Button',
  'input': 'Input',
  'select': 'Select',
  'textarea': 'Textarea',
  'a': 'Link (or Button with asChild)',
  'table': 'Table',
  'dialog': 'Dialog',
  'label': 'Label',
}

// Visitor: JSXOpeningElement
// If element.name is lowercase AND in blocklist → error
// Message: "Use <Button> from @wiggum/stack instead of <button>"
```

Why AST matters: can verify that `<Button>` is actually imported from `@wiggum/stack`, not a local component named Button. The visitor checks the import declarations in scope.

**`no-placeholder-content`** (new — was prompt-only)

AST visitor on JSX text children and string literal prop values. Catches generic AI placeholder text.

Patterns detected:
- `"Lorem ipsum"` and variants
- `"Item 1"`, `"Item 2"`, etc. (numbered placeholders)
- `"Your [noun] here"` patterns
- `"Description of [noun]"` patterns
- `"Flavor 1"`, `"Feature 1"` (numbered generic labels)

Why AST matters: only fires on JSX children and prop values. Won't false-positive on variable names like `const itemCount` or test descriptions.

**`no-placeholder-comments`** (adapted from Shakespeare)

AST visitor on comments. Catches AI-generated "would-be" comments that signal incomplete implementation.

Patterns: `"In a real application"`, `"TODO: implement"`, `"Replace with actual"`, `"Add your * here"`, `"This would normally"`.

**`require-css-variables`** (new)

AST visitor on JSX `style` attribute objects. Any property that sets a color value must use `var(--token)` syntax, not a literal value.

```tsx
// ❌ Error
<div style={{ backgroundColor: 'oklch(0.5 0.2 250)' }}>

// ✅ OK
<div style={{ backgroundColor: 'var(--primary)' }}>
```

### Rule Taxonomy

Not all rules carry equal weight. Classification prevents over-enforcement:

**Category A — Shape-Enforcing (severity: error, blocks completion)**

These are the design system contract. Gate rejects if any fire.

- `wiggum/no-hardcoded-colors` — tokens only
- `wiggum/no-raw-html-elements` — @wiggum/stack components only
- `wiggum/require-css-variables` — var() in inline styles
- `max-lines` (built-in) — 200 line cap per file

**Category B — Slop Detection (severity: error, blocks completion)**

These catch AI-generated filler that signals incomplete work.

- `wiggum/no-placeholder-content` — "Lorem ipsum", "Item 1"
- `wiggum/no-placeholder-comments` — "In a real application…"

**Category C — Advisory (severity: warning, does NOT block)**

Surfaces in lint output but the gate ignores warnings. For refinement, not enforcement.

- Naming conventions
- Import ordering suggestions
- Optional accessibility hints

**No autofix rules in Phase 1.** Auto-modifying Ralph's code behind his back causes disorientation — he reads a file and it doesn't match what he wrote. Autofix can be added later for cases where the correct replacement is deterministic and the confusion cost is low (e.g., auto-adding a missing `from '@wiggum/stack'` import).

### Browser Runtime

```typescript
// browser-linter.ts
import { Linter } from 'eslint-linter-browserify'
import { rules, configs } from '@wiggum/eslint-rules'

const linter = new Linter()

// Register custom rules once at module load
for (const [name, rule] of Object.entries(rules)) {
  linter.defineRule(`wiggum/${name}`, rule)
}

export interface LintResult {
  file: string
  messages: Linter.LintMessage[]
  errorCount: number
  warningCount: number
}

export function lintFile(filename: string, source: string): LintResult {
  const messages = linter.verify(source, {
    rules: configs.recommended.rules,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  })

  return {
    file: filename,
    messages,
    errorCount: messages.filter(m => m.severity === 2).length,
    warningCount: messages.filter(m => m.severity === 1).length,
  }
}

export function lintFiles(
  files: Array<{ path: string; source: string }>
): LintResult[] {
  return files.map(f => lintFile(f.path, f.source))
}
```

### What Gets Deleted

| Current Code | Fate |
|---|---|
| `color-gate.ts` (80 LOC) | **Deleted.** Replaced by `wiggum/no-hardcoded-colors` rule |
| `TW_COLOR_RE`, `RAW_COLOR_RE`, `HEX_RE` regexes | **Deleted.** AST visitors replace regex matching |
| `scanDir()` recursive file walker | **Deleted.** `lint-gate.ts` handles file discovery for all rules |
| `css-no-tailwind-directives` gate | **Deleted.** Write-guard already blocks @tailwind at write time. Redundant. |
| `noHardcodedColorsGate` import in gates.ts | **Replaced** with `sourceLintGate` import |

### What Gets Simplified in gates.ts

```typescript
// BEFORE: 9 gates, one is a hand-rolled linter
export const QUALITY_GATES: QualityGate[] = [
  /* 1 */ appExists,
  /* 2 */ cssNoTailwindDirectives,  // ← redundant with write-guard, DELETE
  /* 3 */ cssThemeComplete,
  /* 4 */ noHardcodedColorsGate,    // ← hand-rolled linter, REPLACE
  /* 5 */ buildSucceeds,
  /* 6 */ appHasContent,
  /* 7 */ hasSummary,
  /* 8 */ runtimeErrors,
  /* 9 */ consoleCapture,
  /* 10*/ renderedStructure,
]

// AFTER: 9 gates, cleaner concerns
export const QUALITY_GATES: QualityGate[] = [
  /* 1 */ appExists,
  /* 2 */ cssThemeComplete,
  /* 3 */ sourceLintGate,            // ← NEW: one gate, all source rules
  /* 4 */ buildSucceeds,
  /* 5 */ appHasContent,             // relaxed — lint handles component checks
  /* 6 */ hasSummary,
  /* 7 */ runtimeErrors,
  /* 8 */ consoleCapture,
  /* 9 */ renderedStructure,
]
```

The new `sourceLintGate`:

```typescript
// lint-gate.ts
import { lintFiles, type LintResult } from '../lint/browser-linter'

export const sourceLintGate: QualityGate = {
  name: 'source-quality',
  description: 'Source files must pass lint rules (colors, components, placeholders)',
  check: async (fs, cwd) => {
    // Discover all .tsx/.ts files in src/
    const files = await globSourceFiles(fs, `${cwd}/src`)

    // Read file contents
    const sources: Array<{ path: string; source: string }> = []
    for (const file of files) {
      const content = await readFile(fs, file)
      if (content) {
        sources.push({ path: file.replace(`${cwd}/`, ''), source: content })
      }
    }

    // Run all lint rules at once
    const results = lintFiles(sources)
    const errors = results.flatMap(r =>
      r.messages
        .filter(m => m.severity === 2)
        .map(m => ({ file: r.file, ...m }))
    )

    if (errors.length > 0) {
      const feedback = formatLintFeedback(errors)
      return { pass: false, feedback }
    }
    return { pass: true }
  },
}

function formatLintFeedback(
  errors: Array<{ file: string; line: number; column: number; ruleId: string | null; message: string }>
): string {
  // Group by rule for actionable feedback
  const byRule = new Map<string, typeof errors>()
  for (const e of errors) {
    const rule = e.ruleId ?? 'unknown'
    if (!byRule.has(rule)) byRule.set(rule, [])
    byRule.get(rule)!.push(e)
  }

  const lines: string[] = ['Source quality issues found:\n']
  for (const [rule, ruleErrors] of byRule) {
    lines.push(`**${rule}** (${ruleErrors.length} violation${ruleErrors.length > 1 ? 's' : ''})`)
    // Show first 3 per rule, summarize rest
    const shown = ruleErrors.slice(0, 3)
    const remaining = ruleErrors.length - shown.length
    for (const e of shown) {
      lines.push(`  ${e.file}:${e.line}:${e.column} — ${e.message}`)
    }
    if (remaining > 0) {
      lines.push(`  ...and ${remaining} more`)
    }
    lines.push('')
  }

  lines.push('Run `lint` to see full details. Fix violations and mark complete again.')
  return lines.join('\n')
}
```

**Key change:** One gate replaces `noHardcodedColorsGate` + the three proposed new gates. Add a rule to `@wiggum/eslint-rules`, it automatically runs through this single gate. No gate code changes needed.

---

## TOOLKIT 2.0 — LINT AS A TYPED TOOL

### The LintCommand

`lint` becomes a promoted command in the Toolkit 2.0 architecture — a command with a Zod schema that serves as both a shell string and a discrete typed tool.

```typescript
// src/lib/shell/commands/lint.ts

import { z } from 'zod'
import type { ShellCommand, ShellCommandResult } from '../types'
import { lintFiles, type LintResult } from '../../lint/browser-linter'

const LintArgsSchema = z.object({
  files: z.array(z.string()).optional()
    .describe('Specific files to lint. Defaults to src/**/*.{ts,tsx}'),
  rule: z.string().optional()
    .describe('Run a single rule only (e.g., "wiggum/no-hardcoded-colors")'),
  format: z.enum(['human', 'json']).default('human')
    .describe('Output format'),
})

type LintArgs = z.infer<typeof LintArgsSchema>

export class LintCommand implements ShellCommand<LintArgs> {
  name = 'lint'
  description = 'Check source files against design system rules'
  usage = 'lint [files...] [--rule <name>] [--format human|json]'
  argsSchema = LintArgsSchema

  examples = [
    'lint',                                    // lint all src files
    'lint src/App.tsx',                        // lint one file
    'lint --rule wiggum/no-hardcoded-colors',  // run one rule
    'lint src/sections/',                      // lint a directory
  ]

  async execute(args: LintArgs, cwd: string): Promise<ShellCommandResult> {
    // ... discover files, read from fs, call lintFiles()
    // ... format output based on args.format
  }

  parseCliArgs(args: string[]): unknown {
    // Parse: lint [files...] [--rule name] [--format fmt]
    const result: Record<string, unknown> = {}
    const files: string[] = []

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--rule' && args[i + 1]) {
        result.rule = args[++i]
      } else if (args[i] === '--format' && args[i + 1]) {
        result.format = args[++i]
      } else {
        files.push(args[i])
      }
    }

    if (files.length > 0) result.files = files
    return result
  }
}
```

### What the LLM Sees

After Toolkit 2.0 registration, Ralph's tool list includes:

```json
{
  "name": "lint",
  "description": "Check source files against design system rules",
  "parameters": {
    "type": "object",
    "properties": {
      "files": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Specific files to lint. Defaults to src/**/*.{ts,tsx}"
      },
      "rule": {
        "type": "string",
        "description": "Run a single rule only"
      },
      "format": {
        "type": "string",
        "enum": ["human", "json"],
        "default": "human"
      }
    }
  }
}
```

Ralph can call it two ways:
- **Discrete tool:** `{ tool: "lint", args: { files: ["src/App.tsx"] } }` — Zod validates
- **Shell string:** `lint src/App.tsx` — routed through parseCliArgs → Zod validates → execute

Both paths produce the same structured output.

### Structured Error Output (Toolkit 2.0 Pattern)

When Ralph calls `lint` with bad args:

```json
{
  "error": "invalid_arguments",
  "command": "lint",
  "issues": [
    { "path": "rule", "code": "invalid_string", "message": "Rule 'wiggum/doesnt-exist' not found" }
  ],
  "usage": "lint [files...] [--rule <name>] [--format human|json]",
  "examples": ["lint", "lint src/App.tsx", "lint --rule wiggum/no-hardcoded-colors"]
}
```

Deterministic recovery. Not "parse this English error message."

### The Proactive Self-Check Pattern

This is the big behavioral change. Currently Ralph can only discover source violations after claiming "done" and getting bounced by the gate. With `lint` as a tool, Ralph can self-check mid-build:

```
Iteration 3:
  Ralph writes src/sections/Hero.tsx
  Ralph writes src/sections/Features.tsx
  Ralph calls: lint src/sections/
  ↓
  Output: "wiggum/no-raw-html-elements: Use <Button> from @wiggum/stack instead of <button>
           at Features.tsx:24:10"
  ↓
  Ralph fixes Features.tsx immediately
  Ralph calls: lint src/sections/Features.tsx  (verify fix)
  ↓
  Output: "✓ 1 file, 0 errors, 0 warnings"
  ↓
  Ralph continues building (never hits the gate failure)
```

The baker tastes their own work. Currently the baker only finds out the bread is burnt when the customer sends it back.

### Auto-Lint on File Write — The Default Path

Relying on Ralph to *remember* to call `lint` is the wrong default. Lint should fire automatically when a `.ts/.tsx` file is written. The write-guard already intercepts every write — after the guard passes, fire the linter on the written file and append violations to the tool result:

```
Ralph: { tool: "write", args: { path: "src/Hero.tsx", content: "..." } }
  ↓
write-guard: path allowed, extension allowed → PASS
  ↓
fs.writeFile() → success
  ↓
auto-lint: lintFile("src/Hero.tsx", content) → 2 errors
  ↓
Tool result: "Wrote src/Hero.tsx (142 lines)

  ⚠ Lint: 2 errors
  wiggum/no-raw-html-elements: Use <Button> instead of <button> (line 24)
  wiggum/no-hardcoded-colors: Use var(--primary) instead of #1a1a2e (line 67)"
```

Ralph sees violations *in the write response*. Zero extra iterations, zero extra tool calls. The `lint` command still exists for targeted debugging, but auto-lint is the default.

**Where it lives:** The Toolkit 2.0 dispatch layer (`buildRalphTools`), not in the write command itself. The dispatch layer already wraps tool results for truncation and observability. Adding lint-on-write there keeps commands clean and the integration centralized:

```typescript
// In buildRalphTools() dispatch wrapper
dispatchers.set('write', async (args: any) => {
  const result = await executor.execute(`cat > ${args.path} << 'EOF'\n${args.content}\nEOF`)
  const output = result.stdout || result.stderr

  // Auto-lint if it's a source file
  if (args.path.match(/\.tsx?$/) && args.path.startsWith('src/')) {
    const lintResult = lintFile(args.path, args.content)
    if (lintResult.errorCount > 0) {
      const summary = formatCompactLint(lintResult) // max 5 lines
      return `${output}\n\n${summary}`
    }
  }

  return output
})
```

**Batch write noise control:** When Ralph writes 8 files in sequence, we don't want 8 separate lint reports cluttering context. Auto-lint output is compact — count + first violation per rule + "run `lint` for full details" if there are many. Full detail is for the `lint` command.

### System Prompt Update

Add `lint` to the workflow section and anti-slop checklist:

```
## Workflow — How Experts Build

1. **Understand**: Read the task and any feedback
2. **Research**: Search skills for relevant patterns
3. **Commit**: Write your design Direction in .ralph/plan.md
4. **Theme**: Run `theme preset <n> --apply`
5. **Build**: Implement sections and components, one file at a time
6. **Check**: Run `lint` after writing each file to catch issues early  ← NEW
7. **Verify**: Run `preview` to check build and rendered output
8. **Complete**: Write .ralph/summary.md, then mark status complete
```

And update the anti-slop checklist:

```
### Anti-Slop Checklist

Before marking complete, verify:
- [ ] `lint` passes with 0 errors (run it — don't assume)          ← NEW
- [ ] Could someone guess the project's PURPOSE from the design alone?
- [ ] Is the typography a deliberate choice, not a default?
...
```

### Lint in the Promoted Commands Table

In Toolkit 2.0 §9, `lint` joins the promoted list:

| Command | Why Promote | Discrete Tool Schema |
|---------|-------------|---------------------|
| **grep** | 3 modes invisible in string form | `{ mode, pattern/query, path?, flags? }` |
| **replace** | Exact string matching | `{ file, old, new }` |
| **theme** | Complex subcommands | `{ subcommand, preset?, mood?, apply? }` |
| **preview** | Action-based | `{ action }` |
| **write** | #1 operation | `{ path, content }` |
| **lint** | Structured violations, proactive checking | `{ files?, rule?, format? }` |
| **build** | Simple trigger | `{}` |
| **git** | Complex subcommands | `{ subcommand, args... }` |
| **find** | Path + pattern combo | `{ path?, name?, type? }` |
| **sed** | Regex replacement | `{ file, pattern, replacement }` |

---

## LLM API 3.2 — HOW LINT BECOMES SMARTER

ESLint isn't just a tool Ralph calls. It produces structured data that flows through LLM API 3.2's intelligence layer in four specific ways.

### 1. Tool Output Truncation (§8)

LLM API 3.2 introduces smart tool output truncation — when a tool result exceeds a threshold, it gets trimmed with semantic awareness and the full output saved to `.ralph/tmp/`.

Lint output can be verbose. 15 files × 3 violations each = 45 error messages. Without truncation, that's ~2000 tokens of tool result eating into Ralph's context budget.

The truncation layer (which lives between tool execution and message construction) handles this:

```typescript
// In the tool dispatch layer (Toolkit 2.0's buildRalphTools)
function handleToolResult(
  toolName: string,
  result: string,
  maxTokenBudget: number
): string {
  const estimated = estimateTokens(result)
  if (estimated <= maxTokenBudget) return result

  // Smart truncation: show first 60%, last 40%
  const truncated = truncateSmartly(result, maxLines)

  // Save full output for Ralph to grep later
  const savedPath = saveToRalphTmp(result, toolName)

  return `${truncated}\n\n[Output truncated — ${lines} lines. Full: ${savedPath}]`
}
```

For lint specifically, the truncation should be rule-aware — group by rule, show 2-3 examples per rule, summarize the rest. This is more useful than generic head/tail truncation:

```typescript
// lint-specific truncation (in lint-command.ts output formatting)
function formatLintForModel(results: LintResult[], maxLines: number): string {
  const errors = results.flatMap(r => r.messages.filter(m => m.severity === 2))
  if (errors.length === 0) return '✓ All files pass'

  // Group by ruleId
  const byRule = groupBy(errors, e => e.ruleId ?? 'unknown')

  const lines: string[] = [`${errors.length} error(s) across ${results.length} file(s):\n`]

  for (const [rule, ruleErrors] of byRule) {
    lines.push(`${rule} (${ruleErrors.length}):`)
    // Always show first 2 — enough for the model to understand the pattern
    for (const e of ruleErrors.slice(0, 2)) {
      lines.push(`  ${e.file}:${e.line} — ${e.message}`)
    }
    if (ruleErrors.length > 2) {
      lines.push(`  ...+${ruleErrors.length - 2} more`)
    }
  }

  return lines.join('\n')
}
```

**Why this matters for API 3.2:** The tool output truncation budget is informed by the context preflight. If Ralph's context is 80% full, the truncation is more aggressive. If there's plenty of headroom, show more detail. The preflight result feeds into the truncation budget calculation.

### 2. Context Preflight Awareness (§13)

LLM API 3.2's `preflightCheck()` estimates token count before sending. Lint feedback goes into `.ralph/feedback.md`, which becomes part of the next iteration's user prompt.

The connection:

```
Gate fails (lint violations found)
  ↓
generateGateFeedback() writes to .ralph/feedback.md
  ↓
Next iteration: loop.ts builds userPrompt including feedback
  ↓
preflightCheck() estimates total tokens: system + user + feedback
  ↓
If feedback is huge (50 violations), preflight warns "at 85% of context"
  ↓
Loop can trim feedback to top-N violations before sending
```

Without API 3.2, this trim doesn't happen. The full 50-violation feedback goes into the prompt, potentially pushing Ralph into context overflow where the model silently degrades. With API 3.2, the preflight catches it.

**Implementation pattern:**

```typescript
// In loop.ts, when building the user prompt for next iteration
const feedback = state.feedback || '(none)'

// [3.2] Budget-aware feedback trimming
const preflight = preflightCheck(provider.model, [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: userPromptWithFeedback },
])

if (!preflight.ok || preflight.budgetRemaining < MINIMUM_OUTPUT_BUDGET) {
  // Trim feedback to keep essential info
  const trimmedFeedback = trimLintFeedback(feedback, preflight.budgetRemaining)
  // Rebuild prompt with trimmed feedback
}
```

The `trimLintFeedback` function knows lint output structure — it keeps 1 example per rule and drops the rest, preserving the pattern recognition the model needs while staying within budget.

### 3. Lint Oscillation Control (extends §13 stall detection)

LLM API 3.2 computes a `toolCallSignature` — a deterministic hash of all tool calls in a response. If Ralph produces the same signature twice in a row, the consumer detects a spin. But lint creates failure modes that `toolCallSignature` alone won't catch.

**Definitions:**

- **Progress** — a lint run shows progress if total error count decreases, or a specific `(file, ruleId)` violation count decreases, or the set of unique violations shrinks.
- **Strong oscillation** — a `(file, ruleId)` pair appears in ≥3 consecutive iterations without its violation count decreasing, and the file has changed (not just re-reporting a static failure).
- **Flip-flop oscillation** — violation count alternates between two values (e.g., 1 → 2 → 1 → 2), or the same violation reappears at a different location after edits (Ralph "moves" the problem instead of fixing it).
- **Non-actionable failure** — ESLint reports a parse/config error, or the rule is misconfigured. These are infrastructure failures, not agent oscillation. They should never count toward the stall budget.

**Phase 1 implementation (simple counter, ~20 LOC):**

```typescript
// Track (file, ruleId) → consecutive fail count
const lintFailCounts: Map<string, number> = new Map()

function trackLintResult(file: string, ruleIds: string[]): { stall: boolean; key?: string } {
  for (const ruleId of ruleIds) {
    const key = `${file}::${ruleId}`
    const count = (lintFailCounts.get(key) ?? 0) + 1
    lintFailCounts.set(key, count)

    if (count >= 3) {
      return { stall: true, key }
    }
  }

  return { stall: false }
}

// On successful lint (no errors for a file), clear its entries
function clearLintHistory(file: string) {
  for (const key of lintFailCounts.keys()) {
    if (key.startsWith(`${file}::`)) lintFailCounts.delete(key)
  }
}
```

When oscillation is detected, the loop injects targeted feedback: "You've failed `wiggum/no-hardcoded-colors` on Hero.tsx 3 times. Use `grep skill 'theme tokens'` to understand the color system before trying again."

**Phase 2 (when real usage data shows it's needed):** Graduate to the full `.ralph/lint-history.json` model with per-iteration snapshots, messageHash tracking, and range-based flip-flop detection. The append-only history file survives across iterations and enables post-hoc analysis of oscillation patterns. Build this only if the simple counter proves insufficient.

### 4. Structured Response Parsing (§3, §9)

LLM API 3.2's `ParsedToolCall` type has `args: Record<string, unknown>` — already parsed, not raw JSON strings. When Ralph calls the `lint` discrete tool, the args arrive pre-parsed and Zod-validated. No more `JSON.parse(tc.function.arguments)` in the loop.

But the deeper connection is in **malformed tool call recovery**. Currently in `loop.ts`:

```typescript
// CURRENT — ad hoc recovery
try {
  args = JSON.parse(tc.function.arguments || '{}')
  if (!args.command || typeof args.command !== 'string') {
    messages.push({ role: 'tool', content: 'Error: malformed tool call', tool_call_id: tc.id })
    continue
  }
} catch {
  messages.push({ role: 'tool', content: 'Error: could not parse tool arguments', tool_call_id: tc.id })
  continue
}
```

With API 3.2 + Toolkit 2.0, this becomes:

```typescript
// NEW — structured recovery
const response = await client.chat(provider, messages, tools, { signal })

// API 3.2: args already parsed, malformed calls already separated
const { valid, malformed } = validateToolCalls(response.toolCalls)

for (const tc of valid) {
  // Toolkit 2.0: dispatch to the right command, Zod validates
  const result = await dispatch(tc.name, tc.args)
  // ...
}

for (const m of malformed) {
  // Structured error feedback, not English strings
  messages.push({ role: 'tool', tool_call_id: m.id, content: m.message })
}
```

When Ralph calls `{ tool: "lint", args: { files: 42 } }` (wrong type), the error path is:

1. API 3.2 parses `args` from JSON → `{ files: 42 }`
2. Toolkit 2.0 dispatch routes to LintCommand
3. Zod validates: `z.array(z.string())` fails on `42`
4. `structuredError()` returns JSON with the issue, usage, and examples
5. Model gets deterministic recovery data, not an English error message

---

## THE FEEDBACK LOOP — HOW LINT RESULTS FLOW THROUGH THE SYSTEM

### Path Zero: Auto-Lint on Write (Default — No Action Required by Ralph)

```
Ralph writes src/sections/Hero.tsx via write tool
  ↓
Toolkit 2.0 dispatch: write succeeds → auto-lint fires on Hero.tsx
  ↓
browser-linter.ts: lintFile("src/sections/Hero.tsx", content) → 1 error
  ↓
Compact lint summary appended to write tool result:
  "Wrote src/sections/Hero.tsx (87 lines)
   ⚠ Lint: 1 error — wiggum/no-raw-html-elements: Use <Button> (line 24)"
  ↓
Ralph sees violation immediately in write response
  ↓
Ralph fixes Hero.tsx in next tool call (same iteration)
  ↓
Never hits the gate. Zero wasted iterations.
```

This is the primary path. It requires no behavioral change from Ralph — violations surface automatically.

### Path A: Ralph Self-Checks (Proactive — For Targeted Debugging)

```
Ralph writes Hero.tsx
  ↓
Ralph calls: { tool: "lint", args: { files: ["src/sections/Hero.tsx"] } }
  ↓
Toolkit 2.0: Zod validates args → LintCommand.execute()
  ↓
browser-linter.ts: ESLint Linter.verify(source, config) → LintMessage[]
  ↓
LintCommand formats output (human-readable, rule-grouped)
  ↓
API 3.2: tool output truncation if needed (budget-aware)
  ↓
Result goes into messages[] as tool response
  ↓
Ralph reads violations, fixes Hero.tsx, continues building
  ↓
Never hits the gate. No wasted iteration.
```

### Path B: Gate Catches on Completion (Reactive)

```
Ralph writes "complete" to .ralph/status.txt
  ↓
loop.ts: runQualityGates() fires
  ↓
sourceLintGate: discovers all src/**/*.{ts,tsx} files
  ↓
browser-linter.ts: lintFiles(sources) → LintResult[]
  ↓
Gate checks: any errors? → yes → { pass: false, feedback: "..." }
  ↓
generateGateFeedback(): writes .ralph/feedback.md with lint violations
  ↓
handleGateResult(): action = 'retry'
  ↓
Next iteration: userPrompt includes feedback from .ralph/feedback.md
  ↓
API 3.2 preflight: estimates tokens, trims feedback if needed
  ↓
Ralph reads feedback, fixes issues, marks complete again
```

### Path C: Exported Project (Reusable)

```
User exports Wiggum project as standalone React app
  ↓
Export includes eslint.config.js:
  import { configs } from '@wiggum/eslint-rules'
  export default [configs.recommended]
  ↓
Developer runs: npx eslint src/
  ↓
Same rules that governed Ralph now govern the developer
  ↓
"No hardcoded colors" contract survives beyond Wiggum
```

### Path D: Chief References Lint Rules (Conversational)

Chief is conversational — when the user asks "why did my build fail?" or "what's wrong with my code?", Chief can reference lint results by name. The lint rules become a shared vocabulary between Chief, Ralph, and the user:

```
User: "Why does Ralph keep failing on my hero section?"
  ↓
Chief reads .ralph/feedback.md → sees source-quality gate failures
  ↓
Chief explains: "Ralph's Hero.tsx has 3 violations of wiggum/no-hardcoded-colors.
  The theme system requires CSS variables like var(--primary) instead of
  hex values. Run `lint src/sections/Hero.tsx` to see the specifics."
```

Chief doesn't run lint itself — it reads the gate feedback that lint already produced. The rules give Chief precise language instead of vague "there are style issues."

### Per-Project Lint Configuration

Not every project needs the same rules at the same severity. A recipe tracker might legitimately need `bg-red-500` for a spicy-level indicator. The recommended config is the default, but there should be an escape hatch.

**Phase 1:** No per-project config. All projects use `configs.recommended`. This is correct for now — Ralph should learn the design system, not work around it.

**Phase 2 (if needed):** Support a `.ralph/lint-config.json` that overrides specific rules:

```json
{
  "overrides": {
    "wiggum/no-hardcoded-colors": "warn"
  }
}
```

The `sourceLintGate` and `LintCommand` check for this file and merge overrides into the config before running. This is strictly per-project — the user or task description triggers the override, not Ralph deciding to relax rules on his own.

**Never support inline `// eslint-disable` comments.** Ralph would learn to sprinkle them everywhere. The override must be project-level and explicit.

### Deduplication: Auto-Lint vs Gate

Auto-lint on write and the `sourceLintGate` at completion can report the same violations twice — once in the write response, once in the gate feedback. The gate should acknowledge this:

```typescript
// In sourceLintGate, check if auto-lint already reported these
const gateErrors = results.flatMap(r => r.messages.filter(m => m.severity === 2))

if (gateErrors.length > 0) {
  const feedback = formatLintFeedback(gateErrors)
  return {
    pass: false,
    feedback: feedback + '\n\n(These were also reported during file writes. Fix them before marking complete.)',
  }
}
```

The gate feedback is a safety net, not a surprise. If Ralph saw the violations during writes and ignored them, the gate reminds him they're still blocking.

---

## WHAT CHANGES IN THE SYSTEM PROMPT

### Remove from CRITICAL RULES

```diff
 ## CRITICAL RULES — VIOLATIONS BREAK YOUR BUILD

 1. **React only** — Write .tsx files in src/. HTML files are blocked.
 2. **Use @wiggum/stack** — You have 60+ production components.
-   NEVER write raw `<button>`, `<input>`, or `<div onClick>`.
-   That's building furniture when you have a warehouse full of it.
+   The `lint` tool enforces this — raw HTML elements are errors.
 ...
-6. **Max 200 lines per file** — Split into sections/ and components/.
+6. **Max 200 lines per file** — Enforced by `lint`. Split early.
```

The rules still exist in the prompt for guidance, but the language shifts from "NEVER do X" to "X is enforced by lint." Ralph knows violations are caught mechanically, not just suggested.

### Add to Shell Commands section

```
## Shell Commands

- **lint** — Check source files against design system rules.
  Run after writing files to catch issues early.
  `lint` (all files), `lint src/App.tsx` (one file),
  `lint --rule wiggum/no-hardcoded-colors` (one rule)
```

### Add to Completion + Quality Gates section

```
Gates validate:
- Source quality via `lint` — no hardcoded colors, no raw HTML elements,
  no placeholder content (run `lint` before marking complete to avoid bounces)
- src/App.tsx exists with meaningful content
- ...
```

---

## IMPLEMENTATION SEQUENCE

### Phase 1: The Package (estimated 3-4 hours)

Create `packages/eslint-rules/` with the five rules. Test each rule with unit tests (ESLint's `RuleTester`). Export rules and recommended config.

**CC prompt focus:** Rule implementations, test cases, package setup.

### Phase 2: Browser Integration (estimated 2-3 hours)

Create `apps/ide/src/lib/lint/browser-linter.ts`. Wire `eslint-linter-browserify` with custom rules. Create `lint-gate.ts` as the single quality gate. Delete `color-gate.ts`. Update `gates.ts` imports.

**CC prompt focus:** Browser linter wrapper, gate replacement, gate ordering.

### Phase 3: Toolkit 2.0 Command (estimated 1-2 hours)

Create `LintCommand` with Zod schema, examples, parseCliArgs. Register in executor. This depends on Toolkit 2.0 infrastructure being in place, but can be a simple shell command initially (pre-Toolkit 2.0) and upgraded to dual-mode when the Zod infra lands.

**CC prompt focus:** Command class, shell registration, output formatting.

### Phase 3b: Auto-Lint on Write (estimated 1-2 hours)

Wire auto-lint into the Toolkit 2.0 dispatch layer for `write`/`cat > file` results. Compact output format (count + first violation per rule). Batch noise control for sequential writes.

**CC prompt focus:** Dispatch wrapper, compact formatter, changed-file-only scoping.

### Phase 4: System Prompt + Feedback (estimated 1 hour)

Update `BASE_SYSTEM_PROMPT` in `loop.ts`. Add lint to workflow, anti-slop checklist, completion docs. Update `getExplicitFix()` for the new `source-quality` gate name. Add deduplication note in gate feedback.

**CC prompt focus:** Prompt edits, feedback formatting, explicit fix text.

### Phase 5: Oscillation Detection (estimated 1 hour)

Phase 1 oscillation tracker: simple `(file, ruleId) → count` map in the loop. ~20 LOC. Inject targeted guidance when count hits 3. Clear on successful lint pass. Graduate to full `.ralph/lint-history.json` in a later phase only if needed.

**CC prompt focus:** Counter map, stall injection, clearance logic.

### Phase 6: API 3.2 Hooks (when API 3.2 ships)

Wire lint-aware truncation into tool output handler. Add preflight-aware feedback trimming to loop iteration builder.

**CC prompt focus:** Truncation budget, feedback trimming, provider-aware sizing.

---

## PERFORMANCE & FEEDBACK SHAPING

Auto-lint on every write needs to be fast and quiet, not a bottleneck.

**Auto-lint scoping:** Only lint the file that was just written, not the entire project. Full-project lint runs at completion (gate) and on explicit `lint` command. This keeps per-write overhead to one `Linter.verify()` call (~5-10ms for a 200-line file).

**Output grouping:** Lint feedback is grouped by rule, not by file. Rule-first grouping helps the model recognize patterns ("I need to stop using hex colors") rather than treating each file as a separate problem.

**Noise cap:** Show at most K=3 violations per rule in auto-lint and gate feedback summaries. Ralph doesn't need to see 15 instances of the same rule violation — 3 examples establish the pattern, and "...+12 more" signals the scope. Full detail available via `lint --format json` or `lint <path>`.

**Changed-file-only at gate (optimization):** The `sourceLintGate` can check if `.ralph/lint-history.json` exists (Phase 2 oscillation) and skip files that haven't changed since last passing lint. In Phase 1, the gate lints all source files — acceptable because `Linter.verify()` is synchronous and fast.

---

## BUNDLE COST

| Component | Size (minified) | Load Strategy |
|---|---|---|
| `eslint-linter-browserify` + espree parser | ~300-400KB | Lazy — loaded on first `lint` call or gate run |
| `@wiggum/eslint-rules` (5 rules) | ~5-10KB | Bundled with linter |
| Total | ~310-410KB | |

For context: esbuild-wasm is ~2.5MB, LightningFS + isomorphic-git are ~500KB combined. This is a meaningful but non-disqualifying addition (~15% of current tooling bundle). Lazy loading keeps it out of the critical startup path.

---

## SUMMARY — ESLint THROUGH ALL THREE LAYERS

**Toolkit 2.0 gives ESLint better hands.**
`lint` becomes a promoted command with Zod schema. Auto-lint on write surfaces violations immediately — no tool call required. The explicit `lint` command handles targeted debugging. Structured errors enable deterministic recovery. The dual-mode architecture means the same lint infrastructure serves the write hook, the shell command, and the quality gate.

**LLM API 3.2 gives ESLint better awareness.**
Tool output truncation keeps lint results from blowing up context. Preflight checks catch oversized feedback. Oscillation detection (Phase 1: simple counters, Phase 2: full history) identifies stuck-in-a-loop patterns. Structured response parsing eliminates ad-hoc JSON.parse error handling.

**ESLint gives the system a shared contract.**
The same rules that govern Ralph at build time travel with the exported project. Chief can reference rules by name when explaining failures. Other AI tools can adopt `@wiggum/eslint-rules`. The quality contract survives beyond Wiggum's runtime.

Three layers, one source of truth:
- **Write-guard:** where and what can be written (access control)
- **ESLint:** does the source follow the design contract (AST-aware, reusable)
- **Gates:** does the built artifact work and look right (output validation)

No overlap. No gaps. And the middle layer is the one that travels.
