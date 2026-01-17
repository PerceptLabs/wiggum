import type { GitSubcommand, GitSubcommandOptions } from './types'
import type { ShellCommandResult } from '../ShellCommand'
import { createSuccessResult, createErrorResult } from '../ShellCommand'

function parseOptions(args: string[]): { action: string; message: string | null } {
  let action = 'push' // default action
  let message: string | null = null

  const nonFlags: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '-m' && i + 1 < args.length) {
      message = args[++i]
    } else if (!arg.startsWith('-')) {
      nonFlags.push(arg)
    }
  }

  if (nonFlags.length > 0) {
    action = nonFlags[0]
  }

  return { action, message }
}

export const stashSubcommand: GitSubcommand = {
  name: 'stash',
  description: 'Stash the changes in a dirty working directory',
  usage: 'git stash [push [-m <message>] | pop | list]',

  async execute(args: string[], _cwd: string, options: GitSubcommandOptions): Promise<ShellCommandResult> {
    const { action, message } = parseOptions(args)

    try {
      switch (action) {
        case 'push':
        case 'save': {
          await options.git.stash(message || undefined)
          return createSuccessResult('Saved working directory and index state')
        }

        case 'pop': {
          await options.git.stashPop()
          return createSuccessResult('Dropped refs/stash')
        }

        case 'list': {
          const stashes = await options.git.stashList()
          if (stashes.length === 0) {
            return createSuccessResult('')
          }
          const lines = stashes.map((s) => `stash@{${s.index}}: ${s.message}`)
          return createSuccessResult(lines.join('\n'))
        }

        default:
          return createErrorResult(`error: unknown subcommand: ${action}`)
      }
    } catch (err) {
      return createErrorResult(`error: ${(err as Error).message}`)
    }
  },
}
