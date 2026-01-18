import path from 'path-browserify'
import type { JSRuntimeFS } from '../fs'
import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

interface CutOptions {
  delimiter: string
  fields: number[]
  characters: number[]
}

function parseFields(spec: string): number[] {
  const fields: number[] = []
  const parts = spec.split(',')

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map((n) => parseInt(n, 10))
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          fields.push(i)
        }
      } else if (!isNaN(start)) {
        // N- means from N to end
        fields.push(start, -1) // -1 signals "to end"
      } else if (!isNaN(end)) {
        // -N means from 1 to N
        for (let i = 1; i <= end; i++) {
          fields.push(i)
        }
      }
    } else {
      const num = parseInt(part, 10)
      if (!isNaN(num)) {
        fields.push(num)
      }
    }
  }

  return fields
}

function parseOptions(args: string[]): { options: CutOptions; paths: string[] } {
  const options: CutOptions = { delimiter: '\t', fields: [], characters: [] }
  const paths: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '-d' && i + 1 < args.length) {
      options.delimiter = args[++i]
    } else if (arg.startsWith('-d')) {
      options.delimiter = arg.slice(2)
    } else if (arg === '-f' && i + 1 < args.length) {
      options.fields = parseFields(args[++i])
    } else if (arg.startsWith('-f')) {
      options.fields = parseFields(arg.slice(2))
    } else if (arg === '-c' && i + 1 < args.length) {
      options.characters = parseFields(args[++i])
    } else if (arg.startsWith('-c')) {
      options.characters = parseFields(arg.slice(2))
    } else if (!arg.startsWith('-')) {
      paths.push(arg)
    }
  }

  return { options, paths }
}

/**
 * cut - extract columns from files
 */
export class CutCommand implements ShellCommand {
  name = 'cut'
  description = 'Extract columns from files'
  usage = 'cut -d<delim> -f<fields> [file...]'

  constructor(private fs: JSRuntimeFS) {}

  async execute(args: string[], cwd: string, input?: string): Promise<ShellCommandResult> {
    const { options, paths } = parseOptions(args)

    if (options.fields.length === 0 && options.characters.length === 0) {
      return createErrorResult('cut: you must specify a list of bytes, characters, or fields')
    }

    let content: string

    if (paths.length === 0) {
      if (input !== undefined) {
        content = input
      } else {
        return createErrorResult('cut: missing file operand')
      }
    } else {
      const filePath = paths[0]
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath)

      try {
        content = (await this.fs.readFile(fullPath, { encoding: 'utf8' })) as string
      } catch {
        return createErrorResult(`cut: ${filePath}: No such file or directory`)
      }
    }

    const lines = content.split('\n')
    const results: string[] = []

    for (const line of lines) {
      if (options.characters.length > 0) {
        // Character mode
        let result = ''
        for (const pos of options.characters) {
          if (pos === -1) {
            // To end
            break
          }
          if (pos > 0 && pos <= line.length) {
            result += line[pos - 1]
          }
        }
        results.push(result)
      } else {
        // Field mode
        const parts = line.split(options.delimiter)
        const selected: string[] = []

        for (const field of options.fields) {
          if (field === -1) {
            // -1 signals "to end" - add remaining
            break
          }
          if (field > 0 && field <= parts.length) {
            selected.push(parts[field - 1])
          }
        }

        results.push(selected.join(options.delimiter))
      }
    }

    // Remove trailing empty line
    if (results.length > 0 && results[results.length - 1] === '') {
      results.pop()
    }

    return createSuccessResult(results.join('\n'))
  }
}
