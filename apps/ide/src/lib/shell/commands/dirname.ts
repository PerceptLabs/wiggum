import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { dirname as getDirname } from './utils'

/**
 * dirname - Strip last component from file name
 * Usage: dirname PATH
 * Also reads from stdin when piped
 */
export class DirnameCommand implements ShellCommand {
  name = 'dirname'
  description = 'Strip last component from file name'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { stdin } = options

    if (args.length === 0) {
      if (stdin !== undefined) {
        const lines = stdin.trim().split('\n')
        const results = lines.map((line) => getDirname(line.trim()))
        return { exitCode: 0, stdout: results.join('\n') + '\n', stderr: '' }
      }
      return { exitCode: 1, stdout: '', stderr: 'dirname: missing operand' }
    }

    const result = getDirname(args[0])
    return { exitCode: 0, stdout: result + '\n', stderr: '' }
  }
}
