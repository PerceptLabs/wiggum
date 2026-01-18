import path from 'path-browserify'
import type { RalphSubcommand, RalphSubcommandOptions, RalphState, RalphConfig } from './types'
import type { ShellCommandResult } from '../ShellCommand'
import { createSuccessResult, createErrorResult } from '../ShellCommand'
import { RALPH_DIR, RALPH_FILES, DEFAULT_RALPH_CONFIG } from './types'
import { readRalphState } from './status'

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Safely read a file, returning fallback if it doesn't exist
 */
async function safeReadFile(
  fs: RalphSubcommandOptions['fs'],
  filePath: string,
  fallback: string
): Promise<string> {
  try {
    const content = await fs.readFile(filePath, { encoding: 'utf8' })
    return (content as string).trim()
  } catch {
    return fallback
  }
}

/**
 * Read ralph config from .ralph/config.json
 */
async function readConfig(
  fs: RalphSubcommandOptions['fs'],
  cwd: string
): Promise<RalphConfig> {
  try {
    const configPath = path.join(cwd, RALPH_FILES.config)
    const content = await fs.readFile(configPath, { encoding: 'utf8' })
    return { ...DEFAULT_RALPH_CONFIG, ...JSON.parse(content as string) }
  } catch {
    return DEFAULT_RALPH_CONFIG
  }
}

/**
 * Build the iteration prompt for the AI
 * This is the core of ralph's magic - providing fresh context each iteration
 */
export function buildIterationPrompt(state: RalphState, iteration: number): string {
  const sections: string[] = []

  // Header
  sections.push(`# Ralph Iteration ${iteration}`)
  sections.push('')

  // Task section
  sections.push('## Task')
  sections.push('')
  sections.push(state.task || 'No task defined. Please check .ralph/task.md')
  sections.push('')

  // Progress section
  sections.push('## Progress So Far')
  sections.push('')
  if (state.progress && state.progress.includes('###')) {
    // Extract recent progress entries (last 3)
    const entries = state.progress.split(/(?=###\s)/g).filter((e) => e.trim())
    const recent = entries.slice(-3)
    sections.push(recent.join('\n'))
  } else {
    sections.push('No progress recorded yet. This is the first iteration.')
  }
  sections.push('')

  // Feedback section
  if (state.feedback && state.feedback.trim()) {
    const feedbackContent = state.feedback
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('# Feedback') && !l.startsWith('## Instructions'))
      .join('\n')
      .trim()

    if (feedbackContent && !feedbackContent.startsWith('Add feedback')) {
      sections.push('## Feedback / Corrections')
      sections.push('')
      sections.push(feedbackContent)
      sections.push('')
    }
  }

  // Instructions
  sections.push('## Instructions')
  sections.push('')
  sections.push(`You are in iteration ${iteration} of an autonomous development loop.`)
  sections.push('')
  sections.push('Your job:')
  sections.push('1. Review the task and progress above')
  sections.push('2. Take the next logical step toward completing the task')
  sections.push('3. Use shell commands to read files, make changes, run tests, etc.')
  sections.push('4. After making progress, update .ralph/progress.md with what you did')
  sections.push('5. If the task is complete, write "complete" to .ralph/status.txt')
  sections.push('6. If you need human input, write "waiting" to .ralph/status.txt')
  sections.push('')
  sections.push('Important:')
  sections.push('- Focus on ONE clear step per iteration')
  sections.push('- Always verify changes work before marking progress')
  sections.push('- Be thorough but efficient')
  sections.push('')

  return sections.join('\n')
}

/**
 * Ralph run subcommand - the core autonomous loop
 */
export const runSubcommand: RalphSubcommand = {
  name: 'run',
  description: 'Start the autonomous iteration loop',
  usage: 'ralph run [--max-iterations N]',

  async execute(
    args: string[],
    cwd: string,
    options: RalphSubcommandOptions
  ): Promise<ShellCommandResult> {
    const { fs, git, sendMessage } = options
    const ralphDir = path.join(cwd, RALPH_DIR)

    try {
      // Check if .ralph exists
      const exists = await fs.exists?.(ralphDir) ?? false
      if (!exists) {
        return createErrorResult(
          'ralph: not initialized. Run "ralph init" first.'
        )
      }

      // Parse args for max iterations
      let maxIterations = DEFAULT_RALPH_CONFIG.maxIterations
      const maxIdx = args.findIndex((a) => a === '--max-iterations' || a === '-n')
      if (maxIdx !== -1 && args[maxIdx + 1]) {
        maxIterations = parseInt(args[maxIdx + 1], 10)
        if (isNaN(maxIterations) || maxIterations < 1) {
          return createErrorResult('ralph run: invalid max iterations value')
        }
      }

      // Read config
      const config = await readConfig(fs, cwd)

      // Read initial state
      let state = await readRalphState(fs, cwd)

      // Check if already complete
      if (state.status === 'complete') {
        return createSuccessResult(
          'ralph: task is already complete. Run "ralph init --force" to start a new task.'
        )
      }

      // Set status to running
      await fs.writeFile(path.join(cwd, RALPH_FILES.status), 'running')

      const startIteration = state.iteration
      let iteration = startIteration
      const results: string[] = [`Starting ralph loop at iteration ${iteration + 1}`]

      // THE LOOP
      while (iteration < startIteration + maxIterations && state.status !== 'complete') {
        // Increment iteration
        iteration++

        // Read fresh state from files
        state = await readRalphState(fs, cwd)

        // Check status (might have been changed externally)
        if (state.status === 'complete') {
          results.push(`Iteration ${iteration}: Task marked complete`)
          break
        }

        if (state.status === 'waiting') {
          results.push(`Iteration ${iteration}: Paused - waiting for human input`)
          break
        }

        // Build iteration prompt with fresh context
        const prompt = buildIterationPrompt(state, iteration)

        // Update iteration count
        await fs.writeFile(path.join(cwd, RALPH_FILES.iteration), String(iteration))

        try {
          // Call sendMessage - this invokes the AI with FRESH context
          // The AI's response triggers tool calls that modify files
          const response = await sendMessage(prompt)

          // Log the iteration result
          results.push(`Iteration ${iteration}: Completed`)

          // Append to progress log
          const progressPath = path.join(cwd, RALPH_FILES.progress)
          const currentProgress = await safeReadFile(fs, progressPath, '')
          const timestamp = new Date().toISOString()
          const progressEntry = `\n### Iteration ${iteration} (${timestamp})\n\n${response.slice(0, 500)}${response.length > 500 ? '...' : ''}\n`
          await fs.writeFile(progressPath, currentProgress + progressEntry)

          // Git checkpoint commit
          if (config.checkpointInterval > 0 && iteration % config.checkpointInterval === 0) {
            try {
              const isRepo = await git.isRepo()
              if (isRepo) {
                await git.addAll()
                await git.commit({
                  message: `ralph: iteration ${iteration}`,
                  author: { name: 'Ralph', email: 'ralph@wiggum.local' },
                })
              }
            } catch {
              // Git commit failed, not critical
            }
          }
        } catch (err) {
          // AI call failed
          results.push(`Iteration ${iteration}: Error - ${(err as Error).message}`)
          await fs.writeFile(path.join(cwd, RALPH_FILES.status), 'error')
          break
        }

        // Re-read status to check for completion or waiting
        const statusContent = await safeReadFile(fs, path.join(cwd, RALPH_FILES.status), 'running')
        state.status = statusContent as RalphState['status']

        if (state.status === 'complete') {
          results.push('Task marked complete!')
          break
        }

        if (state.status === 'waiting') {
          results.push('Paused - waiting for human input')
          break
        }

        // Small delay between iterations
        await sleep(1000)
      }

      // Check if we hit max iterations
      if (iteration >= startIteration + maxIterations && state.status !== 'complete') {
        results.push(`Reached max iterations (${maxIterations})`)
        await fs.writeFile(path.join(cwd, RALPH_FILES.status), 'idle')
      }

      // Summary
      const totalIterations = iteration - startIteration
      results.push('')
      results.push(`Completed ${totalIterations} iteration(s)`)
      results.push(`Final status: ${state.status}`)

      return createSuccessResult(results.join('\n'))
    } catch (err) {
      return createErrorResult(`ralph run: ${(err as Error).message}`)
    }
  },
}
