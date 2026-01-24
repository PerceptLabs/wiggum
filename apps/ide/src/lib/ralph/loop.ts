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
import { initRalphDir, getRalphState, isComplete, isWaiting, setIteration, appendProgress } from './state'

const SYSTEM_PROMPT = `You are Ralph, an autonomous coding agent.

You have one tool: shell. Use it to run commands, read/write files, and complete tasks.
Your memory is stored in .ralph/ files. Read them to understand context.
After each action, git commits your work automatically.

When done, write "complete" to .ralph/status.txt.
If you need human input, write "waiting" to .ralph/status.txt.`

const MAX_ITERATIONS = 20
const MAX_TOOL_CALLS_PER_ITERATION = 50

const SHELL_TOOL: Tool = {
  type: 'function',
  function: {
    name: 'shell',
    description: 'Execute a shell command',
    parameters: {
      type: 'object',
      properties: { command: { type: 'string', description: 'The command to run' } },
      required: ['command'],
    },
  },
}

export interface RalphCallbacks {
  onIterationStart?: (iteration: number) => void
  onIterationEnd?: (iteration: number) => void
  onToolCall?: (command: string, result: string) => void
  onMessage?: (content: string) => void  // Called when LLM sends a text response
  onComplete?: (iterations: number) => void
  onError?: (error: Error) => void
  signal?: AbortSignal  // AbortSignal for cancellation
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

export async function runRalphLoop(
  provider: LLMProvider,
  fs: JSRuntimeFS,
  shell: ShellExecutor,
  git: Git,
  cwd: string,
  task: string,
  callbacks?: RalphCallbacks
): Promise<RalphResult> {
  try {
    // 1. Initialize .ralph/ directory
    await initRalphDir(fs, cwd, task)
    await gitCommit(git, 'ralph: initialized')

    // 2. Run iterations
    for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
      callbacks?.onIterationStart?.(iteration)

      // Read fresh state from files
      const state = await getRalphState(fs, cwd)
      await setIteration(fs, cwd, iteration)

      // Build prompt with current state
      const userPrompt = `# Iteration ${iteration}\n\n${state.task}\n\n## Progress\n${state.progress}\n\n## Feedback\n${state.feedback}`
      const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ]

      // Call LLM and execute tool calls
      let toolCalls = 0
      let summary = ''
      let completedWithoutTools = false

      while (toolCalls < MAX_TOOL_CALLS_PER_ITERATION) {
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

          // Send message to UI
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
          const args = JSON.parse(tc.function.arguments)
          console.log('[Ralph] Executing tool:', tc.function.name, 'command:', args.command)
          const result = await shell.execute(args.command, cwd)
          const output = result.stdout + (result.stderr ? `\nSTDERR: ${result.stderr}` : '')
          console.log('[Ralph] Tool result (truncated):', output.slice(0, 200))
          callbacks?.onToolCall?.(args.command, output)
          messages.push({ role: 'tool', content: output, tool_call_id: tc.id })
          toolCalls++
        }
      }

      // Update progress and commit
      await appendProgress(fs, cwd, `### Iteration ${iteration}\n${summary.slice(0, 300)}`)
      await gitCommit(git, `ralph: iteration ${iteration}`)
      callbacks?.onIterationEnd?.(iteration)

      // If LLM responded without using any tools, treat as complete
      if (completedWithoutTools) {
        console.log('[Ralph] Completed without tools - exiting loop')
        callbacks?.onComplete?.(iteration)
        return { success: true, iterations: iteration }
      }

      // Check termination conditions from status file
      if (await isComplete(fs, cwd)) {
        callbacks?.onComplete?.(iteration)
        return { success: true, iterations: iteration }
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
