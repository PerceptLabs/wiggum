import path from 'path-browserify'
import type { JSRuntimeFS } from '../fs'
import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

/**
 * cat - concatenate and display file contents
 */
export class CatCommand implements ShellCommand {
  name = 'cat'
  description = 'Concatenate and display file contents'
  usage = 'cat <file> [file2...]'

  constructor(private fs: JSRuntimeFS) {}

  async execute(args: string[], cwd: string, input?: string): Promise<ShellCommandResult> {
    // If no args but have pipe input, output the input
    if (args.length === 0) {
      if (input !== undefined) {
        return createSuccessResult(input)
      }
      return createErrorResult('cat: missing operand')
    }

    const outputs: string[] = []

    // If we have input, prepend it
    if (input !== undefined) {
      outputs.push(input)
    }

    for (const arg of args) {
      const filePath = path.isAbsolute(arg) ? arg : path.join(cwd, arg)

      try {
        const content = await this.fs.readFile(filePath, { encoding: 'utf8' })
        outputs.push(content as string)
      } catch (err) {
        return createErrorResult(`cat: ${arg}: No such file or directory`)
      }
    }

    return createSuccessResult(outputs.join(''))
  }
}
