import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

/**
 * rmdir - Remove empty directories
 */
export class RmdirCommand implements ShellCommand {
  name = 'rmdir'
  description = 'Remove empty directories'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options

    // Filter out any flags (none supported currently)
    const dirs = args.filter((arg) => !arg.startsWith('-'))

    if (dirs.length === 0) {
      return { exitCode: 1, stdout: '', stderr: 'rmdir: missing operand' }
    }

    const errors: string[] = []
    const changedPaths: string[] = []

    for (const dir of dirs) {
      const dirPath = resolvePath(cwd, dir)

      try {
        // Check if directory exists and is actually a directory
        const stat = await fs.stat(dirPath)
        if (!stat.isDirectory()) {
          errors.push(`rmdir: failed to remove '${dir}': Not a directory`)
          continue
        }

        // Check if directory is empty
        const entries = await fs.readdir(dirPath)
        if (entries.length > 0) {
          errors.push(`rmdir: failed to remove '${dir}': Directory not empty`)
          continue
        }

        // Remove the empty directory
        await fs.rmdir(dirPath)
        changedPaths.push(dirPath)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (message.includes('ENOENT') || message.includes('no such')) {
          errors.push(`rmdir: failed to remove '${dir}': No such file or directory`)
        } else {
          errors.push(`rmdir: failed to remove '${dir}': ${message}`)
        }
      }
    }

    return {
      exitCode: errors.length > 0 ? 1 : 0,
      stdout: '',
      stderr: errors.join('\n'),
      filesChanged: changedPaths.length > 0 ? changedPaths : undefined,
    }
  }
}
