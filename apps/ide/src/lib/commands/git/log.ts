import type { GitSubcommand, GitSubcommandOptions } from './types'
import type { ShellCommandResult } from '../ShellCommand'
import { createSuccessResult, createErrorResult } from '../ShellCommand'

function parseOptions(args: string[]): { oneline: boolean; count: number } {
  let oneline = false
  let count = 10

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--oneline') {
      oneline = true
    } else if (arg === '-n' && i + 1 < args.length) {
      count = parseInt(args[++i], 10)
    } else if (arg.startsWith('-n')) {
      count = parseInt(arg.slice(2), 10)
    } else if (/^-\d+$/.test(arg)) {
      count = parseInt(arg.slice(1), 10)
    }
  }

  return { oneline, count: isNaN(count) ? 10 : count }
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()} ${date.toTimeString().slice(0, 8)} ${date.getFullYear()}`
}

export const logSubcommand: GitSubcommand = {
  name: 'log',
  description: 'Show commit logs',
  usage: 'git log [--oneline] [-n <number>]',

  async execute(args: string[], _cwd: string, options: GitSubcommandOptions): Promise<ShellCommandResult> {
    const { oneline, count } = parseOptions(args)

    try {
      const commits = await options.git.log({ depth: count })
      const lines: string[] = []

      for (const entry of commits) {
        if (oneline) {
          lines.push(`${entry.oid.slice(0, 7)} ${entry.commit.message.split('\n')[0]}`)
        } else {
          lines.push(`commit ${entry.oid}`)
          lines.push(`Author: ${entry.commit.author.name} <${entry.commit.author.email}>`)
          if (entry.commit.author.timestamp) {
            lines.push(`Date:   ${formatDate(entry.commit.author.timestamp)}`)
          }
          lines.push('')
          lines.push(`    ${entry.commit.message.split('\n').join('\n    ')}`)
          lines.push('')
        }
      }

      return createSuccessResult(lines.join('\n').trimEnd())
    } catch (err) {
      return createErrorResult(`fatal: ${(err as Error).message}`)
    }
  },
}
