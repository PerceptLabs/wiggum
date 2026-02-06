import { closest, distance } from 'fastest-levenshtein'
import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath, dirname, basename } from './utils'

/**
 * cat - Read and output file contents
 */
export class CatCommand implements ShellCommand {
  name = 'cat'
  description = 'Concatenate and print files'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd, stdin } = options

    // Parse flags
    let quiet = false
    const files: string[] = []

    for (const arg of args) {
      if (arg === '-q' || arg === '--quiet') {
        quiet = true
      } else if (!arg.startsWith('-')) {
        files.push(arg)
      }
      // Skip other flags silently
    }

    // If no args and stdin provided, output stdin
    if (files.length === 0) {
      if (stdin !== undefined) {
        return { exitCode: 0, stdout: stdin, stderr: '' }
      }
      return { exitCode: 1, stdout: '', stderr: quiet ? '' : 'cat: missing operand' }
    }

    const outputs: string[] = []
    const errors: string[] = []
    let missingCount = 0

    for (const file of files) {
      const filePath = resolvePath(cwd, file)

      try {
        const content = await fs.readFile(filePath, { encoding: 'utf8' })
        outputs.push(typeof content === 'string' ? content : new TextDecoder().decode(content))
      } catch {
        missingCount++
        if (!quiet) {
          // Try to suggest a similar filename
          const suggestion = await this.findSimilarFile(fs, filePath, file)
          if (suggestion) {
            errors.push(`cat: ${file}: No such file or directory. Did you mean: ${suggestion}?`)
          } else {
            errors.push(`cat: ${file}: No such file or directory`)
          }
        }
      }
    }

    // In quiet mode, missing files return exitCode 1 but no stderr
    if (missingCount > 0 && outputs.length === 0) {
      return { exitCode: 1, stdout: '', stderr: errors.join('\n') }
    }

    return {
      exitCode: missingCount > 0 ? 1 : 0,
      stdout: outputs.join(''),
      stderr: errors.join('\n'),
    }
  }

  /**
   * Try to find a similarly-named file in the same directory
   */
  private async findSimilarFile(
    fs: ShellOptions['fs'],
    filePath: string,
    originalFile: string
  ): Promise<string | null> {
    try {
      const dir = dirname(filePath)
      const filename = basename(filePath)

      // Read directory contents
      const entries = await fs.readdir(dir)

      // Filter to just files (not directories) if possible
      const files: string[] = []
      for (const entry of entries) {
        try {
          const stat = await fs.stat(`${dir}/${entry}`)
          if (!stat.isDirectory()) {
            files.push(entry)
          }
        } catch {
          // If stat fails, include it anyway
          files.push(entry)
        }
      }

      if (files.length === 0) return null

      // Find the closest match
      const suggestion = closest(filename, files)

      // Only suggest if the distance is reasonable (max 3 edits)
      if (suggestion && distance(filename, suggestion) <= 3) {
        // Return the suggestion with the same path structure as the original
        const originalDir = dirname(originalFile)
        if (originalDir && originalDir !== '.') {
          return `${originalDir}/${suggestion}`
        }
        return suggestion
      }

      return null
    } catch {
      return null
    }
  }
}
