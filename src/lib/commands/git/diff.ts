import type { GitSubcommand, GitSubcommandOptions } from './types'
import type { ShellCommandResult } from '../ShellCommand'
import { createSuccessResult, createErrorResult } from '../ShellCommand'

export const diffSubcommand: GitSubcommand = {
  name: 'diff',
  description: 'Show changes between commits, commit and working tree, etc',
  usage: 'git diff [<file>]',

  async execute(args: string[], _cwd: string, options: GitSubcommandOptions): Promise<ShellCommandResult> {
    const filepath = args.find((arg) => !arg.startsWith('-'))

    try {
      const diffs = await options.git.diff({ filepath })
      const lines: string[] = []

      for (const diff of diffs) {
        const prefix = diff.type === 'add' ? '+' : diff.type === 'remove' ? '-' : 'M'
        lines.push(`${prefix} ${diff.filepath}`)
      }

      if (lines.length === 0) {
        return createSuccessResult('')
      }

      return createSuccessResult(lines.join('\n'))
    } catch (err) {
      return createErrorResult(`error: ${(err as Error).message}`)
    }
  },
}
