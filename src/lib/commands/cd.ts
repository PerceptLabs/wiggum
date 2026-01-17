import path from 'path-browserify'
import type { JSRuntimeFS } from '../fs'
import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

/**
 * cd - change directory
 */
export class CdCommand implements ShellCommand {
  name = 'cd'
  description = 'Change the current working directory'
  usage = 'cd [directory]'

  constructor(private fs: JSRuntimeFS) {}

  async execute(args: string[], cwd: string): Promise<ShellCommandResult> {
    // cd with no args goes to root (in browser context)
    if (args.length === 0) {
      return createSuccessResult('', '/')
    }

    const target = args[0]
    let newPath: string

    if (target === '-') {
      // cd - would go to previous directory, but we don't track that
      return createErrorResult('cd: OLDPWD not set')
    }

    if (target === '~') {
      // Home directory - use root in browser context
      newPath = '/'
    } else if (path.isAbsolute(target)) {
      newPath = path.normalize(target)
    } else {
      newPath = path.normalize(path.join(cwd, target))
    }

    // Ensure path starts with /
    if (!newPath.startsWith('/')) {
      newPath = '/' + newPath
    }

    // Handle trailing slashes (except for root)
    if (newPath !== '/' && newPath.endsWith('/')) {
      newPath = newPath.slice(0, -1)
    }

    try {
      const stat = await this.fs.stat(newPath)
      if (!stat.isDirectory()) {
        return createErrorResult(`cd: ${target}: Not a directory`)
      }
      return createSuccessResult('', newPath)
    } catch {
      return createErrorResult(`cd: ${target}: No such file or directory`)
    }
  }
}
