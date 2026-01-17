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

export const pullSubcommand: GitSubcommand = {
  name: 'pull',
  description: 'Fetch from and integrate with another repository or a local branch',
  usage: 'git pull [<remote>] [<branch>]',

  async execute(args: string[], _cwd: string, options: GitSubcommandOptions): Promise<ShellCommandResult> {
    const { remote, ref } = parseOptions(args)

    try {
      const author = {
        name: (await options.git.getConfig('user.name')) || 'Wiggum User',
        email: (await options.git.getConfig('user.email')) || 'user@wiggum.local',
      }

      await options.git.pull({ remote, ref: ref || undefined, author })
      return createSuccessResult('Already up to date.')
    } catch (err) {
      return createErrorResult(`error: ${(err as Error).message}`)
    }
  },
}
