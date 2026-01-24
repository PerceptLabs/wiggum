import * as path from 'path-browserify'
import type { RalphSubcommand, RalphSubcommandOptions, ShellCommandResult } from './types'
import { createSuccessResult, createErrorResult, RALPH_DIR, RALPH_FILES } from './types'
import { readRalphState } from './status'

/**
 * Ralph resume subcommand
 * Resets status to 'running' and delegates to run command
 */
export const resumeSubcommand: RalphSubcommand = {
  name: 'resume',
  description: 'Resume a paused ralph task',
  usage: 'ralph resume [--max-iterations N]',

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

      // Read current state
      const state = await readRalphState(fs, cwd)

      // Check if task is complete
      if (state.status === 'complete') {
        return createSuccessResult(
          'ralph: task is already complete. Run "ralph init --force" to start a new task.'
        )
      }

      // Check if already running
      if (state.status === 'running') {
        return createSuccessResult(
          'ralph: task is already running.'
        )
      }

      // Reset status to running
      await fs.writeFile(path.join(cwd, RALPH_FILES.status), 'running')

      // Log the resume in progress
      const progressPath = path.join(cwd, RALPH_FILES.progress)
      const currentProgress = await fs.readFile(progressPath, { encoding: 'utf8' }) as string
      const resumeEntry = `\n### Resumed at iteration ${state.iteration}\n\nStatus was: ${state.status}\n`
      await fs.writeFile(progressPath, currentProgress + resumeEntry)

      // Import and call run subcommand
      // Note: We dynamically import to avoid circular dependency
      const { runSubcommand } = await import('./run')
      return runSubcommand.execute(args, cwd, options)
    } catch (err) {
      return createErrorResult(`ralph resume: ${(err as Error).message}`)
    }
  },
}
