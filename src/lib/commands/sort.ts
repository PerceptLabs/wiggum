import path from 'path-browserify'
import type { JSRuntimeFS } from '../fs'
import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

interface SortOptions {
  reverse: boolean
  unique: boolean
  numeric: boolean
}

function parseOptions(args: string[]): { options: SortOptions; paths: string[] } {
  const options: SortOptions = { reverse: false, unique: false, numeric: false }
  const paths: string[] = []

  for (const arg of args) {
    if (arg.startsWith('-') && arg !== '-') {
      for (const char of arg.slice(1)) {
        if (char === 'r') options.reverse = true
        else if (char === 'u') options.unique = true
        else if (char === 'n') options.numeric = true
      }
    } else {
      paths.push(arg)
    }
  }

  return { options, paths }
}

/**
 * sort - sort lines of text
 */
export class SortCommand implements ShellCommand {
  name = 'sort'
  description = 'Sort lines of text'
  usage = 'sort [-run] [file...]'

  constructor(private fs: JSRuntimeFS) {}

  async execute(args: string[], cwd: string, input?: string): Promise<ShellCommandResult> {
    const { options, paths } = parseOptions(args)
    let lines: string[] = []

    if (paths.length === 0) {
      if (input !== undefined) {
        lines = input.split('\n')
      } else {
        return createErrorResult('sort: missing file operand')
      }
    } else {
      for (const filePath of paths) {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath)

        try {
          const content = (await this.fs.readFile(fullPath, { encoding: 'utf8' })) as string
          lines.push(...content.split('\n'))
        } catch {
          return createErrorResult(`sort: cannot read: ${filePath}: No such file or directory`)
        }
      }
    }

    // Remove trailing empty line if present
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop()
    }

    // Sort
    if (options.numeric) {
      lines.sort((a, b) => {
        const numA = parseFloat(a) || 0
        const numB = parseFloat(b) || 0
        return numA - numB
      })
    } else {
      lines.sort()
    }

    if (options.reverse) {
      lines.reverse()
    }

    if (options.unique) {
      lines = [...new Set(lines)]
    }

    return createSuccessResult(lines.join('\n'))
  }
}
