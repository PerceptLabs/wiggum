import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

/**
 * head - Output first N lines of a file
 * Default is 10 lines, use -n to specify
 */
export class HeadCommand implements ShellCommand {
  name = 'head'
  description = 'Output the first part of files'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd, stdin } = options

    // Parse arguments
    let numLines = 10
    const files: string[] = []

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (arg === '-n' && i + 1 < args.length) {
        numLines = parseInt(args[i + 1], 10)
        if (isNaN(numLines) || numLines < 0) {
          return { exitCode: 1, stdout: '', stderr: `head: invalid number of lines: '${args[i + 1]}'` }
        }
        i++
      } else if (arg.startsWith('-n')) {
        numLines = parseInt(arg.slice(2), 10)
        if (isNaN(numLines) || numLines < 0) {
          return { exitCode: 1, stdout: '', stderr: `head: invalid number of lines: '${arg.slice(2)}'` }
        }
      } else if (arg.match(/^-\d+$/)) {
        numLines = parseInt(arg.slice(1), 10)
      } else if (!arg.startsWith('-')) {
        files.push(arg)
      }
    }

    // If no files and stdin provided, use stdin
    if (files.length === 0 && stdin !== undefined) {
      const lines = stdin.split('\n')
      const output = lines.slice(0, numLines).join('\n')
      return { exitCode: 0, stdout: output + (output && !output.endsWith('\n') ? '\n' : ''), stderr: '' }
    }

    if (files.length === 0) {
      return { exitCode: 1, stdout: '', stderr: 'head: missing file operand' }
    }

    const outputs: string[] = []
    const errors: string[] = []

    for (const file of files) {
      const filePath = resolvePath(cwd, file)

      try {
        const content = await fs.readFile(filePath, { encoding: 'utf8' })
        const text = typeof content === 'string' ? content : new TextDecoder().decode(content)
        const lines = text.split('\n')
        const output = lines.slice(0, numLines).join('\n')

        if (files.length > 1) {
          outputs.push(`==> ${file} <==`)
        }
        outputs.push(output)
      } catch {
        errors.push(`head: cannot open '${file}' for reading: No such file or directory`)
      }
    }

    let stdout = outputs.join('\n')
    if (stdout && !stdout.endsWith('\n')) {
      stdout += '\n'
    }

    return {
      exitCode: errors.length > 0 ? 1 : 0,
      stdout,
      stderr: errors.join('\n'),
    }
  }
}
