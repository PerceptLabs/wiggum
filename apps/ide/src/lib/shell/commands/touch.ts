import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

/**
 * touch - Create empty file or update timestamp
 */
export class TouchCommand implements ShellCommand {
  name = 'touch'
  description = 'Change file timestamps or create empty files'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options

    // Parse arguments (skip flags for simplicity)
    const files: string[] = []

    for (const arg of args) {
      if (!arg.startsWith('-')) {
        files.push(arg)
      }
    }

    if (files.length === 0) {
      return { exitCode: 1, stdout: '', stderr: 'touch: missing file operand' }
    }

    const errors: string[] = []
    const changedPaths: string[] = []

    for (const file of files) {
      const filePath = resolvePath(cwd, file)

      try {
        // Check if file exists
        await fs.stat(filePath)
        // File exists, in a real implementation we'd update timestamp
        // For now, just rewrite the same content
        const content = await fs.readFile(filePath)
        await fs.writeFile(filePath, content)
        changedPaths.push(filePath)
      } catch {
        // File doesn't exist, create empty file
        try {
          await fs.writeFile(filePath, '', { encoding: 'utf8' })
          changedPaths.push(filePath)
        } catch (err) {
          errors.push(`touch: cannot touch '${file}': ${err}`)
        }
      }
    }

    return {
      exitCode: errors.length > 0 ? 1 : 0,
      stdout: '',
      stderr: errors.join('\n'),
      filesChanged: changedPaths.length > 0 ? changedPaths : undefined,
    }
  }
}
