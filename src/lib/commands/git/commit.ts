import type { GitSubcommand, GitSubcommandOptions } from './types'
import type { ShellCommandResult } from '../ShellCommand'
import { createSuccessResult, createErrorResult } from '../ShellCommand'

function parseOptions(args: string[]): { message: string | null; amend: boolean } {
  let message: string | null = null
  let amend = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '-m' && i + 1 < args.length) {
      message = args[++i]
    } else if (arg.startsWith('-m')) {
      message = arg.slice(2)
    } else if (arg === '--amend') {
      amend = true
    }
  }

  return { message, amend }
}

export const commitSubcommand: GitSubcommand = {
  name: 'commit',
  description: 'Record changes to the repository',
  usage: 'git commit -m "message"',

  async execute(args: string[], _cwd: string, options: GitSubcommandOptions): Promise<ShellCommandResult> {
    const { message, amend: _amend } = parseOptions(args)

    if (!message) {
      return createErrorResult('error: switch `m\' requires a value')
    }

    try {
      const oid = await options.git.commit({
        message,
        author: {
          name: (await options.git.getConfig('user.name')) || 'Wiggum User',
          email: (await options.git.getConfig('user.email')) || 'user@wiggum.local',
        },
      })

      const branch = await options.git.currentBranch()
      const shortOid = oid.slice(0, 7)

      return createSuccessResult(`[${branch || 'HEAD'} ${shortOid}] ${message}`)
    } catch (err) {
      return createErrorResult(`error: ${(err as Error).message}`)
    }
  },
}
