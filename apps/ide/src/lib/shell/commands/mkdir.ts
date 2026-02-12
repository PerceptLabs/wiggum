import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

/**
 * mkdir - Create directories
 * Supports -p (create parent directories)
 */
export class MkdirCommand implements ShellCommand {
  name = 'mkdir'
  description = 'Create directories'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options

    // Parse flags
    let recursive = false
    const dirs: string[] = []

    for (const arg of args) {
      if (arg === '-p' || arg === '--parents') {
        recursive = true
      } else if (!arg.startsWith('-')) {
        dirs.push(arg)
      }
    }

    if (dirs.length === 0) {
      return { exitCode: 1, stdout: '', stderr: 'mkdir: missing operand' }
    }

    const errors: string[] = []
    const changedPaths: string[] = []

    for (const dir of dirs) {
      const dirPath = resolvePath(cwd, dir)

      try {
        await fs.mkdir(dirPath, { recursive })
        changedPaths.push(dirPath)
      } catch (err) {
        if (recursive) {
          // With -p, silently ignore if directory exists
          try {
            const stat = await fs.stat(dirPath)
            if (!stat.isDirectory()) {
              errors.push(`mkdir: cannot create directory '${dir}': File exists`)
            }
          } catch {
            errors.push(`mkdir: cannot create directory '${dir}': ${err}`)
          }
        } else {
          errors.push(`mkdir: cannot create directory '${dir}': ${err}`)
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
