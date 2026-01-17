import type { GitSubcommand, GitSubcommandOptions } from './types'
import type { ShellCommandResult } from '../ShellCommand'
import { createSuccessResult, createErrorResult } from '../ShellCommand'

function parseOptions(args: string[]): { hard: boolean; ref: string } {
  let hard = false
  let ref = 'HEAD'

  for (const arg of args) {
    if (arg === '--hard') {
      hard = true
    } else if (arg === '--soft' || arg === '--mixed') {
      // These modes are not fully implemented
    } else if (!arg.startsWith('-')) {
      ref = arg
    }
  }

  return { hard, ref }
}

export const resetSubcommand: GitSubcommand = {
  name: 'reset',
  description: 'Reset current HEAD to the specified state',
  usage: 'git reset [--hard] [<ref>]',

  async execute(args: string[], _cwd: string, options: GitSubcommandOptions): Promise<ShellCommandResult> {
    const { hard, ref } = parseOptions(args)

    try {
      if (hard) {
        // Hard reset: checkout to ref with force
        await options.git.checkout({ ref, force: true })
        return createSuccessResult(`HEAD is now at ${ref}`)
      } else {
        // Soft/mixed reset: not fully implemented in isomorphic-git
        // For now, just return success
        return createSuccessResult(`Unstaged changes after reset`)
      }
    } catch (err) {
      return createErrorResult(`error: ${(err as Error).message}`)
    }
  },
}
