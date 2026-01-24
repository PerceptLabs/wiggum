import type { ShellCommand, ShellOptions, ShellResult } from '../types'

/**
 * git - Git operations wrapper
 * Supports: status, add, commit, log, diff, branch, checkout, init
 */
export class GitCommand implements ShellCommand {
  name = 'git'
  description = 'Git version control'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { git } = options

    if (!git) {
      return { exitCode: 1, stdout: '', stderr: 'git: git is not available' }
    }

    if (args.length === 0) {
      return { exitCode: 1, stdout: '', stderr: 'usage: git <command> [<args>]' }
    }

    const subcommand = args[0]
    const subArgs = args.slice(1)

    try {
      switch (subcommand) {
        case 'init':
          return await this.gitInit(git, subArgs)
        case 'status':
          return await this.gitStatus(git)
        case 'add':
          return await this.gitAdd(git, subArgs)
        case 'commit':
          return await this.gitCommit(git, subArgs)
        case 'log':
          return await this.gitLog(git, subArgs)
        case 'diff':
          return await this.gitDiff(git, subArgs)
        case 'branch':
          return await this.gitBranch(git, subArgs)
        case 'checkout':
          return await this.gitCheckout(git, subArgs)
        case 'remote':
          return await this.gitRemote(git, subArgs)
        default:
          return { exitCode: 1, stdout: '', stderr: `git: '${subcommand}' is not a git command` }
      }
    } catch (err) {
      return { exitCode: 1, stdout: '', stderr: `git: ${err}` }
    }
  }

  private async gitInit(git: NonNullable<ShellOptions['git']>, args: string[]): Promise<ShellResult> {
    const branch = args.includes('-b') ? args[args.indexOf('-b') + 1] : 'main'
    await git.init(branch)
    return { exitCode: 0, stdout: `Initialized empty Git repository\n`, stderr: '' }
  }

  private async gitStatus(git: NonNullable<ShellOptions['git']>): Promise<ShellResult> {
    const branch = await git.currentBranch()
    const statusList = await git.status()
    const statuses = Array.isArray(statusList) ? statusList : [statusList]

    const lines: string[] = [`On branch ${branch || '(no branch)'}`, '']

    const staged: string[] = []
    const unstaged: string[] = []
    const untracked: string[] = []

    for (const status of statuses) {
      // head=0 means file not in HEAD, head=1 means file in HEAD
      // workdir=0 absent, workdir=1 same as stage, workdir=2 modified
      // stage=0 absent, stage=1 same as HEAD, stage=2 modified, stage=3 added

      if (status.stage === 3 || (status.stage === 2 && status.head === 1)) {
        // Staged changes
        if (status.head === 0) {
          staged.push(`  new file:   ${status.filepath}`)
        } else {
          staged.push(`  modified:   ${status.filepath}`)
        }
      }

      if (status.workdir === 2 && status.stage !== 3) {
        // Unstaged changes
        if (status.head === 0 && status.stage === 0) {
          untracked.push(`  ${status.filepath}`)
        } else {
          unstaged.push(`  modified:   ${status.filepath}`)
        }
      }

      if (status.head === 0 && status.workdir === 2 && status.stage === 0) {
        untracked.push(`  ${status.filepath}`)
      }
    }

    if (staged.length > 0) {
      lines.push('Changes to be committed:')
      lines.push('  (use "git restore --staged <file>..." to unstage)')
      lines.push('')
      lines.push(...staged)
      lines.push('')
    }

    if (unstaged.length > 0) {
      lines.push('Changes not staged for commit:')
      lines.push('  (use "git add <file>..." to update what will be committed)')
      lines.push('')
      lines.push(...unstaged)
      lines.push('')
    }

    if (untracked.length > 0) {
      lines.push('Untracked files:')
      lines.push('  (use "git add <file>..." to include in what will be committed)')
      lines.push('')
      lines.push(...untracked)
      lines.push('')
    }

    if (staged.length === 0 && unstaged.length === 0 && untracked.length === 0) {
      lines.push('nothing to commit, working tree clean')
    }

    return { exitCode: 0, stdout: lines.join('\n') + '\n', stderr: '' }
  }

  private async gitAdd(git: NonNullable<ShellOptions['git']>, args: string[]): Promise<ShellResult> {
    if (args.length === 0) {
      return { exitCode: 1, stdout: '', stderr: 'Nothing specified, nothing added.' }
    }

    for (const arg of args) {
      if (arg === '.' || arg === '-A' || arg === '--all') {
        await git.addAll()
      } else {
        await git.add(arg)
      }
    }

    return { exitCode: 0, stdout: '', stderr: '' }
  }

  private async gitCommit(git: NonNullable<ShellOptions['git']>, args: string[]): Promise<ShellResult> {
    let message = ''

    for (let i = 0; i < args.length; i++) {
      if ((args[i] === '-m' || args[i] === '--message') && i + 1 < args.length) {
        message = args[i + 1]
        break
      }
    }

    if (!message) {
      return { exitCode: 1, stdout: '', stderr: 'error: empty commit message' }
    }

    const oid = await git.commit({ message })
    const shortOid = oid.slice(0, 7)
    const branch = await git.currentBranch()

    return {
      exitCode: 0,
      stdout: `[${branch} ${shortOid}] ${message}\n`,
      stderr: '',
    }
  }

  private async gitLog(git: NonNullable<ShellOptions['git']>, args: string[]): Promise<ShellResult> {
    let depth = 10

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-n' && i + 1 < args.length) {
        depth = parseInt(args[i + 1], 10)
      } else if (args[i].startsWith('-n')) {
        depth = parseInt(args[i].slice(2), 10)
      } else if (args[i].match(/^-\d+$/)) {
        depth = parseInt(args[i].slice(1), 10)
      }
    }

    const entries = await git.log({ depth })
    const lines: string[] = []

    for (const entry of entries) {
      lines.push(`commit ${entry.oid}`)
      lines.push(`Author: ${entry.commit.author.name} <${entry.commit.author.email}>`)

      const date = new Date(entry.commit.author.timestamp! * 1000)
      lines.push(`Date:   ${date.toUTCString()}`)
      lines.push('')
      lines.push(`    ${entry.commit.message.trim()}`)
      lines.push('')
    }

    return { exitCode: 0, stdout: lines.join('\n'), stderr: '' }
  }

  private async gitDiff(git: NonNullable<ShellOptions['git']>, args: string[]): Promise<ShellResult> {
    let ref1: string | undefined
    let ref2: string | undefined

    const nonFlagArgs = args.filter((a) => !a.startsWith('-'))
    if (nonFlagArgs.length >= 2) {
      ref1 = nonFlagArgs[0]
      ref2 = nonFlagArgs[1]
    } else if (nonFlagArgs.length === 1) {
      ref1 = nonFlagArgs[0]
    }

    const diffEntries = await git.diff({ ref1, ref2 })
    const lines: string[] = []

    for (const entry of diffEntries) {
      const prefix =
        entry.type === 'add' ? '+' : entry.type === 'remove' ? '-' : entry.type === 'modify' ? 'M' : ' '
      lines.push(`${prefix} ${entry.filepath}`)
    }

    return { exitCode: 0, stdout: lines.join('\n') + (lines.length > 0 ? '\n' : ''), stderr: '' }
  }

  private async gitBranch(git: NonNullable<ShellOptions['git']>, args: string[]): Promise<ShellResult> {
    // List branches if no args
    if (args.length === 0 || args[0] === '-l' || args[0] === '--list') {
      const branches = await git.listBranches()
      const current = await git.currentBranch()

      const lines = branches.map((b) => (b === current ? `* ${b}` : `  ${b}`))
      return { exitCode: 0, stdout: lines.join('\n') + '\n', stderr: '' }
    }

    // Delete branch
    if (args[0] === '-d' || args[0] === '-D' || args[0] === '--delete') {
      if (args.length < 2) {
        return { exitCode: 1, stdout: '', stderr: 'error: branch name required' }
      }
      await git.deleteBranch(args[1])
      return { exitCode: 0, stdout: `Deleted branch ${args[1]}\n`, stderr: '' }
    }

    // Create branch
    await git.branch({ ref: args[0] })
    return { exitCode: 0, stdout: '', stderr: '' }
  }

  private async gitCheckout(git: NonNullable<ShellOptions['git']>, args: string[]): Promise<ShellResult> {
    if (args.length === 0) {
      return { exitCode: 1, stdout: '', stderr: 'error: pathspec required' }
    }

    let ref = args[0]
    let createBranch = false

    if (args[0] === '-b' && args.length > 1) {
      createBranch = true
      ref = args[1]
    }

    if (createBranch) {
      await git.branch({ ref, checkout: true })
    } else {
      await git.checkout({ ref })
    }

    return { exitCode: 0, stdout: `Switched to branch '${ref}'\n`, stderr: '' }
  }

  private async gitRemote(git: NonNullable<ShellOptions['git']>, args: string[]): Promise<ShellResult> {
    if (args.length === 0 || args[0] === '-v') {
      const remotes = await git.listRemotes()
      const lines = remotes.map((r) => `${r.remote}\t${r.url} (fetch)\n${r.remote}\t${r.url} (push)`)
      return { exitCode: 0, stdout: lines.join('\n') + (lines.length > 0 ? '\n' : ''), stderr: '' }
    }

    if (args[0] === 'add' && args.length >= 3) {
      await git.addRemote(args[1], args[2])
      return { exitCode: 0, stdout: '', stderr: '' }
    }

    if ((args[0] === 'remove' || args[0] === 'rm') && args.length >= 2) {
      await git.deleteRemote(args[1])
      return { exitCode: 0, stdout: '', stderr: '' }
    }

    return { exitCode: 1, stdout: '', stderr: `git remote: unknown subcommand '${args[0]}'` }
  }
}
