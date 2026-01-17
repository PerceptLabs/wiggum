import type { GitSubcommand, GitSubcommandOptions } from './types'
import type { ShellCommandResult } from '../ShellCommand'
import { createSuccessResult, createErrorResult } from '../ShellCommand'

export const addSubcommand: GitSubcommand = {
  name: 'add',
  description: 'Add file contents to the index',
  usage: 'git add <file>... | git add .',

  async execute(args: string[], _cwd: string, options: GitSubcommandOptions): Promise<ShellCommandResult> {
    if (args.length === 0) {
      return createErrorResult('Nothing specified, nothing added.')
    }

    try {
      for (const arg of args) {
        if (arg === '.' || arg === '-A' || arg === '--all') {
          await options.git.addAll()
        } else if (!arg.startsWith('-')) {
          await options.git.add(arg)
        }
      }
      return createSuccessResult('')
    } catch (err) {
      return createErrorResult(`fatal: ${(err as Error).message}`)
    }
  },
}
