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
import type { LLMProvider, Message, Tool } from '../llm/client'
import { chat } from '../llm/client'
import type { ShellExecutor } from '../shell/executor'
import { initRalphDir, getRalphState, isComplete, isWaiting, setIteration } from './state'
import { getSkillsContent } from './skills'
import { runQualityGates, generateGateFeedback } from './gates'
import type { ObservabilityConfig, GateContext, CommandAttempt, HarnessReflection } from '../types/observability'
import { recordGap, isCommandNotFoundError, parseCommandString } from './gaps'
import { buildReflectionPrompt, parseReflectionResponse, saveReflection } from './reflection'
import { getLogBuffer } from '../logger'

const BASE_SYSTEM_PROMPT = `You are Ralph, an autonomous coding agent building React applications.

You have one tool: shell. Use it to run commands, read/write files, and complete tasks.

Available commands: cat, echo, touch, mkdir, rm, cp, mv, ls, pwd, find, grep, head, tail, wc, sort, uniq, git

No npm, node, python, curl, or other tools. The preview system handles compilation.

## Environment

React application with:
- TypeScript (.tsx files in src/)
- Tailwind CSS for styling
- @wiggum/stack component library
- lucide-react for icons

## Project Structure (CREATED FOR YOU)

index.html            # Tailwind config - DO NOT MODIFY
src/
├── main.tsx          # Entry point - DO NOT MODIFY
├── App.tsx           # Root component - START HERE
├── index.css         # Theme CSS variables - customize colors here
├── sections/         # Page sections (HeroSection.tsx, etc.)
└── components/       # Reusable components

## Interpreting User Requests

Translate user intent to React:
- "HTML page" → React component (JSX compiles to HTML)
- "CSS styles" → Tailwind classes
- "JavaScript" → React + handlers
- "Single file" → All code in App.tsx
- "No frameworks" → Still use React (it's the environment)

**Acknowledge translations in .ralph/intent.md** - be transparent about using React.

## CRITICAL RULES

1. **React only** - Write .tsx files in src/. HTML files are blocked.
2. **Use @wiggum/stack** - Import Button, Card, Input, etc. from @wiggum/stack
3. **Don't touch index.html** - It contains Tailwind configuration. Customize themes in src/index.css.
4. **Max 200 lines per file** - Split into sections/
5. **Start with App.tsx** - It already exists

## Import Pattern

\`\`\`tsx
import { Button, Card, Input } from '@wiggum/stack'
import { ArrowRight, Check } from 'lucide-react'
\`\`\`

## Component Mapping

| ❌ Don't | ✅ Do |
|----------|-------|
| \`<button>\` | \`<Button>\` |
| \`<input>\` | \`<Input>\` |
| \`<div onClick>\` | \`<Button variant="ghost">\` |

## Surgical Edits

For small fixes (typos, renames, one-line changes), use \`replace\` instead of rewriting files:

\`\`\`bash
# Fix a typo
replace src/App.tsx "consloe.log" "console.log"

# Rename a component
replace src/App.tsx "OldName" "NewName"

# Fix a className typo
replace src/sections/Hero.tsx "classNamew-3" "className w-3"
\`\`\`

**When to use replace:** Single string changes — typos, renames, small fixes.
**When to rewrite file:** Multi-line changes, restructuring, new features.

## Theming

Create unique themes appropriate to each project's content and mood.

- Define ALL CSS variables in src/index.css (see theming skill for full list)
- Add animations and micro-interactions by default for landing pages
- Include \`@media (prefers-reduced-motion)\` for accessibility
- Match theme colors and style to project content, not the IDE

## Your Memory (.ralph/)

- .ralph/origin.md: Project's founding concept and refinements (READ ONLY - harness managed)
- .ralph/task.md: Current task from user (read-only)
- .ralph/intent.md: Your acknowledgment (write once)
- .ralph/plan.md: TODO list (update as you progress)
- .ralph/summary.md: What you built (write when complete)
- .ralph/status.txt: Write "complete" when done

## Quality Gates

When you write "complete" to status.txt, quality gates validate your work:
- src/App.tsx exists and has meaningful content (not just scaffold)
- src/index.css has CSS variables in :root (no @tailwind directives)
- Project builds successfully

If gates fail, feedback appears in .ralph/feedback.md on your next iteration.
Fix the issues and mark complete again. You have 3 attempts before the loop stops.

## Final Review

After quality gates pass, do ONE polish check:
1. Run \`cat .ralph/rendered-structure.md\` to verify expected elements rendered
2. If something is clearly broken or missing, fix it
3. Then mark complete - do NOT iterate on styling, spacing, or minor improvements

The goal is functional completion, not perfection. Small visual tweaks can be done later.
If you find yourself making the same type of change twice, STOP and mark complete.

## Workflow

1. Read task: \`cat .ralph/task.md\`
2. Write intent: \`echo "Building X with React+Tailwind" > .ralph/intent.md\`
3. Check current state: \`cat src/App.tsx\`
4. Write plan: \`echo "- [ ] Create sections" > .ralph/plan.md\`
5. Build components
6. Before completing, run \`cat .ralph/rendered-structure.md\` to verify expected elements rendered. Fix if needed.
7. Write summary and signal complete

## Status Updates

You may include an optional _status field (one sentence max) with any shell command to explain your reasoning.

Rules:
- Only include _status when it adds information beyond the command itself
- The command shows WHAT you're doing, _status shows WHY (if not obvious)
- Omit _status if the command is self-explanatory

## Example Output

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
const MAX_CONSECUTIVE_GATE_FAILURES = 3

const SHELL_TOOL: Tool = {
  type: 'function',
  function: {
    name: 'shell',
    description: `Execute shell commands. Single tool for all file operations.

**Commands:**
- File I/O: cat, echo, touch, mkdir, rm, cp, mv
- Navigation: ls, pwd, tree
- Search: find, grep, head, tail, wc, sort, uniq
- Edit: replace (surgical string replacement)
- VCS: git

**Operators:**
- Pipe: cmd1 | cmd2 (stdout → stdin)
- Chain: cmd1 && cmd2 (run cmd2 if cmd1 succeeds)
- Fallback: cmd1 || cmd2 (run cmd2 if cmd1 fails)
- Redirect: cmd > file (overwrite), cmd >> file (append)
- Heredoc: cat > file << 'EOF'\\ncontent\\nEOF

**Flags:**
- cat -q: Quiet mode (no error on missing file, for use with ||)
- replace -w: Whitespace-tolerant matching

**grep modes:**
- grep skill "<query>" - Semantic skill search
- grep code "<query>" - Project code search
- grep "<pattern>" <file> - Exact regex match

**Examples:**
- cat -q .ralph/feedback.md || echo "(no feedback)"
- cat src/App.tsx | grep "import"
- replace -w src/App.tsx "old  text" "new text"

No bash, sh, npm, node, python, curl.`,
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The command to run' },
        _status: {
          type: 'string',
          description: 'Optional: Brief reasoning/intent (1 sentence max). Omit if self-explanatory.',
        },
      },
      required: ['command'],
    },
  },
}

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

    // 1. Initialize .ralph/ directory
    await initRalphDir(fs, cwd, task)
    await gitCommit(git, 'ralph: initialized')

    // Track consecutive gate failures for harness-controlled completion
    let consecutiveGateFailures = 0

    // Track command attempts for observability (if enabled)
    const commandAttempts: CommandAttempt[] = []

    // Build gate context from config
    const gateContext: GateContext = config?.gateContext || {}

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
${state.feedback || '(none)'}`
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

        const response = await chat(provider, messages, [SHELL_TOOL], callbacks?.signal)

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
            console.log('[Ralph] LLM finished (finish_reason=stop, no tool_calls) - treating as complete')
            completedWithoutTools = true
          }
          break
        }

        for (const tc of response.tool_calls) {
          const args = JSON.parse(tc.function.arguments) as { command: string; _status?: string }

          // 1. Emit status to UI if present (before execution)
          if (args._status) {
            callbacks?.onStatus?.(args._status)
          }

          // 2. Emit compact action echo (truncate heredocs)
          const displayCmd = args.command?.includes('<<')
            ? args.command.split('<<')[0].trim() + ' << ...'
            : (args.command ?? '')
          callbacks?.onAction?.(`▸ shell: ${displayCmd}`)

          console.log('[Ralph] Executing tool:', tc.function.name, 'command:', args.command)
          const result = await shell.execute(args.command, cwd)
          const output = result.stdout + (result.stderr ? `\nSTDERR: ${result.stderr}` : '')
          console.log('[Ralph] Tool result (truncated):', output.slice(0, 200))
          callbacks?.onToolCall?.(args.command, output)

          // Track command attempt for observability
          const parsedCmd = parseCommandString(args.command)
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
              reasoning: args._status,
              taskId: `iteration-${iteration}`,
            })
            callbacks?.onGapRecorded?.(parsedCmd.command)
          }

          // 3. Strip _status from tool call before storing in context
          // We need to modify the response before it goes into messages
          tc.function.arguments = JSON.stringify({ command: args.command })

          messages.push({ role: 'tool', content: output, tool_call_id: tc.id })
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
        const failures = gateResults.results.filter((r) => !r.result.pass).map((r) => r.gate)
        callbacks?.onGatesChecked?.(gateResults.passed, failures)

        if (gateResults.passed) {
          const finalState = await getRalphState(fs, cwd)
          if (finalState.summary) {
            callbacks?.onSummary?.(finalState.summary.trim())
          }
          // Capture reflection if enabled
          if (config?.observability?.captureReflection && iteration >= (config.observability.minIterationsForReflection || 2)) {
            await captureReflection(provider, fs, cwd, task, iteration, commandAttempts, gateContext, callbacks)
          }
          callbacks?.onComplete?.(iteration)
          return { success: true, iterations: iteration }
        }
        // If gates failed, continue to let the existing logic handle it
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
        const failures = gateResults.results.filter((r) => !r.result.pass).map((r) => r.gate)
        callbacks?.onGatesChecked?.(gateResults.passed, failures)

        if (gateResults.passed) {
          consecutiveGateFailures = 0
          const finalState = await getRalphState(fs, cwd)
          if (finalState.summary) {
            callbacks?.onSummary?.(finalState.summary.trim())
          }
          // Capture reflection if enabled
          if (config?.observability?.captureReflection && iteration >= (config.observability.minIterationsForReflection || 2)) {
            await captureReflection(provider, fs, cwd, task, iteration, commandAttempts, gateContext, callbacks)
          }
          callbacks?.onComplete?.(iteration)
          return { success: true, iterations: iteration }
        } else {
          consecutiveGateFailures++
          if (consecutiveGateFailures >= MAX_CONSECUTIVE_GATE_FAILURES) {
            return {
              success: false,
              iterations: iteration,
              error: `Quality gates failed ${consecutiveGateFailures} times: ${failures.join(', ')}`,
            }
          }
          const feedback = generateGateFeedback(gateResults.results)
          await fs.writeFile(`${cwd}/.ralph/feedback.md`, feedback, { encoding: 'utf8' })
          await fs.writeFile(`${cwd}/.ralph/status.txt`, 'running', { encoding: 'utf8' })
          callbacks?.onStatus?.(`Quality gates failed: ${failures.join(', ')}`)
          // Continue to next iteration (don't return)
        }
      }

      // Check termination conditions from status file
      if (await isComplete(fs, cwd)) {
        console.log('[Ralph] Status is complete - running quality gates')
        const gateResults = await runQualityGates(fs, cwd, gateContext)
        const failures = gateResults.results.filter((r) => !r.result.pass).map((r) => r.gate)
        callbacks?.onGatesChecked?.(gateResults.passed, failures)

        if (gateResults.passed) {
          consecutiveGateFailures = 0
          const finalState = await getRalphState(fs, cwd)
          if (finalState.summary) {
            callbacks?.onSummary?.(finalState.summary.trim())
          }
          // Capture reflection if enabled
          if (config?.observability?.captureReflection && iteration >= (config.observability.minIterationsForReflection || 2)) {
            await captureReflection(provider, fs, cwd, task, iteration, commandAttempts, gateContext, callbacks)
          }
          callbacks?.onComplete?.(iteration)
          return { success: true, iterations: iteration }
        } else {
          consecutiveGateFailures++
          if (consecutiveGateFailures >= MAX_CONSECUTIVE_GATE_FAILURES) {
            return {
              success: false,
              iterations: iteration,
              error: `Quality gates failed ${consecutiveGateFailures} times: ${failures.join(', ')}`,
            }
          }
          const feedback = generateGateFeedback(gateResults.results)
          await fs.writeFile(`${cwd}/.ralph/feedback.md`, feedback, { encoding: 'utf8' })
          await fs.writeFile(`${cwd}/.ralph/status.txt`, 'running', { encoding: 'utf8' })
          callbacks?.onStatus?.(`Quality gates failed: ${failures.join(', ')}`)
          // Continue to next iteration (don't return)
        }
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
