import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

/**
 * cat - Read and output file contents
 */
export class CatCommand implements ShellCommand {
  name = 'cat'
  description = 'Concatenate and print files'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd, stdin } = options

    // If no args and stdin provided, output stdin
    if (args.length === 0) {
      if (stdin !== undefined) {
        return { exitCode: 0, stdout: stdin, stderr: '' }
      }
      return { exitCode: 1, stdout: '', stderr: 'cat: missing operand' }
    }

    const outputs: string[] = []
    const errors: string[] = []

    for (const arg of args) {
      // Skip flags for now
      if (arg.startsWith('-')) continue

      const filePath = resolvePath(cwd, arg)

      try {
        const content = await fs.readFile(filePath, { encoding: 'utf8' })
        outputs.push(typeof content === 'string' ? content : new TextDecoder().decode(content))
      } catch (err) {
        errors.push(`cat: ${arg}: No such file or directory`)
      }
    }

    if (errors.length > 0 && outputs.length === 0) {
      return { exitCode: 1, stdout: '', stderr: errors.join('\n') }
    }

    return {
      exitCode: errors.length > 0 ? 1 : 0,
      stdout: outputs.join(''),
      stderr: errors.join('\n'),
    }
  }
}
