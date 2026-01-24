import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

/**
 * sort - Sort lines of text
 * Supports -r (reverse), -n (numeric), -u (unique)
 */
export class SortCommand implements ShellCommand {
  name = 'sort'
  description = 'Sort lines of text files'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd, stdin } = options

    // Parse flags
    let reverse = false
    let numeric = false
    let unique = false
    const files: string[] = []

    for (const arg of args) {
      if (arg.startsWith('-') && arg.length > 1) {
        if (arg.includes('r')) reverse = true
        if (arg.includes('n')) numeric = true
        if (arg.includes('u')) unique = true
      } else if (arg === '--reverse') {
        reverse = true
      } else if (arg === '--numeric-sort') {
        numeric = true
      } else if (arg === '--unique') {
        unique = true
      } else {
        files.push(arg)
      }
    }

    let content = ''
    const errors: string[] = []

    // If no files and stdin provided, use stdin
    if (files.length === 0 && stdin !== undefined) {
      content = stdin
    } else if (files.length === 0) {
      return { exitCode: 1, stdout: '', stderr: 'sort: missing file operand' }
    } else {
      // Concatenate all files
      for (const file of files) {
        const filePath = resolvePath(cwd, file)

        try {
          const fileContent = await fs.readFile(filePath, { encoding: 'utf8' })
          content += typeof fileContent === 'string' ? fileContent : new TextDecoder().decode(fileContent)
        } catch {
          errors.push(`sort: cannot read: ${file}: No such file or directory`)
        }
      }
    }

    if (content.length === 0) {
      return {
        exitCode: errors.length > 0 ? 1 : 0,
        stdout: '',
        stderr: errors.join('\n'),
      }
    }

    // Split into lines and sort
    let lines = content.split('\n')

    // Remove trailing empty line if present
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop()
    }

    // Sort lines
    if (numeric) {
      lines.sort((a, b) => {
        const numA = parseFloat(a) || 0
        const numB = parseFloat(b) || 0
        return numA - numB
      })
    } else {
      lines.sort()
    }

    if (reverse) {
      lines.reverse()
    }

    if (unique) {
      lines = [...new Set(lines)]
    }

    return {
      exitCode: errors.length > 0 ? 1 : 0,
      stdout: lines.join('\n') + '\n',
      stderr: errors.join('\n'),
    }
  }
}
