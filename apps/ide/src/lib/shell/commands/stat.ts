import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath, basename } from './utils'

/**
 * stat - Display file status
 * Usage: stat <file>
 */
export class StatCommand implements ShellCommand {
  name = 'stat'
  description = 'Display file status'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options

    if (args.length === 0) {
      return { exitCode: 1, stdout: '', stderr: 'stat: missing operand' }
    }

    const outputs: string[] = []
    for (const file of args) {
      if (file.startsWith('-')) continue

      const filePath = resolvePath(cwd, file)
      try {
        const s = await fs.stat(filePath)
        const type = s.isDirectory() ? 'directory' : 'regular file'
        const size = s.size ?? 0
        const mtime = s.mtimeMs ? new Date(s.mtimeMs).toISOString() : 'unknown'

        outputs.push(
          `  File: ${basename(file)}`,
          `  Size: ${size}\tType: ${type}`,
          `Modify: ${mtime}`,
          ''
        )
      } catch {
        return { exitCode: 1, stdout: '', stderr: `stat: cannot stat '${file}': No such file or directory` }
      }
    }

    return { exitCode: 0, stdout: outputs.join('\n'), stderr: '' }
  }
}
