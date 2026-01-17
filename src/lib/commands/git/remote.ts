import type { GitSubcommand, GitSubcommandOptions } from './types'
import type { ShellCommandResult } from '../ShellCommand'
import { createSuccessResult, createErrorResult } from '../ShellCommand'

function parseOptions(args: string[]): { verbose: boolean; action: string | null; name: string | null; url: string | null } {
  let verbose = false
  let action: string | null = null
  let name: string | null = null
  let url: string | null = null

  const nonFlags: string[] = []

  for (const arg of args) {
    if (arg === '-v' || arg === '--verbose') {
      verbose = true
    } else if (!arg.startsWith('-')) {
      nonFlags.push(arg)
    }
  }

  if (nonFlags.length > 0) {
    if (nonFlags[0] === 'add' || nonFlags[0] === 'remove' || nonFlags[0] === 'rm') {
      action = nonFlags[0] === 'rm' ? 'remove' : nonFlags[0]
      name = nonFlags[1] || null
      url = nonFlags[2] || null
    }
  }

  return { verbose, action, name, url }
}

export const remoteSubcommand: GitSubcommand = {
  name: 'remote',
  description: 'Manage remote repositories',
  usage: 'git remote [-v] | git remote add <name> <url> | git remote remove <name>',

  async execute(args: string[], _cwd: string, options: GitSubcommandOptions): Promise<ShellCommandResult> {
    const { verbose, action, name, url } = parseOptions(args)

    try {
      if (action === 'add') {
        if (!name || !url) {
          return createErrorResult('usage: git remote add <name> <url>')
        }
        await options.git.addRemote(name, url)
        return createSuccessResult('')
      }

      if (action === 'remove') {
        if (!name) {
          return createErrorResult('usage: git remote remove <name>')
        }
        await options.git.deleteRemote(name)
        return createSuccessResult('')
      }

      // List remotes
      const remotes = await options.git.listRemotes()
      const lines: string[] = []

      for (const remote of remotes) {
        if (verbose) {
          lines.push(`${remote.remote}\t${remote.url} (fetch)`)
          lines.push(`${remote.remote}\t${remote.url} (push)`)
        } else {
          lines.push(remote.remote)
        }
      }

      return createSuccessResult(lines.join('\n'))
    } catch (err) {
      return createErrorResult(`error: ${(err as Error).message}`)
    }
  },
}
