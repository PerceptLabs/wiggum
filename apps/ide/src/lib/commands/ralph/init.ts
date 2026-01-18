import path from 'path-browserify'
import type { RalphSubcommand, RalphSubcommandOptions } from './types'
import type { ShellCommandResult } from '../ShellCommand'
import { createSuccessResult, createErrorResult } from '../ShellCommand'
import { RALPH_DIR, RALPH_FILES, DEFAULT_RALPH_CONFIG } from './types'

/**
 * Ralph init subcommand
 * Creates .ralph/ directory with initial state files
 */
export const initSubcommand: RalphSubcommand = {
  name: 'init',
  description: 'Initialize a new ralph task',
  usage: 'ralph init [task description]',

  async execute(
    args: string[],
    cwd: string,
    options: RalphSubcommandOptions
  ): Promise<ShellCommandResult> {
    const { fs } = options

    // Join args as task description, or use placeholder
    const taskDescription = args.join(' ').trim() || 'Describe your task here'

    const ralphDir = path.join(cwd, RALPH_DIR)

    try {
      // Check if .ralph already exists
      const exists = await fs.exists?.(ralphDir) ?? false
      if (exists) {
        // Check if force flag is passed
        if (!args.includes('--force') && !args.includes('-f')) {
          return createErrorResult(
            `ralph: .ralph/ directory already exists. Use --force to reinitialize.`
          )
        }
      }

      // Create .ralph directory
      await fs.mkdir(ralphDir, { recursive: true })

      // Create task.md
      const taskContent = `# Task

${taskDescription}

## Acceptance Criteria

- [ ] Define your acceptance criteria here

## Notes

Add any additional context or constraints here.
`
      await fs.writeFile(path.join(cwd, RALPH_FILES.task), taskContent)

      // Create progress.md
      const progressContent = `# Progress

## Iterations

Progress will be logged here as ralph works on the task.
`
      await fs.writeFile(path.join(cwd, RALPH_FILES.progress), progressContent)

      // Create feedback.md
      const feedbackContent = `# Feedback

Add feedback or corrections here. Ralph will read this at the start of each iteration.

## Instructions

- Write feedback in clear, actionable terms
- Set status to 'waiting' if you need ralph to pause for your input
- Set status to 'complete' when the task is done
`
      await fs.writeFile(path.join(cwd, RALPH_FILES.feedback), feedbackContent)

      // Create iteration.txt
      await fs.writeFile(path.join(cwd, RALPH_FILES.iteration), '0')

      // Create status.txt
      await fs.writeFile(path.join(cwd, RALPH_FILES.status), 'idle')

      // Create config.json
      await fs.writeFile(
        path.join(cwd, RALPH_FILES.config),
        JSON.stringify(DEFAULT_RALPH_CONFIG, null, 2)
      )

      const output = [
        'Initialized ralph in .ralph/',
        '',
        'Created files:',
        '  .ralph/task.md      - Edit this to describe your task',
        '  .ralph/progress.md  - Ralph will log progress here',
        '  .ralph/feedback.md  - Add feedback or corrections here',
        '  .ralph/iteration.txt - Current iteration (0)',
        '  .ralph/status.txt   - Current status (idle)',
        '  .ralph/config.json  - Configuration options',
        '',
        taskDescription !== 'Describe your task here'
          ? `Task: ${taskDescription}`
          : 'Edit .ralph/task.md to describe your task.',
        '',
        'Run "ralph run" to start the autonomous loop.',
      ]

      return createSuccessResult(output.join('\n'))
    } catch (err) {
      return createErrorResult(`ralph init: ${(err as Error).message}`)
    }
  },
}
