import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

/**
 * tac - Reverse cat: output file contents in reverse line order
 * Usage: tac [file...]
 * Also reads from stdin when piped
 */
export class TacCommand implements ShellCommand {
  name = 'tac'
  description = 'Concatenate and print files in reverse'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd, stdin } = options

    // If no args, use stdin
    if (args.length === 0) {
      if (stdin !== undefined) {
        const lines = stdin.split('\n')
        // Remove trailing empty line from split if present
        if (lines[lines.length - 1] === '') lines.pop()
        return { exitCode: 0, stdout: lines.reverse().join('\n') + '\n', stderr: '' }
      }
      return { exitCode: 1, stdout: '', stderr: 'tac: no input' }
    }

    const outputs: string[] = []
    for (const file of args) {
      if (file.startsWith('-')) continue

      const filePath = resolvePath(cwd, file)
      try {
        const data = await fs.readFile(filePath, { encoding: 'utf8' })
        const content = typeof data === 'string' ? data : new TextDecoder().decode(data)
        const lines = content.split('\n')
        if (lines[lines.length - 1] === '') lines.pop()
        outputs.push(lines.reverse().join('\n'))
      } catch {
        return { exitCode: 1, stdout: '', stderr: `tac: ${file}: No such file or directory` }
      }
    }

    return { exitCode: 0, stdout: outputs.join('\n') + '\n', stderr: '' }
  }
}
