import type { GitSubcommand, GitSubcommandOptions } from './types'
import type { ShellCommandResult } from '../ShellCommand'
import { createSuccessResult, createErrorResult } from '../ShellCommand'

function parseOptions(args: string[]): { create: boolean; force: boolean; ref: string | null } {
  let create = false
  let force = false
  let ref: string | null = null

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '-b') {
      create = true
    } else if (arg === '-f' || arg === '--force') {
      force = true
    } else if (!arg.startsWith('-')) {
      ref = arg
    }
  }

  return { create, force, ref }
}

export const checkoutSubcommand: GitSubcommand = {
  name: 'checkout',
  description: 'Switch branches or restore working tree files',
  usage: 'git checkout [-b] <branch>',

  async execute(args: string[], _cwd: string, options: GitSubcommandOptions): Promise<ShellCommandResult> {
    const { create, force, ref } = parseOptions(args)

    if (!ref) {
      return createErrorResult('error: you must specify a branch or commit')
    }

    try {
      if (create) {
        await options.git.branch({ ref, checkout: true })
        return createSuccessResult(`Switched to a new branch '${ref}'`)
      }

      await options.git.checkout({ ref, force })
      return createSuccessResult(`Switched to branch '${ref}'`)
    } catch (err) {
      return createErrorResult(`error: ${(err as Error).message}`)
    }
  },
}
