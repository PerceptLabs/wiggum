import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

/**
 * cut - Remove sections from each line of files
 * Usage: cut -d DELIM -f FIELDS [file]
 *        cut -c RANGE [file]
 */
export class CutCommand implements ShellCommand {
  name = 'cut'
  description = 'Remove sections from each line'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd, stdin } = options

    let delimiter = '\t'
    let fields: number[] | null = null
    let charRange: { start: number; end: number } | null = null
    const files: string[] = []

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (arg === '-d' && i + 1 < args.length) {
        delimiter = args[++i]
      } else if (arg.startsWith('-d') && arg.length > 2) {
        delimiter = arg.slice(2)
      } else if (arg === '-f' && i + 1 < args.length) {
        fields = parseRangeSpec(args[++i])
      } else if (arg.startsWith('-f') && arg.length > 2) {
        fields = parseRangeSpec(arg.slice(2))
      } else if (arg === '-c' && i + 1 < args.length) {
        charRange = parseCharRange(args[++i])
      } else if (arg.startsWith('-c') && arg.length > 2) {
        charRange = parseCharRange(arg.slice(2))
      } else if (!arg.startsWith('-')) {
        files.push(arg)
      }
    }

    if (!fields && !charRange) {
      return { exitCode: 1, stdout: '', stderr: 'cut: you must specify a list of bytes, characters, or fields' }
    }

    // Get input text
    let text: string
    if (files.length > 0) {
      const filePath = resolvePath(cwd, files[0])
      try {
        const data = await fs.readFile(filePath, { encoding: 'utf8' })
        text = typeof data === 'string' ? data : new TextDecoder().decode(data)
      } catch {
        return { exitCode: 1, stdout: '', stderr: `cut: ${files[0]}: No such file or directory` }
      }
    } else if (stdin !== undefined) {
      text = stdin
    } else {
      return { exitCode: 1, stdout: '', stderr: 'cut: no input' }
    }

    let lines = text.split('\n')
    // Remove trailing empty line from newline-terminated input
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines = lines.slice(0, -1)
    }
    const result = lines.map((line) => {
      if (charRange) {
        return line.slice(charRange.start, charRange.end)
      }
      if (fields) {
        const parts = line.split(delimiter)
        return fields.map((f) => parts[f - 1] ?? '').join(delimiter)
      }
      return line
    })

    return { exitCode: 0, stdout: result.join('\n'), stderr: '' }
  }
}

/**
 * Parse field spec like "1,3,5-7" into array of field numbers
 */
function parseRangeSpec(spec: string): number[] {
  const result: number[] = []
  for (const part of spec.split(',')) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number)
      for (let i = start; i <= end; i++) {
        result.push(i)
      }
    } else {
      result.push(Number(part))
    }
  }
  return result.filter((n) => !isNaN(n) && n > 0)
}

/**
 * Parse character range like "1-3" into {start, end}
 */
function parseCharRange(spec: string): { start: number; end: number } {
  if (spec.includes('-')) {
    const [s, e] = spec.split('-').map(Number)
    return { start: (s || 1) - 1, end: e || Infinity }
  }
  const n = Number(spec)
  return { start: n - 1, end: n }
}
