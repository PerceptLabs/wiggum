import path from 'path-browserify'
import type { JSRuntimeFS } from '../fs'
import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

interface UniqOptions {
  count: boolean
  duplicateOnly: boolean
  uniqueOnly: boolean
}

function parseOptions(args: string[]): { options: UniqOptions; paths: string[] } {
  const options: UniqOptions = { count: false, duplicateOnly: false, uniqueOnly: false }
  const paths: string[] = []

  for (const arg of args) {
    if (arg.startsWith('-') && arg !== '-') {
      for (const char of arg.slice(1)) {
        if (char === 'c') options.count = true
        else if (char === 'd') options.duplicateOnly = true
        else if (char === 'u') options.uniqueOnly = true
      }
    } else {
      paths.push(arg)
    }
  }

  return { options, paths }
}

/**
 * uniq - filter adjacent duplicate lines
 */
export class UniqCommand implements ShellCommand {
  name = 'uniq'
  description = 'Filter adjacent duplicate lines'
  usage = 'uniq [-cdu] [file]'

  constructor(private fs: JSRuntimeFS) {}

  async execute(args: string[], cwd: string, input?: string): Promise<ShellCommandResult> {
    const { options, paths } = parseOptions(args)
    let lines: string[] = []

    if (paths.length === 0) {
      if (input !== undefined) {
        lines = input.split('\n')
      } else {
        return createErrorResult('uniq: missing file operand')
      }
    } else {
      const filePath = paths[0]
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath)

      try {
        const content = (await this.fs.readFile(fullPath, { encoding: 'utf8' })) as string
        lines = content.split('\n')
      } catch {
        return createErrorResult(`uniq: ${filePath}: No such file or directory`)
      }
    }

    // Remove trailing empty line if present
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop()
    }

    // Process lines - filter adjacent duplicates
    const results: Array<{ line: string; count: number }> = []
    let prevLine: string | null = null
    let count = 0

    for (const line of lines) {
      if (line === prevLine) {
        count++
      } else {
        if (prevLine !== null) {
          results.push({ line: prevLine, count })
        }
        prevLine = line
        count = 1
      }
    }
    if (prevLine !== null) {
      results.push({ line: prevLine, count })
    }

    // Apply filters
    let filtered = results
    if (options.duplicateOnly) {
      filtered = filtered.filter((r) => r.count > 1)
    }
    if (options.uniqueOnly) {
      filtered = filtered.filter((r) => r.count === 1)
    }

    // Format output
    const output = filtered.map((r) => {
      if (options.count) {
        return `${r.count.toString().padStart(7)} ${r.line}`
      }
      return r.line
    })

    return createSuccessResult(output.join('\n'))
  }
}
