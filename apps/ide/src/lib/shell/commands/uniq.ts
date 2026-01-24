import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

/**
 * uniq - Remove duplicate adjacent lines
 * Supports -c (count), -d (only duplicates), -u (only unique)
 */
export class UniqCommand implements ShellCommand {
  name = 'uniq'
  description = 'Report or omit repeated lines'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd, stdin } = options

    // Parse flags
    let count = false
    let onlyDuplicates = false
    let onlyUnique = false
    const files: string[] = []

    for (const arg of args) {
      if (arg.startsWith('-') && arg.length > 1) {
        if (arg.includes('c')) count = true
        if (arg.includes('d')) onlyDuplicates = true
        if (arg.includes('u')) onlyUnique = true
      } else if (arg === '--count') {
        count = true
      } else if (arg === '--repeated') {
        onlyDuplicates = true
      } else if (arg === '--unique') {
        onlyUnique = true
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
      return { exitCode: 1, stdout: '', stderr: 'uniq: missing file operand' }
    } else {
      // Read first file only (uniq typically takes one file)
      const filePath = resolvePath(cwd, files[0])

      try {
        const fileContent = await fs.readFile(filePath, { encoding: 'utf8' })
        content = typeof fileContent === 'string' ? fileContent : new TextDecoder().decode(fileContent)
      } catch {
        errors.push(`uniq: ${files[0]}: No such file or directory`)
      }
    }

    if (content.length === 0) {
      return {
        exitCode: errors.length > 0 ? 1 : 0,
        stdout: '',
        stderr: errors.join('\n'),
      }
    }

    // Split into lines
    const lines = content.split('\n')

    // Remove trailing empty line if present
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop()
    }

    // Process lines - uniq removes adjacent duplicates
    const result: { line: string; count: number }[] = []
    let prevLine: string | null = null
    let currentCount = 0

    for (const line of lines) {
      if (line === prevLine) {
        currentCount++
      } else {
        if (prevLine !== null) {
          result.push({ line: prevLine, count: currentCount })
        }
        prevLine = line
        currentCount = 1
      }
    }

    // Don't forget the last line
    if (prevLine !== null) {
      result.push({ line: prevLine, count: currentCount })
    }

    // Filter and format output
    const outputLines: string[] = []

    for (const item of result) {
      // Apply filters
      if (onlyDuplicates && item.count < 2) continue
      if (onlyUnique && item.count > 1) continue

      if (count) {
        outputLines.push(`${item.count.toString().padStart(7)} ${item.line}`)
      } else {
        outputLines.push(item.line)
      }
    }

    return {
      exitCode: errors.length > 0 ? 1 : 0,
      stdout: outputLines.join('\n') + (outputLines.length > 0 ? '\n' : ''),
      stderr: errors.join('\n'),
    }
  }
}
