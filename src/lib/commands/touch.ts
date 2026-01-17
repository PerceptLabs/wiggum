import path from 'path-browserify'
import type { JSRuntimeFS } from '../fs'
import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

/**
 * touch - create empty files or update timestamps
 */
export class TouchCommand implements ShellCommand {
  name = 'touch'
  description = 'Create empty files or update timestamps'
  usage = 'touch <file> [file2...]'

  constructor(private fs: JSRuntimeFS) {}

  async execute(args: string[], cwd: string): Promise<ShellCommandResult> {
    if (args.length === 0) {
      return createErrorResult('touch: missing file operand')
    }

    for (const filePath of args) {
      if (filePath.startsWith('-')) continue // Skip options

      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath)

      try {
        // Check if file exists
        await this.fs.stat(fullPath)
        // File exists - in a real implementation we'd update timestamp
        // LightningFS doesn't support utimes, so we just skip
      } catch {
        // File doesn't exist, create it
        try {
          await this.fs.writeFile(fullPath, '')
        } catch (err) {
          return createErrorResult(`touch: cannot touch '${filePath}': No such file or directory`)
        }
      }
    }

    return createSuccessResult('')
  }
}
