import type { GitSubcommand, GitSubcommandOptions } from './types'
import type { ShellCommandResult } from '../ShellCommand'
import { createSuccessResult, createErrorResult } from '../ShellCommand'

function parseOptions(args: string[]): { remote: string; ref: string | null } {
  let remote = 'origin'
  let ref: string | null = null

  const nonFlags: string[] = []

  for (const arg of args) {
    if (!arg.startsWith('-')) {
      nonFlags.push(arg)
    }
  }

  if (nonFlags.length > 0) remote = nonFlags[0]
  if (nonFlags.length > 1) ref = nonFlags[1]

  return { remote, ref }
}

export const fetchSubcommand: GitSubcommand = {
  name: 'fetch',
  description: 'Download objects and refs from another repository',
  usage: 'git fetch [<remote>] [<branch>]',

  async execute(args: string[], _cwd: string, options: GitSubcommandOptions): Promise<ShellCommandResult> {
    const { remote, ref } = parseOptions(args)

    try {
      await options.git.fetch({ remote, ref: ref || undefined })
      return createSuccessResult('')
    } catch (err) {
      return createErrorResult(`error: ${(err as Error).message}`)
    }
  },
}
