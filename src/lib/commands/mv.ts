import path from 'path-browserify'
import type { JSRuntimeFS } from '../fs'
import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

/**
 * mv - move or rename files and directories
 */
export class MvCommand implements ShellCommand {
  name = 'mv'
  description = 'Move or rename files and directories'
  usage = 'mv <source> <destination>'

  constructor(private fs: JSRuntimeFS) {}

  async execute(args: string[], cwd: string): Promise<ShellCommandResult> {
    // Filter out options (we don't support any)
    const paths = args.filter((arg) => !arg.startsWith('-'))

    if (paths.length < 2) {
      return createErrorResult('mv: missing destination file operand')
    }

    const sources = paths.slice(0, -1)
    const dest = paths[paths.length - 1]
    const destPath = path.isAbsolute(dest) ? dest : path.join(cwd, dest)

    // Check if destination is a directory
    let destIsDir = false
    try {
      const destStat = await this.fs.stat(destPath)
      destIsDir = destStat.isDirectory()
    } catch {
      // Destination doesn't exist
    }

    // Multiple sources require dest to be a directory
    if (sources.length > 1 && !destIsDir) {
      return createErrorResult(`mv: target '${dest}' is not a directory`)
    }

    for (const source of sources) {
      const srcPath = path.isAbsolute(source) ? source : path.join(cwd, source)

      try {
        await this.fs.stat(srcPath)
      } catch {
        return createErrorResult(`mv: cannot stat '${source}': No such file or directory`)
      }

      const targetPath = destIsDir ? path.join(destPath, path.basename(srcPath)) : destPath

      try {
        await this.fs.rename(srcPath, targetPath)
      } catch (err) {
        return createErrorResult(`mv: cannot move '${source}' to '${dest}': ${(err as Error).message}`)
      }
    }

    return createSuccessResult('')
  }
}
