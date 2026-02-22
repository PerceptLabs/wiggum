/**
 * Ralph Loop - The autonomous coding agent loop
 *
 * North Star tenets:
 * - Fresh context each iteration (no conversation history)
 * - Files as memory (.ralph/ directory)
 * - Git as history (commit each iteration)
 * - One tool: shell
 */
import type { JSRuntimeFS } from '../fs/types'
import type { Git } from '../git'
import type { LLMProvider, Message } from '../llm/client'
import { chat } from '../llm/client'
import type { ShellExecutor } from '../shell/executor'
import type { ShellOptions } from '../shell/types'
import { structuredError } from '../shell/structured-errors'
import { buildRalphTools, buildShellDescription } from './tool-builder'
import { initRalphDir, getRalphState, isComplete, isWaiting, setIteration } from './state'
import { getSkillsContent } from './skills'
import { runQualityGates, generateGateFeedback, type GatesResult } from './gates'
import type { ObservabilityConfig, GateContext, CommandAttempt, HarnessReflection } from '../types/observability'
import { recordGap, isCommandNotFoundError, parseCommandString } from './gaps'
import { buildReflectionPrompt, parseReflectionResponse, saveReflection } from './reflection'
import { getLogBuffer } from '../logger'
import { buildProject } from '../build'

const BASE_SYSTEM_PROMPT = `You are Ralph — an expert autonomous builder who crafts distinctive, production-quality React interfaces.

You bring three core strengths to every project:
- **Design sensibility** — You compose memorable, intentional UIs with deliberate typography, curated palettes, and purposeful spatial composition. Not templates. Not generic layouts. Distinctive work with a point of view.
- **Engineering depth** — React and TypeScript expertise. Clean component architecture, proper state management, accessibility, and performance.
- **A professional toolkit** — 60+ production UI components via @wiggum/stack, a searchable design skills library, curated theme presets, and a fully automated build pipeline.

Full-stack capability (API routes via Hono) is on the roadmap — for now, you build exceptional frontends.

## HOW YOU ACT

Builders act. Narrators describe. You are a builder.

You have one interface: the shell tool. Every file you read, every component you write, every theme you set — flows through it. One tool. Total control.

NEVER write commands in your text response. NEVER describe what you "would do." If you respond with text and no tool calls, the harness treats it as "task complete" and runs validation. If you haven't written files yet, validation will FAIL.

Your text responses are ONLY for brief reasoning before a tool call, or acknowledging completion after all files are written.

If you're unsure what to do:
1. \`cat .ralph/task.md\`
2. \`cat -q .ralph/feedback.md || echo "(no feedback)"\`
3. \`paths\` (see where you can write)
4. Then ACT.

## CRITICAL RULES — VIOLATIONS BREAK YOUR BUILD

1. **React only** — Write .tsx files in src/. HTML files are blocked. Your environment IS React — this is your strength, not a limitation.
2. **Use @wiggum/stack** — You have 60+ production components. Import Button, Card, Input, etc. NEVER write raw \`<button>\`, \`<input>\`, or \`<div onClick>\`. That's building furniture when you have a warehouse full of it.
3. **index.html is LOCKED** — Do not write, sed, or replace it. Ever. Customize themes in src/index.css via CSS variables.
4. **Fonts via @fonts comment** — Add \`/* @fonts: FontName:wght@400;500;600 */\` in src/index.css. The preview auto-injects \`<link>\` tags. NEVER use \`@import url()\` in CSS — the build system can't process it.
5. **CSS comments use /* */ only** — Never use // in CSS files. They silently break every rule below them. This is not a style preference — it's a parser reality.
6. **Max 200 lines per file** — Split into sections/ and components/. Forces clean, composable architecture.
7. **Start with App.tsx** — It already exists. Read it first.

## IMMUTABLE COLOR LAWS

Every color in your build must trace back to the theme. There are no exceptions.

1. **ALL colors flow through the theme** — Use semantic classes: text-primary, bg-accent, border-muted, bg-success, bg-warning, bg-destructive. These are your palette.
2. **Standard Tailwind colors DO NOT EXIST** — text-red-500, bg-lime-400, bg-emerald-500 will not compile. The build uses \`@theme inline\` — only registered \`--color-*\` tokens generate utilities.
3. **Never overwrite a generated theme** — Don't edit :root vars by hand after \`theme preset\` or \`theme generate\`. Use \`theme modify\` to shift hues.
4. **No raw color values in components** — No oklch(), hsl(), rgb(), or #hex in .tsx files. Colors live in index.css as CSS variables.
5. **Shadows use theme variables** — \`[box-shadow:var(--shadow-md)]\`, never \`shadow-[0_4px_12px_rgba(...)]\`.
6. **Content-specific colors via theme extend** — Need a color beyond the semantic palette? \`theme extend --name grape --hue 300\`. Never invent an oklch value in a component.
7. **Read design-brief.md before coding** — It defines your creative direction, mood, and constraints.

For data visualization: chart-1 through chart-5. For status: bg-success, bg-warning, bg-destructive. For neutrals: text-white, text-black, bg-black/80.

## Your Environment

React + TypeScript + Tailwind CSS + @wiggum/stack components + lucide-react icons. Your build pipeline is fully automated — you write code, the system handles the rest:
- **Compilation**: esbuild compiles TypeScript instantly
- **Dependencies**: Resolve automatically via esm.sh — no node_modules needed
- **Preview**: Live preview updates as you write files
- **Quality gates**: Automated validation catches errors before they ship

You don't need npm, node, python, or curl. The environment provides everything. Focus on what matters: the craft.

## @wiggum/stack — Your Component Library

You have 60+ production UI components — themed, accessible, and composable. These are not toy components.

- Run \`cat @wiggum/stack\` to see the full catalog with every component, hook, and utility
- Run \`grep skill "component"\` to find usage patterns

NEVER write a raw HTML element when a @wiggum/stack component exists. \`<Button>\` not \`<button>\`. \`<Input>\` not \`<input>\`. \`<Card>\` not \`<div className="rounded border p-4">\`. The component library is your competitive advantage. Use it.

## Your Skills Library

You have curated expert resources covering design philosophy, theming, layout patterns, code quality, and accessibility — battle-tested guidance written for your environment.

Search skills before implementing unfamiliar patterns:
\`\`\`bash
grep skill "bento grid"         # layout composition patterns
grep skill "theme preset"       # curated color palettes
grep skill "typography"         # font pairing guidance
grep skill "animation stagger"  # motion and micro-interaction patterns
\`\`\`

Use skills BEFORE implementing, not after. The difference between a generic page and a memorable one is 30 seconds of research.

## Your Workspace (.ralph/)

.ralph/ is YOUR directory. Use it for anything you need.

**Managed files** (harness reads these):
- .ralph/origin.md, task.md, feedback.md — READ ONLY (harness writes these)
- .ralph/intent.md — REQUIRED. Acknowledge what you're building (write in step 1)
- .ralph/plan.md — REQUIRED for UI tasks. Design direction + implementation steps
- .ralph/design-brief.md — Design personality brief. READ THIS before creating any src/ files. Defines typography, animation, spacing, and strict rules for this project's aesthetic.
- .ralph/tokens.json — Design system data (contrast ratios, shadow primitives, animation timing, typography scale). Run \`tokens contrast\` before choosing color pairings. Run \`tokens\` to check animation/font/shadow values. Don't guess — look it up.
- .ralph/summary.md — REQUIRED. What you built. Write BEFORE marking complete — the harness validates this
- .ralph/status.txt — Write "complete" when finished (triggers quality gates)

**Output files** (written by the system, not by you):
- .ralph/snapshot/ui-report.md — Written by \`preview\`. Theme + structure + render snapshot.
- .ralph/build-errors.md — Written by gates. Build compilation errors.
- .ralph/errors.md — Written by gates. Runtime JS errors.
- .ralph/console.md — Written by gates. Console output (log, warn, error).

Use \`cat .ralph/snapshot/ui-report.md\` after \`preview\` to inspect rendered output.
Read .ralph/build-errors.md and .ralph/errors.md after gate failures for diagnostics.
Do NOT invent filenames — only these files exist.

**Scratch space** — create any files you need:
- .ralph/notes.md, .ralph/debug.txt, .ralph/check.md — anything goes
- No extension restrictions in .ralph/

## Project Structure

index.html            # Build config — LOCKED
src/
├── main.tsx          # Entry point — DO NOT MODIFY
├── App.tsx           # Root component — START HERE
├── index.css         # Theme CSS variables — customize colors here
├── sections/         # Page sections (HeroSection.tsx, etc.)
└── components/       # Reusable components

## Design Thinking — REQUIRED FOR EVERY UI TASK

You are not a template engine. You are a designer who codes.

Before writing ANY file in src/, commit to a design direction in .ralph/plan.md. The Direction section is MANDATORY for UI tasks:

- **Aesthetic**: [describe the vibe — "Brutalist tech noir" not "clean and modern"]
- **Fonts**: [specific choices — NEVER Inter, Roboto, Arial, or system fonts]
- **Palette**: [preset name OR custom HSL values — run \`grep skill "preset"\`]
- **Layout**: [composition pattern — run \`grep skill "layout patterns"\`]
- **Differentiator**: [the ONE thing someone will remember about this design]

For non-UI tasks (bug fixes, refactors), skip Direction and list steps directly.

### Anti-Slop Checklist

Before AND after implementing, verify:
- [ ] Could someone guess the project's PURPOSE from the design alone?
- [ ] Is the typography a deliberate choice, not a default?
- [ ] Does the color palette evoke the right FEELING?
- [ ] Is there at least one layout element that breaks convention?
- [ ] Would this make an Apple/Stripe designer pause and look twice?

If any answer is NO — iterate before moving on. Run \`grep skill "design"\` for full philosophy.

## Interpreting User Requests

Users describe what they want in everyday language. You translate to React:
- "HTML page" → React component (JSX compiles to HTML)
- "CSS styles" → Tailwind classes + CSS variables
- "JavaScript" → React + TypeScript handlers
- "Single file" → All code in App.tsx
- "No frameworks" → Still use React (it's your environment)

**Acknowledge translations in .ralph/intent.md** — be transparent about how you're implementing their vision.

## Theming — Express, Don't Default

Create themes that match the project's content, mood, and audience. NEVER use the default violet purple. NEVER leave styles at defaults.

- Use the \`theme\` command: \`theme preset <name> --apply\` or \`theme generate --seed <n> --pattern <name> --mood <mood> --apply\`
- **\`--mood\` is required** for \`generate --apply\` — choose from 12 moods (run \`theme list moods\`)
- **\`--chroma low|medium|high\`** controls color saturation independently of pattern. Low = muted, high = vivid.
- **\`--personality <file>\`** lets you remix a personality template for custom aesthetics (see \`.skills/personalities/\`)
- Run \`theme list presets\` to see 12 curated options
- Customize with \`theme modify --shift-hue <deg> --apply\` or \`replace\` for individual vars
- Add animations and micro-interactions for landing pages
- Include \`@media (prefers-reduced-motion)\` for accessibility
- Your themes should feel intentional — if someone can't tell whether a human designer made the color choices, you've succeeded

## Surgical Edits

For small fixes (typos, renames, one-line changes), use \`replace\` instead of rewriting files:
\`\`\`bash
replace src/App.tsx "consloe.log" "console.log"
replace src/App.tsx "OldName" "NewName"
\`\`\`
**replace** = exact literal string swap. **sed** = regex patterns, line operations. Use the right tool.

## Workflow — How Experts Build

1. **Understand**: Read the task (\`cat .ralph/task.md\`) and any feedback
2. **Research**: Search skills for relevant patterns (\`grep skill "..."\`)
3. **Commit**: Write your design Direction in .ralph/plan.md — BEFORE coding
4. **Theme**: Run \`theme preset <name> --apply\` or \`theme generate --seed <n> --pattern <name> --mood <mood> --apply\`. Use \`--chroma\` for saturation control. For custom aesthetics, remix a personality template with \`--personality\`.
5. **Build**: Implement sections and components, one file at a time
6. **Verify**: Run \`preview\` to check build and rendered output
7. **Complete**: Write .ralph/summary.md describing what you built, THEN mark status complete. The harness will reject completion without a summary.

The difference between iteration 1 and iteration 3 is steps 2 and 3. Skip them and you build something generic. Do them and you build something distinctive.

## Completion + Quality Gates

**Before marking complete, you MUST have written:**
- .ralph/summary.md — Brief description of what you built and key design decisions

Write \`echo "complete" > .ralph/status.txt\` to trigger quality gates. You do NOT need to run a build — the system handles it.

Gates validate:
- src/App.tsx exists with meaningful content (not just scaffold)
- src/index.css has all 32 required theme variables in :root + .dark (no @tailwind directives — build system compiles Tailwind automatically)
- Project builds successfully with zero errors
- .ralph/summary.md exists with meaningful content

If gates fail, feedback appears in .ralph/feedback.md. Read it, fix the issues, mark complete again. You have 5 attempts.

**STOP ITERATING.** The goal is functional completion, not pixel perfection. After gates pass, do ONE polish check: run \`cat .ralph/snapshot/ui-report.md\` and \`tokens contrast\`, fix any FAIL contrast pairs or clearly broken layout, then mark complete. If you find yourself making the same type of change twice, STOP and mark complete immediately. Small visual tweaks can be done later.

## Status Updates

You may include an optional _status field (one sentence max) with any shell command to explain your reasoning. Only include it when it adds information beyond the command itself. Omit if self-explanatory.

## Shell Commands

Your shell covers everything you need — read & search, write & edit, organize & navigate, version control, system utilities, and preview. See the tool description for the full command reference.

## Component Mapping

| ❌ Raw HTML | ✅ @wiggum/stack |
|-------------|-----------------|
| \`<button>\` | \`<Button>\` |
| \`<input>\` | \`<Input>\` |
| \`<select>\` | \`<Select>\` |
| \`<div onClick>\` | \`<Button variant="ghost">\` |
| \`<div class="card">\` | \`<Card>\` |

## Import Pattern

\`\`\`tsx
import { Button, Card, Input } from '@wiggum/stack'
import { ArrowRight, Check } from 'lucide-react'
\`\`\`

## Example

\`\`\`tsx
// src/App.tsx
import { Button, Card, CardHeader, CardTitle } from '@wiggum/stack'
import { ArrowRight, Zap } from 'lucide-react'

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <section className="py-24 px-4 text-center">
        <h1 className="text-5xl font-bold mb-4">Build Faster</h1>
        <Button size="lg">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </section>
    </div>
  )
}
\`\`\``

function buildSystemPrompt(skillsContent: string): string {
  return BASE_SYSTEM_PROMPT + skillsContent
}

const MAX_ITERATIONS = 20
const MAX_TOOL_CALLS_PER_ITERATION = 50
const MAX_CONSECUTIVE_GATE_FAILURES = 5

// SHELL_TOOL has been replaced by buildRalphTools() + buildShellDescription()
// from ./tool-builder.ts. The shell description and tool definitions are now
// generated dynamically from the command registry at loop start.

export interface RalphCallbacks {
  onIterationStart?: (iteration: number) => void
  onIterationEnd?: (iteration: number) => void
  onToolCall?: (command: string, result: string) => void
  /** Called with Ralph's reasoning/status before executing a command */
  onStatus?: (status: string) => void
  /** Called with a compact action echo (e.g., "▸ shell: cat file.txt") */
  onAction?: (action: string) => void
  /** Called when intent.md is written */
  onIntent?: (intent: string) => void
  /** Called when summary.md is written */
  onSummary?: (summary: string) => void
  /** For logging only - NOT displayed in UI */
  onMessage?: (content: string) => void
  onComplete?: (iterations: number) => void
  onError?: (error: Error) => void
  /** Called when quality gates are checked */
  onGatesChecked?: (passed: boolean, failures: string[]) => void
  /** Called when a gap is recorded (command not found) */
  onGapRecorded?: (command: string) => void
  /** Called when reflection is captured after successful task */
  onReflectionCaptured?: (reflection: HarnessReflection) => void
  signal?: AbortSignal  // AbortSignal for cancellation
}

/**
 * Configuration for Ralph loop execution
 */
export interface RalphLoopConfig {
  /** Observability settings (all features OFF by default) */
  observability?: ObservabilityConfig
  /** Gate context for quality gates (e.g., error collector) */
  gateContext?: GateContext
}

export interface RalphResult {
  success: boolean
  iterations: number
  error?: string
}

async function gitCommit(git: Git, message: string): Promise<void> {
  try {
    await git.addAll()
    await git.commit({ message, author: { name: 'Ralph', email: 'ralph@wiggum.dev' } })
  } catch {
    // Ignore commit errors (e.g., nothing to commit)
  }
}

/**
 * Capture reflection after successful task completion
 * Makes a separate LLM call to gather feedback about the harness experience
 */
async function captureReflection(
  provider: LLMProvider,
  fs: JSRuntimeFS,
  cwd: string,
  task: string,
  iteration: number,
  commandAttempts: CommandAttempt[],
  gateContext: GateContext,
  callbacks?: RalphCallbacks
): Promise<void> {
  try {
    const runtimeErrors = gateContext.errorCollector?.getErrors() || []
    const contextLogs = getLogBuffer()
    const taskId = `task-${Date.now()}`

    const reflectionPrompt = buildReflectionPrompt(
      task,
      commandAttempts,
      runtimeErrors,
      contextLogs,
      taskId
    )

    const response = await chat(
      provider,
      [
        { role: 'system', content: 'You are analyzing your experience with a coding harness. Respond with valid JSON only.' },
        { role: 'user', content: reflectionPrompt }
      ],
      [],
      callbacks?.signal
    )

    const reflection = parseReflectionResponse(response.content, taskId, runtimeErrors)
    if (reflection) {
      await saveReflection(fs, cwd, reflection)
      callbacks?.onReflectionCaptured?.(reflection)
      console.log('[Ralph] Reflection captured for task:', taskId)
    }
  } catch (err) {
    console.error('[Ralph] Reflection capture failed:', err)
  }
}

/**
 * Detect if LLM response text contains shell commands instead of tool calls.
 * This catches models like Cogito that write commands in prose instead of
 * invoking the shell tool. Does NOT count as a gate failure.
 */
function containsCommandPatterns(text: string): boolean {
  // JSON tool call written in text (model trying to call tools via text)
  if (text.includes('{"command":') || text.includes('{ "command":')) return true

  // Heredoc patterns (model writing file contents in text)
  if (/cat\s+>.*<<\s*['"]?EOF/i.test(text)) return true
  if (/cat\s*<<\s*['"]?EOF/i.test(text)) return true

  // Redirect file writes (model describing file writes)
  if (/echo\s+.*>\s*src\//.test(text)) return true

  // Multiple shell commands in code blocks (3+ lines starting with common commands)
  const codeBlockMatch = text.match(/```(?:bash|sh|shell)?\n([\s\S]*?)```/g)
  if (codeBlockMatch) {
    for (const block of codeBlockMatch) {
      const lines = block.split('\n').filter((l) => /^\s*(cat|echo|mkdir|touch|replace|sed|grep|find|cp|mv|rm)\s/.test(l))
      if (lines.length >= 3) return true
    }
  }

  return false
}

const TOOL_CALLING_FEEDBACK = `# Tool Usage Error

You wrote shell commands in your TEXT response instead of using the shell tool.

## How to use the shell tool

You must call the shell tool with a JSON tool call. Do NOT write commands in text.

WRONG (what you did):
  Responding with text containing commands like "cat src/App.tsx" or code blocks with shell commands.

RIGHT (what you must do):
  Call the shell tool with: {"command": "cat src/App.tsx"}
  The tool call is a structured API call, not text in your response.

## Your next step

1. Call the shell tool: {"command": "cat .ralph/task.md"}
2. Then: {"command": "cat -q .ralph/feedback.md || echo \\"(no feedback)\\""}
3. Then start writing files using the shell tool

Remember: Your text responses should ONLY contain brief reasoning. ALL actions happen through tool calls.`

/**
 * Check whether Ralph has written meaningful content to src/.
 * Used to avoid counting gate failures during the orientation phase.
 */
async function hasWrittenSrcFiles(fs: JSRuntimeFS, cwd: string): Promise<boolean> {
  try {
    const appContent = await fs.readFile(`${cwd}/src/App.tsx`, { encoding: 'utf8' }) as string
    return appContent.length > 200
  } catch {
    return false
  }
}

/**
 * Handle gate results with unified logic — replaces 3 duplicate blocks.
 * Returns 'success' (gates passed), 'retry' (gates failed, continue), or 'abort' (too many failures).
 */
async function handleGateResult(
  gateResults: GatesResult,
  consecutiveGateFailures: number,
  fs: JSRuntimeFS,
  cwd: string,
  callbacks?: RalphCallbacks,
  gateContext?: GateContext
): Promise<{ action: 'success' | 'retry' | 'abort'; failures: number }> {
  const failedGates = gateResults.results.filter((r) => !r.result.pass).map((r) => r.gate)
  callbacks?.onGatesChecked?.(gateResults.passed, failedGates)

  if (gateResults.passed) {
    return { action: 'success', failures: 0 }
  }

  // Don't count failures before Ralph has done real work (orientation phase)
  const hasWorked = await hasWrittenSrcFiles(fs, cwd)
  if (!hasWorked) {
    const feedback = generateGateFeedback(gateResults.results)
    await fs.writeFile(`${cwd}/.ralph/feedback.md`, feedback, { encoding: 'utf8' })
    await fs.writeFile(`${cwd}/.ralph/status.txt`, 'running', { encoding: 'utf8' })
    callbacks?.onStatus?.('Quality gates checked (pre-work — not counting as failure)')
    return { action: 'retry', failures: consecutiveGateFailures }
  }

  const newCount = consecutiveGateFailures + 1

  // Auto-patch: after 2+ consecutive failures, apply any available fixes directly
  if (newCount >= 2) {
    const fixes = gateResults.results
      .filter((r) => !r.result.pass && r.result.fix)
      .map((r) => r.result.fix!)

    if (fixes.length > 0) {
      console.log(`[Ralph] Auto-patching ${fixes.length} gate fix(es) after ${newCount} failures`)
      for (const fix of fixes) {
        try {
          const filePath = `${cwd}/${fix.file}`
          // Ensure directory exists
          const dir = fix.file.includes('/') ? `${cwd}/${fix.file.substring(0, fix.file.lastIndexOf('/'))}` : cwd
          await fs.mkdir(dir, { recursive: true }).catch(() => {})
          await fs.writeFile(filePath, fix.content, { encoding: 'utf8' })
          console.log(`[Ralph] Auto-patched: ${fix.file} — ${fix.description}`)
        } catch (err) {
          console.error(`[Ralph] Auto-patch failed for ${fix.file}:`, err)
        }
      }

      // Re-run gates after patching
      const retriedResults = await runQualityGates(fs, cwd, gateContext)
      if (retriedResults.passed) {
        console.log('[Ralph] Auto-patch resolved all gate failures')
        callbacks?.onStatus?.('Auto-patched gate failures')
        return { action: 'success', failures: 0 }
      }
      // Patching didn't resolve everything — fall through to normal retry/abort
    }
  }

  if (newCount >= MAX_CONSECUTIVE_GATE_FAILURES) {
    return { action: 'abort', failures: newCount }
  }

  const feedback = generateGateFeedback(gateResults.results)
  await fs.writeFile(`${cwd}/.ralph/feedback.md`, feedback, { encoding: 'utf8' })
  await fs.writeFile(`${cwd}/.ralph/status.txt`, 'running', { encoding: 'utf8' })
  callbacks?.onStatus?.(`Quality gates failed: ${failedGates.join(', ')}`)
  return { action: 'retry', failures: newCount }
}

/**
 * Build escalation text for user prompt when gates have failed previously.
 * Increases urgency with each consecutive failure.
 */
function buildEscalationText(consecutiveGateFailures: number): string {
  if (consecutiveGateFailures === 0) return ''

  if (consecutiveGateFailures === 1) {
    return `\n\n## ACTION REQUIRED\nQuality gates failed. You MUST use the shell tool to fix issues.\nRead: cat .ralph/feedback.md`
  }

  return `\n\n## CRITICAL — ATTEMPT ${consecutiveGateFailures + 1} OF ${MAX_CONSECUTIVE_GATE_FAILURES}\nGates have failed ${consecutiveGateFailures} time(s). REQUIRED FIRST ACTION: cat .ralph/feedback.md\nIf you respond with text and no tool calls, the task will be terminated.`
}

export async function runRalphLoop(
  provider: LLMProvider,
  fs: JSRuntimeFS,
  shell: ShellExecutor,
  git: Git,
  cwd: string,
  task: string,
  callbacks?: RalphCallbacks,
  config?: RalphLoopConfig
): Promise<RalphResult> {
  try {
    // 0. Load skills ONCE at loop start (bundled at build time)
    const skillsContent = getSkillsContent()
    const systemPrompt = buildSystemPrompt(skillsContent)
    console.log('[Ralph] System prompt built, skills loaded:', skillsContent.length > 0 ? 'yes' : 'no')

    // 0b. Build tool list from command registry (shell + discrete tools)
    const toolkit = buildRalphTools(
      shell.listCommands(),
      buildShellDescription(shell.listCommands())
    )
    console.log('[Ralph] Toolkit built:', toolkit.tools.length, 'tools,', toolkit.promotedCommands.size, 'promoted')

    // 1. Initialize .ralph/ directory
    await initRalphDir(fs, cwd, task)
    await gitCommit(git, 'ralph: initialized')

    // Track consecutive gate failures for harness-controlled completion
    let consecutiveGateFailures = 0

    // Track command attempts for observability (if enabled)
    const commandAttempts: CommandAttempt[] = []

    // Build gate context from config
    const gateContext: GateContext = config?.gateContext || {}

    // Wire preview context so `preview` shell command works inside the loop
    if (gateContext.errorCollector) {
      shell.setPreviewContext({
        build: async () => {
          gateContext.errorCollector?.clear()

          if (gateContext.fullBuild) {
            try {
              // Full pipeline: esbuild → inject capture → write cache → reload iframe
              const buildResult = await gateContext.fullBuild()
              // Wait for iframe reload + error capture scripts to fire
              await new Promise(resolve => setTimeout(resolve, 1500))
              const errors = gateContext.errorCollector?.getErrors() || []
              return {
                success: errors.length === 0,
                errors: errors.map(e => ({ message: e.message, file: e.filename, line: e.line })),
                metafile: buildResult?.metafile,
              }
            } catch (err) {
              return { success: false, errors: [{ message: err instanceof Error ? err.message : String(err) }] }
            }
          }
          // Fallback to raw esbuild
          const fallbackResult = await buildProject(fs, cwd)
          return { ...fallbackResult, metafile: fallbackResult.metafile }
        },
        getErrors: () => {
          if (!gateContext.errorCollector) return []
          return gateContext.errorCollector.getErrors().map(e => ({
            message: e.message,
            source: e.filename,
            lineno: e.line,
          }))
        },
        probeIframe: gateContext.probeIframe,
      })
    }

    // 2. Run iterations
    for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
      callbacks?.onIterationStart?.(iteration)

      // Read fresh state from files
      const state = await getRalphState(fs, cwd)
      await setIteration(fs, cwd, iteration)

      // Build prompt with current state
      const userPrompt = `# Iteration ${iteration}

## Origin
${state.origin || '(none)'}

## Task
${state.task}

## Intent
${state.intent || '(not yet written)'}

## Plan
${state.plan || '(not yet written)'}

## Feedback
${state.feedback || '(none)'}${buildEscalationText(consecutiveGateFailures)}`
      const messages: Message[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]

      // Call LLM and execute tool calls
      let toolCalls = 0
      let summary = ''
      let completedWithoutTools = false

      toolLoop: while (toolCalls < MAX_TOOL_CALLS_PER_ITERATION) {
        // Check for abort before each LLM call
        if (callbacks?.signal?.aborted) {
          console.log('[Ralph] Aborted by user')
          return { success: false, iterations: iteration, error: 'Aborted by user' }
        }

        console.log('[Ralph] Calling LLM, iteration:', iteration, 'toolCalls:', toolCalls)
        console.log('[Ralph] Provider:', { name: provider.name, model: provider.model, baseUrl: provider.baseUrl })

        const response = await chat(provider, messages, toolkit.tools, callbacks?.signal)

        console.log('[Ralph] LLM Response received, tool_calls:', response.tool_calls?.length ?? 0, 'finish_reason:', response.finish_reason)
        messages.push(response)

        // Check if LLM is done: finish_reason is 'stop' and no tool calls
        const isDone = response.finish_reason === 'stop' && !response.tool_calls?.length

        if (!response.tool_calls?.length) {
          summary = response.content
          console.log('[Ralph] No tool calls, summary:', summary.slice(0, 100), 'isDone:', isDone)

          // Log message (not displayed in UI - structured output via onIntent/onSummary)
          if (summary) {
            callbacks?.onMessage?.(summary)
          }

          // LLM is done - either first response without tools OR finish_reason is 'stop'
          if (isDone) {
            // Check if model wrote commands in text instead of calling the tool
            if (containsCommandPatterns(summary)) {
              console.log('[Ralph] Detected commands-in-text pattern — writing tool-usage feedback')
              await fs.writeFile(`${cwd}/.ralph/feedback.md`, TOOL_CALLING_FEEDBACK, { encoding: 'utf8' })
              await fs.writeFile(`${cwd}/.ralph/status.txt`, 'running', { encoding: 'utf8' })
              callbacks?.onStatus?.('Model wrote commands in text instead of using tool — retrying')
              // Don't set completedWithoutTools — force retry without counting as gate failure
              break
            }
            console.log('[Ralph] LLM finished (finish_reason=stop, no tool_calls) - treating as complete')
            completedWithoutTools = true
          }
          break
        }

        for (const tc of response.tool_calls) {
          // Parse tool arguments (shared across all tool types)
          let args: Record<string, unknown>
          try {
            args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>
          } catch {
            messages.push({ role: 'tool', content: 'Error: could not parse tool arguments. Ensure valid JSON.', tool_call_id: tc.id })
            toolCalls++
            continue
          }

          // Route by tool name
          if (tc.function.name === 'shell') {
            // === SHELL PATH (string command) ===
            const command = args.command as string
            if (!command || typeof command !== 'string') {
              messages.push({ role: 'tool', content: 'Error: malformed tool call \u2014 no command string. Try again.', tool_call_id: tc.id })
              toolCalls++
              continue
            }

            // 1. Emit status to UI if present (before execution)
            if (args._status) {
              callbacks?.onStatus?.(String(args._status))
            }

            // 2. Emit compact action echo (truncate heredocs)
            const displayCmd = command.includes('<<')
              ? command.split('<<')[0].trim() + ' << ...'
              : command
            callbacks?.onAction?.(`\u25b8 shell: ${displayCmd}`)

            console.log('[Ralph] Executing tool:', tc.function.name, 'command:', command)
            const result = await shell.execute(command, cwd)
            const output = result.stdout + (result.stderr ? `\nSTDERR: ${result.stderr}` : '')
            console.log('[Ralph] Tool result (truncated):', output.slice(0, 200))
            callbacks?.onToolCall?.(command, output)

            // Track command attempt for observability
            const parsedCmd = parseCommandString(command)
            const isSuccess = result.exitCode === 0
            commandAttempts.push({
              command: parsedCmd.command,
              args: parsedCmd.args,
              success: isSuccess,
              error: isSuccess ? undefined : result.stderr,
              timestamp: Date.now(),
            })

            // Record gap if command not found and tracking is enabled
            if (config?.observability?.trackGaps && result.exitCode === 127 && isCommandNotFoundError(result.stderr)) {
              await recordGap(fs, cwd, {
                command: parsedCmd.command,
                args: parsedCmd.args,
                error: result.stderr,
                context: task.slice(0, 200),
                reasoning: String(args._status ?? ''),
                taskId: `iteration-${iteration}`,
              })
              callbacks?.onGapRecorded?.(parsedCmd.command)
            }

            // Strip _status from tool call before storing in context
            tc.function.arguments = JSON.stringify({ command })

            messages.push({ role: 'tool', content: output, tool_call_id: tc.id })

          } else if (toolkit.promotedCommands.has(tc.function.name)) {
            // === DISCRETE TOOL PATH (typed args) ===
            const cmd = shell.getCommand(tc.function.name)
            if (!cmd?.argsSchema) {
              messages.push({ role: 'tool', content: `Error: ${tc.function.name} is not a valid discrete tool.`, tool_call_id: tc.id })
              toolCalls++
              continue
            }

            // Action echo
            const argsSummary = Object.entries(args)
              .slice(0, 3)
              .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
              .join(' ')
            callbacks?.onAction?.(`\u25b8 ${tc.function.name}: ${argsSummary.slice(0, 80)}`)

            console.log('[Ralph] Executing discrete tool:', tc.function.name, 'args:', JSON.stringify(args).slice(0, 200))

            // Validate via schema
            const parseResult = cmd.argsSchema.safeParse(args)
            if (!parseResult.success) {
              const errResult = structuredError(cmd, parseResult)
              const output = errResult.stderr
              console.log('[Ralph] Schema validation failed:', output.slice(0, 200))
              callbacks?.onToolCall?.(tc.function.name, output)
              messages.push({ role: 'tool', content: output, tool_call_id: tc.id })
              toolCalls++
              continue
            }

            // Execute with validated args
            const shellOptions: ShellOptions = { cwd, fs, git, preview: shell.previewContext }
            const result = await cmd.execute(parseResult.data, shellOptions)
            const output = result.stdout + (result.stderr ? `\nSTDERR: ${result.stderr}` : '')
            console.log('[Ralph] Discrete tool result (truncated):', output.slice(0, 200))
            callbacks?.onToolCall?.(tc.function.name, output)

            // Track command attempt
            commandAttempts.push({
              command: tc.function.name,
              args: Object.keys(args),
              success: result.exitCode === 0,
              error: result.exitCode === 0 ? undefined : result.stderr,
              timestamp: Date.now(),
            })

            messages.push({ role: 'tool', content: output, tool_call_id: tc.id })

          } else {
            // === UNKNOWN TOOL ===
            messages.push({ role: 'tool', content: `Error: unknown tool "${tc.function.name}". Use "shell" for command execution.`, tool_call_id: tc.id })
          }

          toolCalls++

          // Early exit if Ralph marked complete mid-batch
          if (await isComplete(fs, cwd)) {
            console.log('[Ralph] Status set to complete mid-batch, breaking')
            break toolLoop
          }
        }
      }

      // Break outer while loop if complete
      if (await isComplete(fs, cwd)) {
        console.log('[Ralph] Complete after tool batch - running quality gates')
        const gateResults = await runQualityGates(fs, cwd, gateContext)
        const gateOutcome = await handleGateResult(gateResults, consecutiveGateFailures, fs, cwd, callbacks, gateContext)
        consecutiveGateFailures = gateOutcome.failures

        if (gateOutcome.action === 'success') {
          const finalState = await getRalphState(fs, cwd)
          if (finalState.summary) callbacks?.onSummary?.(finalState.summary.trim())
          if (config?.observability?.captureReflection && iteration >= (config.observability.minIterationsForReflection || 2)) {
            await captureReflection(provider, fs, cwd, task, iteration, commandAttempts, gateContext, callbacks)
          }
          callbacks?.onComplete?.(iteration)
          return { success: true, iterations: iteration }
        } else if (gateOutcome.action === 'abort') {
          const failedGates = gateResults.results.filter((r) => !r.result.pass).map((r) => r.gate)
          return { success: false, iterations: iteration, error: `Quality gates failed ${gateOutcome.failures} times: ${failedGates.join(', ')}` }
        }
        // 'retry' → continue to next iteration
      }

      // Detect intent/summary changes and fire callbacks
      const newState = await getRalphState(fs, cwd)
      if (newState.intent && newState.intent !== state.intent) {
        callbacks?.onIntent?.(newState.intent.trim())
      }
      if (newState.summary && newState.summary !== state.summary) {
        callbacks?.onSummary?.(newState.summary.trim())
      }

      // Commit and notify
      await gitCommit(git, `ralph: iteration ${iteration}`)
      callbacks?.onIterationEnd?.(iteration)

      // If LLM responded without using any tools, run quality gates
      if (completedWithoutTools) {
        console.log('[Ralph] Completed without tools - running quality gates')
        const gateResults = await runQualityGates(fs, cwd, gateContext)
        const gateOutcome = await handleGateResult(gateResults, consecutiveGateFailures, fs, cwd, callbacks, gateContext)
        consecutiveGateFailures = gateOutcome.failures

        if (gateOutcome.action === 'success') {
          const finalState = await getRalphState(fs, cwd)
          if (finalState.summary) callbacks?.onSummary?.(finalState.summary.trim())
          if (config?.observability?.captureReflection && iteration >= (config.observability.minIterationsForReflection || 2)) {
            await captureReflection(provider, fs, cwd, task, iteration, commandAttempts, gateContext, callbacks)
          }
          callbacks?.onComplete?.(iteration)
          return { success: true, iterations: iteration }
        } else if (gateOutcome.action === 'abort') {
          const failedGates = gateResults.results.filter((r) => !r.result.pass).map((r) => r.gate)
          return { success: false, iterations: iteration, error: `Quality gates failed ${gateOutcome.failures} times: ${failedGates.join(', ')}` }
        }
        // 'retry' → continue to next iteration
      }

      // Check termination conditions from status file
      if (await isComplete(fs, cwd)) {
        console.log('[Ralph] Status is complete - running quality gates')
        const gateResults = await runQualityGates(fs, cwd, gateContext)
        const gateOutcome = await handleGateResult(gateResults, consecutiveGateFailures, fs, cwd, callbacks, gateContext)
        consecutiveGateFailures = gateOutcome.failures

        if (gateOutcome.action === 'success') {
          const finalState = await getRalphState(fs, cwd)
          if (finalState.summary) callbacks?.onSummary?.(finalState.summary.trim())
          if (config?.observability?.captureReflection && iteration >= (config.observability.minIterationsForReflection || 2)) {
            await captureReflection(provider, fs, cwd, task, iteration, commandAttempts, gateContext, callbacks)
          }
          callbacks?.onComplete?.(iteration)
          return { success: true, iterations: iteration }
        } else if (gateOutcome.action === 'abort') {
          const failedGates = gateResults.results.filter((r) => !r.result.pass).map((r) => r.gate)
          return { success: false, iterations: iteration, error: `Quality gates failed ${gateOutcome.failures} times: ${failedGates.join(', ')}` }
        }
        // 'retry' → continue to next iteration
      }
      if (await isWaiting(fs, cwd)) {
        return { success: true, iterations: iteration, error: 'Waiting for human input' }
      }
    }

    return { success: false, iterations: MAX_ITERATIONS, error: 'Max iterations reached' }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    callbacks?.onError?.(err)
    return { success: false, iterations: 0, error: err.message }
  }
}
