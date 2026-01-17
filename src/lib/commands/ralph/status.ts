import path from 'path-browserify'
import type { RalphSubcommand, RalphSubcommandOptions, RalphState, RalphStatus } from './types'
import type { ShellCommandResult } from '../ShellCommand'
import { createSuccessResult, createErrorResult } from '../ShellCommand'
import { RALPH_DIR, RALPH_FILES } from './types'

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
 * Read ralph state from .ralph/ directory
 */
export async function readRalphState(
  fs: RalphSubcommandOptions['fs'],
  cwd: string
): Promise<RalphState> {
  return {
    task: await safeReadFile(fs, path.join(cwd, RALPH_FILES.task), ''),
    progress: await safeReadFile(fs, path.join(cwd, RALPH_FILES.progress), ''),
    feedback: await safeReadFile(fs, path.join(cwd, RALPH_FILES.feedback), ''),
    iteration: parseInt(await safeReadFile(fs, path.join(cwd, RALPH_FILES.iteration), '0'), 10),
    status: (await safeReadFile(fs, path.join(cwd, RALPH_FILES.status), 'idle')) as RalphStatus,
  }
}

/**
 * Get a summary of progress (first few non-empty lines after header)
 */
function getProgressSummary(progress: string, maxLines = 5): string {
  const lines = progress.split('\n')
  const summaryLines: string[] = []
  let inIterations = false

  for (const line of lines) {
    if (line.startsWith('## Iterations')) {
      inIterations = true
      continue
    }
    if (inIterations && line.trim() && !line.startsWith('#')) {
      summaryLines.push(line)
      if (summaryLines.length >= maxLines) break
    }
  }

  return summaryLines.length > 0 ? summaryLines.join('\n') : 'No progress yet.'
}

/**
 * Get status color/indicator
 */
function getStatusIndicator(status: RalphStatus): string {
  switch (status) {
    case 'running':
      return '[*]'
    case 'complete':
      return '[+]'
    case 'waiting':
      return '[?]'
    case 'error':
      return '[!]'
    default:
      return '[ ]'
  }
}

/**
 * Ralph status subcommand
 * Reads and displays current state
 */
export const statusSubcommand: RalphSubcommand = {
  name: 'status',
  description: 'Show current ralph state',
  usage: 'ralph status',

  async execute(
    args: string[],
    cwd: string,
    options: RalphSubcommandOptions
  ): Promise<ShellCommandResult> {
    const { fs } = options
    const ralphDir = path.join(cwd, RALPH_DIR)

    try {
      // Check if .ralph exists
      const exists = await fs.exists?.(ralphDir) ?? false
      if (!exists) {
        return createErrorResult(
          'ralph: not initialized. Run "ralph init" first.'
        )
      }

      const state = await readRalphState(fs, cwd)
      const verbose = args.includes('--verbose') || args.includes('-v')

      // Extract task title (first non-empty line after # Task)
      const taskLines = state.task.split('\n')
      let taskTitle = 'No task defined'
      for (let i = 0; i < taskLines.length; i++) {
        const line = taskLines[i].trim()
        if (line.startsWith('# Task')) continue
        if (line && !line.startsWith('#')) {
          taskTitle = line.length > 60 ? line.slice(0, 57) + '...' : line
          break
        }
      }

      const output: string[] = [
        `${getStatusIndicator(state.status)} Ralph Status`,
        '',
        `Status:     ${state.status}`,
        `Iteration:  ${state.iteration}`,
        `Task:       ${taskTitle}`,
      ]

      // Check for feedback
      const feedbackLines = state.feedback.split('\n').filter(
        (l) => l.trim() && !l.startsWith('#') && !l.startsWith('-')
      )
      const hasFeedback = feedbackLines.length > 0
      if (hasFeedback) {
        output.push(`Feedback:   Yes (${feedbackLines.length} lines)`)
      }

      if (verbose) {
        output.push('')
        output.push('Progress:')
        output.push(getProgressSummary(state.progress))

        if (hasFeedback) {
          output.push('')
          output.push('Recent feedback:')
          output.push(feedbackLines.slice(0, 3).join('\n'))
        }
      }

      return createSuccessResult(output.join('\n'))
    } catch (err) {
      return createErrorResult(`ralph status: ${(err as Error).message}`)
    }
  },
}
