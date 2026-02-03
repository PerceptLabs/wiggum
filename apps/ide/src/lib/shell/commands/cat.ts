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

    // Parse flags
    let quiet = false
    const files: string[] = []

    for (const arg of args) {
      if (arg === '-q' || arg === '--quiet') {
        quiet = true
      } else if (!arg.startsWith('-')) {
        files.push(arg)
      }
      // Skip other flags silently
    }

    // If no args and stdin provided, output stdin
    if (files.length === 0) {
      if (stdin !== undefined) {
        return { exitCode: 0, stdout: stdin, stderr: '' }
      }
      return { exitCode: 1, stdout: '', stderr: quiet ? '' : 'cat: missing operand' }
    }

    const outputs: string[] = []
    const errors: string[] = []
    let missingCount = 0

    for (const file of files) {
      const filePath = resolvePath(cwd, file)

      try {
        const content = await fs.readFile(filePath, { encoding: 'utf8' })
        outputs.push(typeof content === 'string' ? content : new TextDecoder().decode(content))
      } catch {
        missingCount++
        if (!quiet) {
          errors.push(`cat: ${file}: No such file or directory`)
        }
      }
    }

    // In quiet mode, missing files return exitCode 1 but no stderr
    if (missingCount > 0 && outputs.length === 0) {
      return { exitCode: 1, stdout: '', stderr: errors.join('\n') }
    }

    return {
      exitCode: missingCount > 0 ? 1 : 0,
      stdout: outputs.join(''),
      stderr: errors.join('\n'),
    }
  }
}
