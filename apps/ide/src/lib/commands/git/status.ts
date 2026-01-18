import type { GitSubcommand, GitSubcommandOptions } from './types'
import type { ShellCommandResult } from '../ShellCommand'
import { createSuccessResult, createErrorResult } from '../ShellCommand'

export const statusSubcommand: GitSubcommand = {
  name: 'status',
  description: 'Show the working tree status',
  usage: 'git status',

  async execute(_args: string[], _cwd: string, options: GitSubcommandOptions): Promise<ShellCommandResult> {
    try {
      const branch = await options.git.currentBranch()
      const statusList = await options.git.status()

      const lines: string[] = []
      lines.push(`On branch ${branch || '(no branch)'}`)

      if (!Array.isArray(statusList)) {
        return createSuccessResult(lines.join('\n'))
      }

      const staged: string[] = []
      const unstaged: string[] = []
      const untracked: string[] = []

      for (const file of statusList) {
        // head=0 means absent in HEAD
        // workdir: 0=absent, 1=identical to stage, 2=modified
        // stage: 0=absent, 1=identical to HEAD, 2=modified from HEAD, 3=added

        if (file.head === 0 && file.stage === 3) {
          staged.push(`\tnew file:   ${file.filepath}`)
        } else if (file.head === 1 && file.stage === 2) {
          staged.push(`\tmodified:   ${file.filepath}`)
        } else if (file.head === 1 && file.stage === 0) {
          staged.push(`\tdeleted:    ${file.filepath}`)
        }

        if (file.stage !== 0 && file.workdir === 2) {
          unstaged.push(`\tmodified:   ${file.filepath}`)
        } else if (file.stage !== 0 && file.workdir === 0) {
          unstaged.push(`\tdeleted:    ${file.filepath}`)
        }

        if (file.head === 0 && file.workdir === 2 && file.stage === 0) {
          untracked.push(`\t${file.filepath}`)
        }
      }

      if (staged.length > 0) {
        lines.push('')
        lines.push('Changes to be committed:')
        lines.push('  (use "git restore --staged <file>..." to unstage)')
        lines.push(...staged)
      }

      if (unstaged.length > 0) {
        lines.push('')
        lines.push('Changes not staged for commit:')
        lines.push('  (use "git add <file>..." to update what will be committed)')
        lines.push(...unstaged)
      }

      if (untracked.length > 0) {
        lines.push('')
        lines.push('Untracked files:')
        lines.push('  (use "git add <file>..." to include in what will be committed)')
        lines.push(...untracked)
      }

      if (staged.length === 0 && unstaged.length === 0 && untracked.length === 0) {
        lines.push('')
        lines.push('nothing to commit, working tree clean')
      }

      return createSuccessResult(lines.join('\n'))
    } catch (err) {
      return createErrorResult(`fatal: ${(err as Error).message}`)
    }
  },
}
