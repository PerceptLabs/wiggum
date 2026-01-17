import type { Git } from '../../git'
import type { JSRuntimeFS } from '../../fs'
import type { ShellCommand, ShellCommandResult } from '../ShellCommand'
import { createErrorResult } from '../ShellCommand'
import type { GitSubcommand, GitSubcommandOptions } from './types'

import { initSubcommand } from './init'
import { statusSubcommand } from './status'
import { addSubcommand } from './add'
import { commitSubcommand } from './commit'
import { logSubcommand } from './log'
import { branchSubcommand } from './branch'
import { checkoutSubcommand } from './checkout'
import { remoteSubcommand } from './remote'
import { pushSubcommand } from './push'
import { pullSubcommand } from './pull'
import { fetchSubcommand } from './fetch'
import { diffSubcommand } from './diff'
import { resetSubcommand } from './reset'
import { stashSubcommand } from './stash'

const subcommands: GitSubcommand[] = [
  initSubcommand,
  statusSubcommand,
  addSubcommand,
  commitSubcommand,
  logSubcommand,
  branchSubcommand,
  checkoutSubcommand,
  remoteSubcommand,
  pushSubcommand,
  pullSubcommand,
  fetchSubcommand,
  diffSubcommand,
  resetSubcommand,
  stashSubcommand,
]

/**
 * Git command - dispatches to subcommands
 */
export class GitCommand implements ShellCommand {
  name = 'git'
  description = 'Version control system'
  usage = 'git <command> [<args>]'

  private subcommandMap = new Map<string, GitSubcommand>()

  constructor(
    private fs: JSRuntimeFS,
    private gitFactory: (dir: string) => Git
  ) {
    for (const sub of subcommands) {
      this.subcommandMap.set(sub.name, sub)
    }
  }

  async execute(args: string[], cwd: string): Promise<ShellCommandResult> {
    if (args.length === 0) {
      return this.showUsage()
    }

    const subcommandName = args[0]
    const subcommand = this.subcommandMap.get(subcommandName)

    if (!subcommand) {
      return createErrorResult(`git: '${subcommandName}' is not a git command. See 'git --help'.`)
    }

    const git = this.gitFactory(cwd)
    const options: GitSubcommandOptions = { git, fs: this.fs }

    return subcommand.execute(args.slice(1), cwd, options)
  }

  private showUsage(): ShellCommandResult {
    const lines = [
      'usage: git <command> [<args>]',
      '',
      'These are common Git commands:',
      '',
      'start a working area:',
      '   init       Create an empty Git repository',
      '',
      'work on the current change:',
      '   add        Add file contents to the index',
      '   reset      Reset current HEAD to the specified state',
      '   stash      Stash the changes in a dirty working directory',
      '',
      'examine the history and state:',
      '   diff       Show changes between commits',
      '   log        Show commit logs',
      '   status     Show the working tree status',
      '',
      'grow, mark and tweak your common history:',
      '   branch     List, create, or delete branches',
      '   checkout   Switch branches or restore files',
      '   commit     Record changes to the repository',
      '',
      'collaborate:',
      '   fetch      Download objects and refs from another repository',
      '   pull       Fetch from and integrate with another repository',
      '   push       Update remote refs along with associated objects',
      '   remote     Manage set of tracked repositories',
    ]

    return {
      exitCode: 0,
      stdout: lines.join('\n'),
      stderr: '',
    }
  }

  /**
   * Get list of subcommand names for completion
   */
  getSubcommands(): string[] {
    return Array.from(this.subcommandMap.keys())
  }
}

export type { GitSubcommand, GitSubcommandOptions } from './types'
