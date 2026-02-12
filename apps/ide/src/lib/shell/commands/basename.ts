import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { basename as getBasename } from './utils'

/**
 * basename - Strip directory and suffix from filenames
 * Usage: basename PATH [SUFFIX]
 * Also reads from stdin when piped
 */
export class BasenameCommand implements ShellCommand {
  name = 'basename'
  description = 'Strip directory and suffix from filenames'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { stdin } = options

    // If no args, use stdin
    if (args.length === 0) {
      if (stdin !== undefined) {
        const lines = stdin.trim().split('\n')
        const results = lines.map((line) => getBasename(line.trim()))
        return { exitCode: 0, stdout: results.join('\n') + '\n', stderr: '' }
      }
      return { exitCode: 1, stdout: '', stderr: 'basename: missing operand' }
    }

    const pathArg = args[0]
    const suffix = args[1]
    let result = getBasename(pathArg)

    // Remove suffix if provided
    if (suffix && result.endsWith(suffix)) {
      result = result.slice(0, -suffix.length)
    }

    return { exitCode: 0, stdout: result + '\n', stderr: '' }
  }
}
