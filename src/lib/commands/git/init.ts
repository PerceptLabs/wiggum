import type { GitSubcommand, GitSubcommandOptions } from './types'
import type { ShellCommandResult } from '../ShellCommand'
import { createSuccessResult, createErrorResult } from '../ShellCommand'

export const initSubcommand: GitSubcommand = {
  name: 'init',
  description: 'Initialize a new git repository',
  usage: 'git init',

  async execute(_args: string[], _cwd: string, options: GitSubcommandOptions): Promise<ShellCommandResult> {
    try {
      await options.git.init()
      return createSuccessResult('Initialized empty Git repository')
    } catch (err) {
      return createErrorResult(`fatal: ${(err as Error).message}`)
    }
  },
}
