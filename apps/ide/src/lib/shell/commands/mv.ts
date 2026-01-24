import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

/**
 * mv - Move/rename files and directories
 */
export class MvCommand implements ShellCommand {
  name = 'mv'
  description = 'Move (rename) files'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options

    // Parse arguments (skip flags for simplicity)
    const paths: string[] = []

    for (const arg of args) {
      if (!arg.startsWith('-')) {
        paths.push(arg)
      }
    }

    if (paths.length < 2) {
      return { exitCode: 1, stdout: '', stderr: 'mv: missing destination file operand' }
    }

    const dest = paths.pop()!
    const sources = paths

    const errors: string[] = []

    // Check if destination is a directory
    let destIsDir = false
    let destPath = resolvePath(cwd, dest)

    try {
      const destStat = await fs.stat(destPath)
      destIsDir = destStat.isDirectory()
    } catch {
      // Destination doesn't exist
    }

    // If multiple sources, destination must be a directory
    if (sources.length > 1 && !destIsDir) {
      return { exitCode: 1, stdout: '', stderr: `mv: target '${dest}' is not a directory` }
    }

    for (const source of sources) {
      const sourcePath = resolvePath(cwd, source)
      const finalDest = destIsDir ? `${destPath}/${getBasename(source)}` : destPath

      try {
        await fs.rename(sourcePath, finalDest)
      } catch (err) {
        errors.push(`mv: cannot move '${source}': ${err}`)
      }
    }

    return {
      exitCode: errors.length > 0 ? 1 : 0,
      stdout: '',
      stderr: errors.join('\n'),
    }
  }
}

function getBasename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || parts[parts.length - 2] || path
}
