import type { GitSubcommand, GitSubcommandOptions } from './types'
import type { ShellCommandResult } from '../ShellCommand'
import { createSuccessResult, createErrorResult } from '../ShellCommand'

function parseOptions(args: string[]): { remote: string; ref: string | null; force: boolean } {
  let remote = 'origin'
  let ref: string | null = null
  let force = false

  const nonFlags: string[] = []

  for (const arg of args) {
    if (arg === '-f' || arg === '--force') {
      force = true
    } else if (!arg.startsWith('-')) {
      nonFlags.push(arg)
    }
  }

  if (nonFlags.length > 0) remote = nonFlags[0]
  if (nonFlags.length > 1) ref = nonFlags[1]

  return { remote, ref, force }
}

export const pushSubcommand: GitSubcommand = {
  name: 'push',
  description: 'Update remote refs along with associated objects',
  usage: 'git push [-f] [<remote>] [<branch>]',

  async execute(args: string[], _cwd: string, options: GitSubcommandOptions): Promise<ShellCommandResult> {
    const { remote, ref, force } = parseOptions(args)

    try {
      await options.git.push({ remote, ref: ref || undefined, force })
      return createSuccessResult(`Everything up-to-date`)
    } catch (err) {
      return createErrorResult(`error: ${(err as Error).message}`)
    }
  },
}
