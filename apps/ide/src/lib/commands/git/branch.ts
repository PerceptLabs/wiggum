import type { GitSubcommand, GitSubcommandOptions } from './types'
import type { ShellCommandResult } from '../ShellCommand'
import { createSuccessResult, createErrorResult } from '../ShellCommand'

function parseOptions(args: string[]): { all: boolean; delete: string | null; branchName: string | null } {
  let all = false
  let deleteRef: string | null = null
  let branchName: string | null = null

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '-a' || arg === '--all') {
      all = true
    } else if ((arg === '-d' || arg === '-D' || arg === '--delete') && i + 1 < args.length) {
      deleteRef = args[++i]
    } else if (!arg.startsWith('-')) {
      branchName = arg
    }
  }

  return { all, delete: deleteRef, branchName }
}

export const branchSubcommand: GitSubcommand = {
  name: 'branch',
  description: 'List, create, or delete branches',
  usage: 'git branch [-a] [-d <branch>] [<name>]',

  async execute(args: string[], _cwd: string, options: GitSubcommandOptions): Promise<ShellCommandResult> {
    const { all, delete: deleteRef, branchName } = parseOptions(args)

    try {
      // Delete branch
      if (deleteRef) {
        await options.git.deleteBranch(deleteRef)
        return createSuccessResult(`Deleted branch ${deleteRef}`)
      }

      // Create branch
      if (branchName) {
        await options.git.branch({ ref: branchName })
        return createSuccessResult('')
      }

      // List branches
      const currentBranch = await options.git.currentBranch()
      const localBranches = await options.git.listBranches()
      const lines: string[] = []

      for (const branch of localBranches) {
        if (branch === currentBranch) {
          lines.push(`* ${branch}`)
        } else {
          lines.push(`  ${branch}`)
        }
      }

      if (all) {
        try {
          const remoteBranches = await options.git.listBranches('origin')
          for (const branch of remoteBranches) {
            lines.push(`  remotes/origin/${branch}`)
          }
        } catch {
          // No remotes
        }
      }

      return createSuccessResult(lines.join('\n'))
    } catch (err) {
      return createErrorResult(`error: ${(err as Error).message}`)
    }
  },
}
