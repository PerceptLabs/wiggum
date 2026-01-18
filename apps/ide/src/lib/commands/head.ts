import path from 'path-browserify'
import type { JSRuntimeFS } from '../fs'
import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

function parseOptions(args: string[]): { lines: number; paths: string[] } {
  let lines = 10
  const paths: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '-n' && i + 1 < args.length) {
      lines = parseInt(args[++i], 10)
    } else if (arg.startsWith('-n')) {
      lines = parseInt(arg.slice(2), 10)
    } else if (arg.startsWith('-') && /^\d+$/.test(arg.slice(1))) {
      lines = parseInt(arg.slice(1), 10)
    } else if (!arg.startsWith('-')) {
      paths.push(arg)
    }
  }

  return { lines: isNaN(lines) ? 10 : lines, paths }
}

/**
 * head - output the first part of files
 */
export class HeadCommand implements ShellCommand {
  name = 'head'
  description = 'Output the first part of files'
  usage = 'head [-n lines] [file...]'

  constructor(private fs: JSRuntimeFS) {}

  async execute(args: string[], cwd: string, input?: string): Promise<ShellCommandResult> {
    const { lines, paths } = parseOptions(args)
    const outputs: string[] = []

    if (paths.length === 0) {
      if (input !== undefined) {
        const inputLines = input.split('\n')
        outputs.push(inputLines.slice(0, lines).join('\n'))
      } else {
        return createErrorResult('head: missing file operand')
      }
    } else {
      for (let i = 0; i < paths.length; i++) {
        const filePath = paths[i]
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath)

        try {
          const content = (await this.fs.readFile(fullPath, { encoding: 'utf8' })) as string
          const contentLines = content.split('\n')

          if (paths.length > 1) {
            if (i > 0) outputs.push('')
            outputs.push(`==> ${filePath} <==`)
          }

          outputs.push(contentLines.slice(0, lines).join('\n'))
        } catch {
          return createErrorResult(`head: cannot open '${filePath}' for reading: No such file or directory`)
        }
      }
    }

    return createSuccessResult(outputs.join('\n'))
  }
}
